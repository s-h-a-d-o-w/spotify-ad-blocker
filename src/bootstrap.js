const path = require('path');
const fs = require('fs-extra');

const APPDATA_PATH = path.join(process.env.APPDATA, 'spotify-ad-blocker');

module.exports = new Promise((resolve, reject) => {
	if(process.argv.includes('--cleanup')) {
		// Clean up our temporary data. This can only be done when processlist.node
		// was not required yet. Hence - right at the beginning.

		// The only way to see whether this fails aside from actually checking whether the directory
		// was deleted is to run this using yarn:start (setting DEBUG variable to anything but * first!) and
		// setting isPackaged = true temporarily.
		// And even then, we can only see exit code 1, since of course stdout/sterr point
		// to nothing.
		let retries = 0;
		const doCleanup = () => {
			try {
				fs.removeSync(APPDATA_PATH);
				process.exit();
			}
			catch(e) {
				retries++;
				if(retries > 20) { // ~10 seconds
					fs.writeFileSync(
						path.join(path.dirname(process.execPath), 'spotify-ad-blocker_error.log'),
						`Could not clean up ${APPDATA_PATH}, please delete it manually.`
					);
					process.exit(1);
				}
				else {
					setTimeout(doCleanup, 500);
				}
			}
		};
		doCleanup();

		// Don't resolve/reject promise, to prevent further execution as timeout above is waiting
	}
	else {
		// Needs to be done right at the the beginning so that we can put
		// processlist.node where we want it and make pkg look there
		// (by setting cwd to APPDATA_PATH), as it needs to be available
		// for require() calls that follow.
		fs.ensureDirSync(APPDATA_PATH);
		process.chdir(APPDATA_PATH);

		fs.writeFileSync(
			path.join(APPDATA_PATH, 'processlist.node'),
			fs.readFileSync(path.join(__dirname, '../bin/processlist.renametonode'))
		);

		resolve();
	}
});
