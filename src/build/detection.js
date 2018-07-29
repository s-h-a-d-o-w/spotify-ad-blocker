const fs = require('fs');
const {spawnSync} = require('child_process');

// Used to be that native addons were used directly, until this error occurred when running the
// packaged executable (for both pkg and nexe):
// -----------------------------------------
// Error: Invalid access to memory location.
// -----------------------------------------
// So... ugly hack of building and bundling .exe instead.
fs.readFile('build/spotify_managed.vcxproj', 'utf8', (err, data) => {
	if(err) {
		console.error(err);
	}
	else {
		data = data.replace('StaticLibrary', 'Application');
		fs.writeFile('build/spotify-ad-blocker_detection.vcxproj', data, 'utf8', (err) => {
			if(err) {
				console.error(err);
			}
			else {
				console.log(process.cwd());
				spawnSync('msbuild', [
					'/p:Configuration=Release',
					'/p:Platform=x64',
					'build\\spotify-ad-blocker_detection.vcxproj'
				], {
					stdio: 'inherit'
				});
			}
		});
	}
});
