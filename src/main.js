require('./bootstrap').then(() => {
	const path = require('path');
	const fs = require('fs-extra');
	const {spawnSync, spawn} = require('child_process');
	const SpotifyWebHelper = require('spotify-web-helper');
	const {snapshot} = require('process-list');
	const redirectOutput = require('./redirect-output');

	const {IS_PACKAGED, PATH_APPDATA, PATH_LOGS, MUTEVOLUME} = require('./consts.js');
	const state = require('./state.js');


	// NODE EVENT LISTENERS
	// ----------------------------------------------------
	process.on('exit', () => {
		// Don't clean up if a log file exists that isn't empty
		if(!((fs.existsSync(PATH_LOGS.DEBUG) && fs.statSync(PATH_LOGS.DEBUG).size > 0) ||
			(fs.existsSync(PATH_LOGS.ERROR) && fs.statSync(PATH_LOGS.ERROR).size > 0)) ) {

			// Clean up our temporary data on exit (see other branch above)
			// This process has to be able to exit before clean up happens - thus, use 'spawn'
			// instead of 'spawnSync', despite the fact that all things in exit event are supposed to
			// be sync according to the docs...

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
			console.log(`Logs exist in ${PATH_APPDATA} - temporary files were not removed.`);
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
					state.spotify.pid = tasks[i].pid;
					break;
				}
			}

			console.log(`Process ID: ${state.spotify.pid}`);
		});
	};

	const statusListener = (status) => {
		let spawnResult = {};

		if(status.next_enabled) { // NO AD
			// It might seem like Spotify always triggers two status changes after an ad.
			// But this is not guaranteed!
			if(state.spotify.muted) {
				console.log("Scheduling unmuting.");
				state.spotify.muted = false;

				// Spotify triggers the status change while the ad is still playing, so a
				// slight delay is needed.
				// I think it's preferable to cut off a few milliseconds of the song that follows
				// rather than hear a bit of the ad.
				setTimeout(() => {
					console.log("Unmuting.");
					spawnResult = spawnSync(MUTEVOLUME,
						[state.spotify.pid, state.spotify.muted],
						{ windowsHide: true }
					);
				}, 800);
			}
		}
		// Check properties track, playing_position and track length to ensure that something is actually playing
		else if(status.hasOwnProperty('track') && Math.abs(status.playing_position - status.track.length) > 0) { // AD!!
			if(!state.spotify.muted) {
				state.spotify.muted = true;
				console.log("Muting.");
				spawnResult = spawnSync(MUTEVOLUME,
					[state.spotify.pid, state.spotify.muted],
					{ windowsHide: true }
				);
			}
		}

		if(spawnResult.error)
			throw new Error('Problem muting volume: ' + spawnResult.error);
	};

	function initWebHelper() {
		state.spotify.player = SpotifyWebHelper().player;

		return getSpotifyPid()
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
				console.log(err);
			});

			state.spotify.player.on('status-will-change', statusListener);
		})
		.catch(err => console.error(err));
	}
	// ----------------------------------------------------


	// "MAIN"
	// ----------------------------------------------------
	if(IS_PACKAGED) {
		redirectOutput.setupRedirection(PATH_LOGS);
	}

	// Executable files need to be extracted from the package, as they can't be spawned otherwise.
	// fs.copy() would be shorter but doesn't work with nexe.
	fs.writeFileSync(
		MUTEVOLUME,
		fs.readFileSync(path.join(__dirname, '../bin/mutevolume.exe'))
	);

	require('./trayicon.js');
	initWebHelper();
});
