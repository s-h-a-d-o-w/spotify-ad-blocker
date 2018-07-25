require('./bootstrap').then(() => {
	const path = require('path');
	const fs = require('fs-extra');
	const {spawn} = require('child_process');
	const {snapshot} = require('process-list');
	const volumectrl = require('bindings')('volumectrl');
	const spotify = require('bindings')('spotify');

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
	const getSpotifyPid = () => {
		return new Promise((resolve, reject) => {
			snapshot('name', 'pid', 'ppid').then(tasks => {
				tasks = tasks.filter(task => task.name === 'Spotify.exe');
				if(tasks.length === 0) {
					reject("Spotify isn't running");
					return;
				}

				let spotifyPids = [];
				tasks.forEach(task => spotifyPids.push(task.pid));

				// If all pids don't contain a given parent, it's not a child itself
				// => must be the "mother" process that we're looking for.
				resolve(tasks.find(task => {
					return !spotifyPids.includes(task.ppid);
				}).pid);
			});
		});
	};

	const waitForSpotifyDeath = (pid) => {
		return new Promise((resolve, reject) => {
			snapshot('pid')
			.then(tasks => {
				tasks = tasks.filter(task => task.pid === pid);
				if(tasks.length > 0) {
					console.log("Waiting for Spotify process to be dead...");
					setTimeout(waitForSpotifyDeath, 500);
				}
				else {
					resolve();
				}
			})
			.catch(reject);
		});
	};
	// ----------------------------------------------------


	// "MAIN"
	// ----------------------------------------------------
	if(IS_PACKAGED) {
		redirectOutput.setup();
	}


	(function init() {
		let muted = false;
		let wasntRunning = true;
		let adCheckInterval = 200;

		getSpotifyPid()
		.then((pid) => {
			console.log(`Process ID: ${pid}`);

			(function checkForAd() {
				spotify.isAdPlaying(pid)
				.then((adIsPlaying) => {
					if(adIsPlaying && !muted) {
						muted = true;

						// Don't catch errors because if volume control errors, something is so messed up
						// that the app should exit anyway.
						volumectrl.mute(muted, pid)
						.then(() => {
							console.log('Muted.');
							setTimeout(checkForAd, adCheckInterval);
						});
					}
					else if(!adIsPlaying && muted) {
						muted = false;

						if(wasntRunning) {
							// It seems that when Spotify was started but isn't playing yet, volume controls
							// only become available (Spotify pops up in the mixer) once it has started playing.
							// => A bit of a delay is necessary for unmuting after startup and it varies...
							// One could of course probably extend volumectrl to offer checks for whether volume
							// controls are even available.
							console.log('Unmuting first time.');
							wasntRunning = false;
							let unmutingIntervals = [200, 500, 1000];
							for(interval of unmutingIntervals) {
								setTimeout(() => volumectrl.mute(false, pid), interval);
							}
						}

						volumectrl.mute(muted, pid)
						.then(() => {
							console.log('Unmuted.');
							setTimeout(checkForAd, adCheckInterval);
						});
					}
					else {
						setTimeout(checkForAd, adCheckInterval);
					}
				})
				.catch(() => {
					console.log("Spotify has probably shut down.");

					waitForSpotifyDeath(pid)
					.then(() => {
						wasntRunning = true;
						init();
					})
					.catch((e) => {
						console.error(e);
						init();
					});
				})
			})();
		})
		.catch((e) => {
			wasntRunning = true;
			console.log(e);
			setTimeout(init, 3000);
		});
	})();

	require('./trayicon.js');
	// ----------------------------------------------------
});
