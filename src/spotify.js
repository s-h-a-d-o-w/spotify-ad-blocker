const path = require('path');
const { spawn } = require('child_process');
const { snapshot } = require('process-list');

const { IS_PACKAGED, TITLE_ERROR } = require('./consts.js');
const state = require('./state.js');

let detectionProcess = spawn(
	IS_PACKAGED
		? 'spotify-ad-blocker_detection'
		: path.join(__dirname, '../build/Release/spotify-ad-blocker_detection.exe'),
	{
		windowsHide: true,
		stdio: 'pipe',
	}
);
detectionProcess.stdout.setEncoding('utf8');
detectionProcess.on('error', (err) => {
	console.error('Failed to start subprocess.', err);
});
state.detectionProcess = detectionProcess;

const getPid = () => {
	return new Promise((resolve, reject) => {
		snapshot('name', 'pid', 'ppid').then((tasks) => {
			tasks = tasks.filter((task) => task.name === 'Spotify.exe');
			if (tasks.length === 0) {
				reject("Spotify isn't running");
				return;
			}

			let spotifyPids = [];
			tasks.forEach((task) => spotifyPids.push(task.pid));

			// A process whose parent id is not contained in all spotify
			// process ids must be the "mother" process.
			resolve(
				tasks.find((task) => {
					return !spotifyPids.includes(task.ppid);
				}).pid
			);
		});
	});
};

const isAdPlaying = (pid) => {
	return new Promise((resolve, reject) => {
		detectionProcess.stdout.on('data', function listener(data) {
			// console.log(`title: ${data}`);
			detectionProcess.stdout.removeListener('data', listener);

			if (data === TITLE_ERROR) {
				reject('Could not get title for Spotify window.');
				return;
			}

			resolve(!data.includes(' - '));
		});

		detectionProcess.stdin.write(pid + '\n');
	});
};

const waitForDeath = (pid) => {
	return new Promise((resolve, reject) => {
		snapshot('pid')
			.then((tasks) => {
				tasks = tasks.filter((task) => task.pid === pid);
				if (tasks.length > 0) {
					console.log(`Waiting for Spotify process (pid ${pid}) to be dead...`);
					setTimeout(() => waitForDeath(pid).then(resolve).catch(reject), 1000);
				} else {
					console.log('Process has died');
					resolve();
				}
			})
			.catch(reject);
	});
};

module.exports = {
	getPid,
	isAdPlaying,
	waitForDeath,
};
