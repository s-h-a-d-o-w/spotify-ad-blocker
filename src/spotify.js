const {spawn} = require('child_process');
const {snapshot} = require('process-list');

let detectionProcess = spawn('spotify-ad-blocker_detection', {
	windowsHide: true,
	stdio: 'pipe',
});
detectionProcess.stdout.setEncoding('utf8');

const getPid = () => {
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

const isAdPlaying = (pid) => {
	return new Promise((resolve, reject) => {
		detectionProcess.stdin.write(pid + '\n', () => {
			(function waitForResult() {
				let result = detectionProcess.stdout.read();
				if(result === null) {
					setTimeout(waitForResult, 20);
				}
				else {
					result === "0" || result === "1" ?
						resolve(result === "1") :
						reject(result);
				}
			})();
		});
	});
};

const waitForDeath = (pid) => {
	return new Promise((resolve, reject) => {
		snapshot('pid')
		.then(tasks => {
			tasks = tasks.filter(task => task.pid === pid);
			if(tasks.length > 0) {
				console.log('Waiting for Spotify process to be dead...');
				setTimeout(waitForDeath, 500);
			}
			else {
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
