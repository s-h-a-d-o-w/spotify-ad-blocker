const path = require('path');
const fs = require('fs-extra');

const {PATHS, IS_PACKAGED} = require('./consts.js');

/**
 * Native addons have to be extracted to the file system so that they can be spawned.
 * Since pkg doesn't allow for inclusion of .node files (their philosophy is "deliver them with the .exe"),
 * they have to be renamed to .foolkpkg before packaging.
 *
 * @param {Array<string>} addons .foolpkg file paths relative to the root directory of the repo
 */
// const extractNativeAddons = (addons) => {
// 	addons.forEach((addon) => {
// 		fs.writeFileSync(
// 			path.join(PATHS.APPDATA, path.basename(addon.replace('.foolpkg', '.node'))),
// 			fs.readFileSync(
// 				path.join(__dirname, IS_PACKAGED ? addon : addon.replace('.foolpkg', '.node'))
// 			)
// 		);
// 	});
// };

const extractNativeAddons = (addons) => {
	addons.forEach((addon) => {
		fs.writeFileSync(
			path.join(PATHS.APPDATA, path.basename(addon)),
			fs.readFileSync(
				path.join(__dirname, IS_PACKAGED ? addon.replace('.node', '.foolpkg') : addon)
			)
		);
	});
};


module.exports = new Promise((resolve) => {
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

		console.log(__dirname);
		console.log(process.cwd());

		// const packageJSON = require('../package.json');
		// let nodeFiles = packageJSON.pkg.assets.filter((asset) => asset.endsWith('.foolpkg'));
		// nodeFiles = nodeFiles.map((file) => (path.join('../', file)));
		// extractNativeAddons(nodeFiles);

		extractNativeAddons([
			'../node_modules/process-list/build/Release/processlist.node',
			'../build/Release/volumectrl.node',
			'../build/Release/spotify.node',
			//'../node_modules/winax/build/Release/node_activex.node',
		]);

		resolve();
	}
});
