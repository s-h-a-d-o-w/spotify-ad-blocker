const path = require('path');
const fs = require('fs-extra');

const {PATHS, IS_PACKAGED} = require('./consts.js');

console.log(IS_PACKAGED ? 'Packaged version' : 'Dev version');

/**
 * Native dependencies have to be extracted to the file system so that they can be spawned.
 * Since pkg doesn't allow for inclusion of .node files (their philosophy is "deliver them with the .exe"),
 * they have to be renamed to .foolkpkg before packaging.
 *
 * @param {Array<string>} deps	file paths relative to __dirname of this file
 */
const extractNativeDeps = (deps) => {
	deps.forEach((dep) => {
		fs.writeFileSync(
			path.join(PATHS.APPDATA, path.basename(dep)),
			fs.readFileSync(
				path.join(__dirname, IS_PACKAGED ? dep.replace('.node', '.foolpkg') : dep) // pkg
				// path.join(__dirname, dep) // nexe
			)
		);
	});
};


module.exports = !IS_PACKAGED ? Promise.resolve() : new Promise((resolve) => {
	if(process.argv.includes('--cleanup')) {
		// Clean up our temporary data. This can only be done when processlist.node
		// was not required yet. Hence - right at the beginning.
		let retries = 0;
		const deleteTemporaryData = () => {
			try {
				fs.removeSync(PATHS.APPDATA);
				process.exit();
			}
			catch(e) {
				retries++;
				if(retries > 20) { // ~10 seconds
					fs.writeFileSync(
						path.join(path.dirname(process.execPath), 'spotify-ad-blocker_error.log'),
						`Could not clean up ${PATHS.APPDATA}, please delete it manually.`
					);
					process.exit(1);
				}
				else {
					setTimeout(deleteTemporaryData, 500);
				}
			}
		};
		deleteTemporaryData();

		// Don't resolve/reject promise to prevent further code execution
	}
	else {
		// Needs to be done right at the the beginning so that we can put
		// native addons where we want them and make pkg look there
		// (by setting cwd to PATHS.APPDATA), as they need to be available
		// for require() calls that follow.
		fs.ensureDirSync(PATHS.APPDATA);
		process.chdir(PATHS.APPDATA);

		extractNativeDeps([
			'../assets/spotify-ad-blocker.ico',
			'../build/Release/spotify-ad-blocker_detection.exe',
			'../build/Release/tray.node',
			'../build/Release/volumectrl.node',
			'../node_modules/process-list/build/Release/processlist.node',
		]);

		resolve();
	}
});
