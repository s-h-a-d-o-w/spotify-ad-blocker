require('./bootstrap').then(() => {
	const path = require('path');
	const fs = require('fs-extra');
	const {spawn} = require('child_process');
	const SpotifyWebHelper = require('spotify-web-helper');
	const {snapshot} = require('process-list');
	const volumectrl = require('bindings')('volumectrl');

	const redirectOutput = require('./redirect-output.js');
	const state = require('./state.js');
	const {IS_PACKAGED, PATHS} = require('./consts.js');


	// NODE EVENT LISTENERS
	// ----------------------------------------------------
	if(IS_PACKAGED) {
		process.on('exit', () => {
			// Don't clean up if a log file exists that isn't empty
			if(!((fs.existsSync(PATHS.DEBUG_LOG) && fs.statSync(PATHS.DEBUG_LOG).size > 0) ||
				(fs.existsSync(PATHS.ERROR_LOG) && fs.statSync(PATHS.ERROR_LOG).size > 0)) ) {

				// This process has to be able to exit before clean up happens - thus, use 'spawn'
				// instead of 'spawnSync', despite the fact that all things in exit event are supposed to
				// be sync according to the Node.js docs...

				// Not sure why (and not enough time to figure out right now) but we have to
				// change back to the original directory instead of spawning process.execPath
				// directly (which doesn't work).
				process.chdir(path.dirname(process.execPath));

				// THIS ONLY WORKS WITH PKG PATCH THAT REMOVES THEIR SPAWN REPLACEMENT!
				// (Otherwise, their spawn causes an error - IIRC about not being able to find the file)
				spawn(
					path.basename(process.execPath), ['--cleanup'], {
						detached: true,
					}
				);
			}
			else {
				console.log(`Logs exist in ${PATHS.APPDATA} - temporary files were not removed.`);
			}
		});
	}
	// ----------------------------------------------------


	// FUNCTIONS
	// ----------------------------------------------------
	const fatalError = () => {
		const dialog = require('node-native-dialog');

		dialog.showSync({
			msg: 'An unusual error occurred. Please email the .log files in\n' +
				`${PATHS.APPDATA}\n` +
				'to:\n' +
				'ao@variations-of-shadow.com.',
			icon: dialog.ERROR,
			title: 'Spotify Ad Blocker',
		});

		process.exit();
	};

	// Figure out PID of client window.
	const getSpotifyPid = () => {
		return snapshot('name', 'pid', 'ppid').then(tasks => {
			let spotifyPids = [];

			tasks = tasks.filter(task => task.name === 'Spotify.exe');
			tasks.forEach(task => spotifyPids.push(task.pid));

			// If all pids don't contain a given parent, it's not a child itself
			// => must be the "mother" process that we're looking for.
			for(let i = 0; i < tasks.length; i++) {
				if(!spotifyPids.includes(tasks[i].ppid)) {
					state.spotify.pid = tasks[i].pid;
					break;
				}
			}

			console.log(`Process ID: ${state.spotify.pid}`);
		});
	};

	const statusListener = (status) => {
		if(status.next_enabled) { // NO AD
			if(state.spotify.muted) {
				console.log("Scheduling unmuting.");
				state.spotify.muted = false;

				// Spotify triggers the status change while the ad is still playing, so a
				// slight delay is needed.
				// I think it's preferable to cut off a few milliseconds of the song that follows
				// rather than hear a bit of the ad.
				setTimeout(() => {
					// Don't catch errors because if volume control errors, something is so messed up
					// that the app should exit anyway.
					volumectrl.mute(state.spotify.muted, state.spotify.pid)
					.then(() => {
						console.log('Unmuted.');
					})
				}, 800);
			}
		}
		// Check properties track, playing_position and track length to ensure that something is actually playing
		else if(status.hasOwnProperty('track') && Math.abs(status.playing_position - status.track.length) > 0) { // AD!!
			if(!state.spotify.muted) {
				state.spotify.muted = true;

				volumectrl.mute(state.spotify.muted, state.spotify.pid)
				.then(() => {
					console.log('Muted.');
				})
			}
		}
	};
	// ----------------------------------------------------


	// "MAIN"
	// ----------------------------------------------------
	if(IS_PACKAGED) {
		redirectOutput.setup();
	}

	state.spotify.player = SpotifyWebHelper().player;

	getSpotifyPid()
	.then(() => {
		state.spotify.player.on('open', () => {
			console.log('Spotify is starting...');
			getSpotifyPid();
		});

		state.spotify.player.on('closing', () => {
			console.log('Spotify is shutting down...');
		});

		state.spotify.player.on('close', () => {
			console.log('Spotify has shut down.');
		});

		state.spotify.player.on('error', (err) => {
			if(err === 'FATAL ERROR')
				fatalError();

			console.error('Spotify Web Helper Error:', err);
		});

		state.spotify.player.on('status-will-change', statusListener);
	});

	require('./trayicon.js');
	// ----------------------------------------------------
});
