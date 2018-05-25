const {spawnSync} = require('child_process');
const SpotifyWebHelper = require('spotify-web-helper');
const {snapshot} = require('process-list');

require('./init');

const NIRCMD_MUTE = 1;
const NIRCMD_UNMUTE = 0;

const spotify = {
	player: SpotifyWebHelper().player,
	muted: false,
	pid: -1
};

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
		if(spotify.muted) {
			// Spotify sends info about next track about 500ms before ad actually ends.
			setTimeout(() => {
				spawnResult = spawnSync('../bin/nircmdc', ['muteappvolume', `/${spotify.pid}`, NIRCMD_UNMUTE], { windowsHide: true });
				spotify.muted = false;
				console.log("Unmuted");
			}, 500);
		}
	}
	// check properties track, playing_position and track length to ensure that something is actually playing
	else if(status.hasOwnProperty('track') && Math.abs(status.playing_position - status.track.length) > 0) { // AD!!
		if(!spotify.muted) {
			spawnResult = spawnSync('../bin/nircmdc', ['muteappvolume', `/${spotify.pid}`, NIRCMD_MUTE], { windowsHide: true });

			// Sometimes, nircmd also mutes System Sounds. Ensure that those stay unmuted
			spawnResult = spawnSync('../bin/nircmdc', ['muteappvolume', 'SystemSounds', NIRCMD_UNMUTE], { windowsHide: true });

			spotify.muted = true;
			console.log("Muted");
		}
	}

	if(spawnResult.error)
		throw new Error('Problem muting volume: ' + spawnResult.error);
};

// STARTUP
getSpotifyPid()
.then(() => {
	spotify.player.on('open', () => {
		console.log('Spotify is starting...');
		getSpotifyPid()
		.then(() => spotify.player.on('status-will-change', statusListener));
	});

	spotify.player.on('closing', () => {
		console.log('Spotify is shutting down...');
		spotify.player.removeListener('status-will-change', statusListener);
	});

	spotify.player.on('close', () => {
		console.log('Spotify has shut down.');
	});

	// If Spotify is already running, the 'open' event of course won't get triggered,
	// so add listener straight away.
	if(spotify.pid !== -1)
		spotify.player.on('status-will-change', statusListener);
});

if(process.pkg)
	require('./trayicon.js');
