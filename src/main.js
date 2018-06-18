require('./bootstrap').then(() => {
	const path = require('path');
	const fs = require('fs-extra');
	const {spawnSync, spawn} = require('child_process');
	const SpotifyWebHelper = require('spotify-web-helper');
	const {snapshot} = require('process-list');
	const redirectOutput = require('./redirect-output');


	// DATA
	// ----------------------------------------------------
	const APPDATA_PATH = path.join(process.env.APPDATA, 'spotify-ad-blocker');
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


	// NODE EVENT LISTENERS
	// ----------------------------------------------------
	process.on('exit', () => {
		// Don't clean up if a log file exists that isn't empty
		if(!((fs.existsSync(logPaths.DEBUG) && fs.statSync(logPaths.DEBUG).size > 0) ||
			(fs.existsSync(logPaths.ERROR) && fs.statSync(logPaths.ERROR).size > 0)) ) {

			// Clean up our temporary data on exit (see other branch above)
			// This process has to be able to exit before clean up happens - thus, use 'spawn'
			// instead of 'spawnSync', despite the fact that all things in exit event are supposed to
			// be sync according to the docs...

			// Not sure why (and not enough time to figure out right now) but we have to
			// change back to the original directory instead of spawning process.execPath
			// directly (which doesn't work).
			process.chdir(path.dirname(process.execPath));
			spawn(
				path.basename(process.execPath), ['--cleanup'], {
					detached: true,
				}
			);
		}
		else {
			console.log(`Logs exist in ${APPDATA_PATH} - temporary files were not removed.`);
		}
	});
	// ----------------------------------------------------


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

	console.log(process);

	require('./trayicon.js');
	initWebHelper();
});
