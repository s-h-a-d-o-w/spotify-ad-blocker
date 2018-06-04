const fs = require('fs');
const path = require('path');
const SysTray = require('systray').default;
const AutoLaunch = require('auto-launch');
const {spawnSync} = require('child_process');

const isPackaged = process.mainModule.id.endsWith('.exe') || process.hasOwnProperty('pkg');
const blockerAutoLaunch = new AutoLaunch({
	name: 'Spotify Ad Blocker',
	path: process.execPath,
});

const createTray = (autoLaunchEnabled) => {
	// For debugging mutevolume/trayicon functionality.
	// Need to set pid manually - not very sophisticated, I know...
	const debugOptions = {
		pid: 8584,
		muteState: false,
	};

	// See: https://github.com/zaaack/node-systray#usage
	// And: https://zaaack.github.io/node-systray/modules/_index_.html
	const icon = fs.readFileSync(path.join(__dirname, '../assets/spotify-ad-blocker.ico'));
	const menu = {
		icon: icon.toString('base64'),
		title: "Spotify Ad Blocker",
		tooltip: "Spotify Ad Blocker",
		items: [{
			title: "Run on startup",
			checked: autoLaunchEnabled,
			enabled: isPackaged
		}, {
			title: "Exit",
			enabled: true
		}]
	};

	// Make Test option available only in dev environment
	if(!isPackaged) {
		menu.items.push({
			title: "Test (toggle muting)",
			enabled: true
		});

		// Mute initially
		spawnSync(path.join(__dirname, '../bin/mutevolume.exe'), [debugOptions.pid, debugOptions.muteState]);
	}

	const systray = new SysTray({
		menu,
		debug: false,
		copyDir: true, // copy go tray binary to outside directory, useful for packing tool like pkg.
	});

	systray.onClick((action) => {
		switch(action.seq_id) {
			case 0:
				action.item.checked ? blockerAutoLaunch.disable() : blockerAutoLaunch.enable();
				systray.sendAction({
					type: 'update-item',
					item: {
						...action.item,
						checked: !action.item.checked,
					},
					seq_id: action.seq_id,
				});
				break;
			case 1:
				systray.kill();
				break;
			case 2:
				// Can only be executed if isPackaged === true
				debugOptions.muteState = !debugOptions.muteState;
				let result = spawnSync(
					path.join(__dirname, '../bin/mutevolume.exe'),
					[debugOptions.pid, debugOptions.muteState]
				);
				console.log(result.stdout.toString());
				break;
		}
	});
};

// Checking for whether the app is already registered to run at startup only makes sense when run as .exe
if(isPackaged) {
	blockerAutoLaunch.isEnabled()
	.then(createTray);
}
else {
	createTray(false);
}
