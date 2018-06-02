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
	// See: https://github.com/zaaack/node-systray#usage
	// And: https://zaaack.github.io/node-systray/modules/_index_.html
	const icon = fs.readFileSync(path.join(__dirname, '../assets/spotify-ad-blocker_icon.ico'));
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
			title: "Test",
			enabled: true
		});
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
				spawnSync(path.join(__dirname, '../bin/nircmdc.exe'), ['muteappvolume', 'Spotify.exe', '2']);
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
