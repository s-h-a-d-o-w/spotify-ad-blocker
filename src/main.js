const { initialize } = require('./bootstrap');

if (initialize()) {
	const path = require('path');
	const fs = require('fs-extra');
	const { spawn } = require('child_process');

	const volumectrl = require('bindings')('volumectrl');
	const redirectOutput = require('./redirect-output.js');
	const {
		AD_CHECK_INTERVAL,
		IS_PACKAGED,
		PATHS,
		SPOTIFY_CHECK_INTERVAL,
	} = require('./consts.js');
	const spotify = require('./spotify.js');
	const state = require('./state.js');

	// NODE EVENT LISTENERS
	// ----------------------------------------------------
	if (IS_PACKAGED) {
		process.on('exit', () => {
			// Don't clean up if a log file exists that isn't empty
			if (
				!(
					(fs.existsSync(PATHS.DEBUG_LOG) &&
						fs.statSync(PATHS.DEBUG_LOG).size > 0) ||
					(fs.existsSync(PATHS.ERROR_LOG) &&
						fs.statSync(PATHS.ERROR_LOG).size > 0)
				)
			) {
				// This process has to be able to exit before clean up happens - thus, use 'spawn'
				// instead of 'spawnSync', despite the fact that all things in exit event are supposed to
				// be sync according to the Node.js docs...

				// Not sure why (and not enough time to figure out right now) but we have to
				// change back to the original directory instead of spawning process.execPath
				// directly (which doesn't work).
				process.chdir(path.dirname(process.execPath));

				// THIS ONLY WORKS WITH PKG PATCH THAT REMOVES THEIR SPAWN REPLACEMENT!
				// (Otherwise, their spawn causes an error - IIRC about not being able to find the file)
				spawn(path.basename(process.execPath), ['--cleanup'], {
					detached: true,
				});
			} else {
				console.log(
					`Logs exist in ${PATHS.APPDATA} - temporary files were not removed.`
				);
			}
		});
	}

	// Correct order of exit handlers is key!
	process.on('exit', () => {
		// It used to be that this wasn't necessary. But despite some fixes after
		// which debugging tools show no more actionable pending things, shutting down
		// doesn't work anymore.
		process.kill(process.pid, 'SIGTERM');
	});
	// ----------------------------------------------------

	// "MAIN"
	// ----------------------------------------------------
	if (IS_PACKAGED) {
		redirectOutput.setup();
	}

	(function init() {
		if (state.shouldExit) {
			return;
		}

		let muted = false;
		let wasntRunning = true;
		let hasJustStarted = true;

		spotify
			.getPid()
			.then(
				(pid) =>
					new Promise((resolve) => {
						// If Spotify was started after the blocker, we need
						// to give it a bit of time to create its main window.
						setTimeout(() => resolve(pid), 3000);
					})
			)
			.then((pid) => {
				console.log(`Process ID: ${pid}`);
				state.pid = pid;

				(function checkForAd() {
					if (state.shouldExit) {
						return;
					}

					spotify
						.isAdPlaying(pid)
						.then((adIsPlaying) => {
							if (hasJustStarted) {
								volumectrl.mute(false, pid);
								hasJustStarted = false;
							}

							if (adIsPlaying && !muted) {
								muted = true;

								console.log('Muting.');
								// Don't catch errors because if volume control errors, something is so messed up
								// that the app should exit anyway.
								volumectrl
									.mute(muted, pid)
									.then(() => {
										console.log('Muted.');
										setTimeout(checkForAd, AD_CHECK_INTERVAL);
									})
									.catch(console.error);
							} else if (!adIsPlaying && muted) {
								muted = false;

								if (wasntRunning) {
									// It seems that when Spotify was started but isn't playing yet, volume controls
									// only become available (Spotify pops up in the mixer) once it has started playing.
									// => A bit of a delay is necessary for unmuting after startup and it varies...
									// One could of course probably extend volumectrl to offer checks for whether volume
									// controls are even available.
									console.log('Unmuting first time.');
									wasntRunning = false;
									let unmutingIntervals = [200, 500, 1000];
									for (const interval of unmutingIntervals) {
										setTimeout(() => volumectrl.mute(false, pid), interval);
									}
								}

								console.log('Unmuting.');
								// Used to be that we could delay unmuting, since Spotify signals the end too early
								// and so one hears the end of the ad. This doesn't work any more because sound is also
								// muted whenever the user pauses.
								volumectrl
									.mute(muted, pid)
									.then(() => {
										console.log('Unmuted.');
										checkForAd();
									})
									.catch(console.error);
							} else {
								setTimeout(checkForAd, AD_CHECK_INTERVAL);
							}
						})
						.catch((e) => {
							console.log(`Spotify has probably shut down. (${e})`);

							spotify
								.waitForDeath(pid)
								.then(() => (wasntRunning = true))
								.catch(console.error)
								.finally(init);
						});
				})();
			})
			.catch((e) => {
				wasntRunning = true;
				console.log(e);
				setTimeout(init, SPOTIFY_CHECK_INTERVAL);
			});
	})();

	require('./trayicon.js');

	// Improve RAM usage statistics a bit, as it seems like there
	// is a lot of garbage generated specifically on startup (starts at
	// ~18 MB but never goes above ~13 MB when running for days)
	setTimeout(global.gc, 5000);
	// ----------------------------------------------------
}
