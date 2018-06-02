const {compile} = require('nexe');

compile({
	input: './src/main.js',
	output: 'spotify-ad-blocker.exe',

	build: true, //required to use patches
	loglevel: 'verbose',
	flags: ['--expose-gc'],

	resources: [
		'./bin/nircmdc.exe',
		'./assets/spotify-ad-blocker_icon.ico',
	]
}).then(() => {
	console.log('SUCCESS')
});
