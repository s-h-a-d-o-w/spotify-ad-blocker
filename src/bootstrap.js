const path = require('path');
const fs = require('fs-extra');

const {PATH_APPDATA} = require('./consts.js');

module.exports = new Promise((resolve) => {
	if(process.argv.includes('--cleanup')) {
		// Clean up our temporary data. This can only be done when processlist.node
		// was not required yet. Hence - right at the beginning.
		let retries = 0;
		const doCleanup = () => {
			try {
				fs.removeSync(PATH_APPDATA);
				process.exit();
			}
			catch(e) {
				retries++;
				if(retries > 20) { // ~10 seconds
					fs.writeFileSync(
						path.join(path.dirname(process.execPath), 'spotify-ad-blocker_error.log'),
						`Could not clean up ${PATH_APPDATA}, please delete it manually.`
					);
					process.exit(1);
				}
				else {
					setTimeout(doCleanup, 500);
				}
			}
		};
		doCleanup();

		// Don't resolve/reject promise, to prevent further code execution
	}
	else {
		// Needs to be done right at the the beginning so that we can put
		// processlist.node where we want it and make pkg look there
		// (by setting cwd to PATH_APPDATA), as it needs to be available
		// for require() calls that follow.
		fs.ensureDirSync(PATH_APPDATA);
		process.chdir(PATH_APPDATA);

		fs.writeFileSync(
			path.join(PATH_APPDATA, 'processlist.node'),
			// require.resolve() would be more elegant but pkg can't process that
			fs.readFileSync(path.join(__dirname, '../node_modules/process-list/build/Release/processlist.node'))
		);

		fs.writeFileSync(
			path.join(PATH_APPDATA, 'volumectrl.node'),
			fs.readFileSync(path.join(__dirname, '../build/Release/volumectrl.node'))
		);

		resolve();
	}
});
