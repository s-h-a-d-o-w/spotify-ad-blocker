const {spawnSync} = require('child_process');
const SpotifyWebHelper = require('spotify-web-helper');
const WmiClient = require('wmi-client');

// EZBlocker: ~2 MB file, 27 MB RAM, ~3% CPU usage in idle
// This: 17 MB RAM, 0% CPU usage in idle

const helper = SpotifyWebHelper();

// TODO: Take care of cases where Spotify isn't running yet or is restarted.

// Figure out PID of client window.
let pid = 0;
let wmi = new WmiClient({
    username: 'Brix',
    password: '',
    host: '127.0.0.1'
});

// WQL "CommandLine like ..." doesn't work here for some reason.
wmi.query('SELECT * FROM Win32_Process where Name="Spotify.exe"', function (err, result) {
	// It's the one where Spotify is executed without additional arguments
	result.forEach(elem => (elem.CommandLine.endsWith('Spotify.exe"') && (pid = elem.ProcessId)));
	console.log(`Process ID: ${pid}`);
});


let muted = false;
const nircmdMute = 1;
const nircmdUnmute = 0;

// TODO: Error handling after calling nircmd!
helper.player.on('status-will-change', status => {
	if(status.next_enabled) { // NO AD
		if(muted) {
			spawnSync('nircmd', ['muteappvolume', `/${pid}`, nircmdUnmute])
			muted = false;
			console.log("Unmuted");
		}
	}
	else { // AD!!
		if(!muted) {
			spawnSync('nircmd', ['muteappvolume', `/${pid}`, nircmdMute])
			muted = true;
			console.log("Muted");
		}
	}
});

require('./trayicon.js');
