const fs = require('fs');
const path = require('path');
const SysTray = require('systray').default;
const AutoLaunch = require('auto-launch');
const volumectrl = require('bindings')('volumectrl');

const {IS_PACKAGED} = require('./consts.js');
const state = require('./state.js');
const blockerAutoLaunch = new AutoLaunch({
	name: 'Spotify Ad Blocker',
	path: process.execPath,
});

const createTray = (autoLaunchEnabled) => {
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
			enabled: IS_PACKAGED
		}, {
			title: "Exit",
			enabled: true
		}]
	};

	// Make Test option available only in dev environment
	if(!IS_PACKAGED) {
		menu.items.push({
			title: "Test (toggle muting)",
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
				// Only available if IS_PACKAGED === true
				state.spotify.muted = !state.spotify.muted;

				volumectrl.mute(state.spotify.muted, state.spotify.pid)
				.then(() => {
					console.log(`Mute on demand: ${state.spotify.muted}`);
				})
				.catch((e) => {
					console.error(e);
				});

				break;
		}
	});
};

// Checking for whether the app is already registered to run at startup only makes sense when run as .exe
if(IS_PACKAGED) {
	blockerAutoLaunch.isEnabled()
	.then(createTray);
}
else {
	createTray(false);
}
