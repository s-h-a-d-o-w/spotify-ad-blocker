const path = require('path');
const fs = require('fs-extra');

// BOOTSTRAP
// ------------------------------------------
// Needs to be done right away so we can put processlist.node where we want it
// and make pkg look there (by setting cwd to APPDATA_PATH).
// It needs to be available for the require() calls that follow.
const APPDATA_PATH = path.join(process.env.APPDATA, 'spotify-ad-blocker');

fs.ensureDirSync(APPDATA_PATH);
process.chdir(APPDATA_PATH);

fs.writeFileSync(
	path.join(APPDATA_PATH, 'processlist.node'),
	fs.readFileSync(path.join(__dirname, '../bin/processlist.renametonode'))
);
// ------------------------------------------

const {spawnSync} = require('child_process');
const SpotifyWebHelper = require('spotify-web-helper');
const {snapshot} = require('process-list');
const redirectOutput = require('./redirect-output');


// DATA
// ----------------------------------------------------
const isPackaged = process.mainModule.id.endsWith('.exe') || process.hasOwnProperty('pkg');
const logPaths = {
	DEBUG: path.join(APPDATA_PATH, 'debug.log'),
	ERROR: path.join(APPDATA_PATH, 'error.log'),
};
const mutevolume = path.join(APPDATA_PATH, 'mutevolume.exe');
const spotify = {
	player: null,
	muted: false,
	pid: -1
};
// ----------------------------------------------------


// EVENT LISTENERS
// ----------------------------------------------------
// Remove our temporary files from %APPDATA% on exit, unless there is log content
process.on('exit', () => {
	// Only sync operations can be done here!

	// Only clean up if log files don't exist or if they are empty
	if(!((fs.existsSync(logPaths.DEBUG) && fs.existsSync(logPaths.ERROR)) &&
		(fs.statSync(logPaths.DEBUG).size > 0 || fs.statSync(logPaths.ERROR).size > 0))) {

		// Close log files
		if(isPackaged)
			redirectOutput.endStreams();

		// The only way to see whether this fails aside from actually checking whether the directory
		// was deleted is to run this using yarn:start (setting DEBUG variable to anything but * first!) and
		// setting isPackaged = true temporarily.
		// And even then, we can only see exit code 1, since of course stdout/sterr point
		// to nothing.
		fs.removeSync(APPDATA_PATH);
	}
});


// FUNCTIONS
// ----------------------------------------------------
// Figure out PID of client window.
const getSpotifyPid = () => {
	return snapshot('name', 'pid', 'ppid').then(tasks => {
		tasks = tasks.filter(task => task.name === 'Spotify.exe');

		let spotifyPids = [];
		tasks.forEach(task => spotifyPids.push(task.pid));

		// If all pids don't contain a given parent, it's not a child itself
		// => must be the "mother" process that we're looking for.
		for(let i = 0; i < tasks.length; i++) {
			if(!spotifyPids.includes(tasks[i].ppid)) {
				spotify.pid = tasks[i].pid;
				break;
			}
		}

		console.log(`Process ID: ${spotify.pid}`);
	});
};

const statusListener = (status) => {
	let spawnResult = {};

	if(status.next_enabled) { // NO AD
		// It might seem like Spotify always triggers two status changes after an ad.
		// But this is not guaranteed!
		if(spotify.muted) {
			console.log("Scheduling unmuting.");
			spotify.muted = false;

			// Spotify triggers the status change while the ad is still playing, so a
			// slight delay is needed.
			// I think it's preferable to cut off a few milliseconds of the song that follows
			// rather than hear a bit of the ad.
			setTimeout(() => {
				console.log("Unmuting.");
				spawnResult = spawnSync(mutevolume,
					[spotify.pid, spotify.muted],
					{ windowsHide: true }
				);
			}, 800);
		}
	}
	// Check properties track, playing_position and track length to ensure that something is actually playing
	else if(status.hasOwnProperty('track') && Math.abs(status.playing_position - status.track.length) > 0) { // AD!!
		if(!spotify.muted) {
			spotify.muted = true;
			console.log("Muting.");
			spawnResult = spawnSync(mutevolume,
				[spotify.pid, spotify.muted],
				{ windowsHide: true }
			);
		}
	}

	if(spawnResult.error)
		throw new Error('Problem muting volume: ' + spawnResult.error);
};

function initWebHelper() {
	spotify.player = SpotifyWebHelper().player;

	return getSpotifyPid()
	.then(() => {
		spotify.player.on('open', () => {
			console.log('Spotify is starting...');
			getSpotifyPid();
		});

		spotify.player.on('closing', () => {
			console.log('Spotify is shutting down...');
		});

		spotify.player.on('close', () => {
			console.log('Spotify has shut down.');
		});

		spotify.player.on('error', (err) => {
			if(err.statusCode === 503) {
				spotify.player.removeAllListeners();
				delete spotify.player;

				// Service Unavailable - keep retrying until it becomes available
				setTimeout(initWebHelper, 5000);
			}
			else {
				console.log(err);
			}
		});

		spotify.player.on('status-will-change', statusListener);
	})
	.catch(err => console.error(err));
}
// ----------------------------------------------------


// "MAIN"
// ----------------------------------------------------
if(isPackaged) {
	redirectOutput.setupRedirection(logPaths);
}

// Executable files need to be extracted from the package, as they can't be spawned otherwise.
// fs.copy() would be shorter but doesn't work with nexe.
fs.writeFileSync(
	mutevolume,
	fs.readFileSync(path.join(__dirname, '../bin/mutevolume.exe'))
);

require('./trayicon.js');
initWebHelper();
