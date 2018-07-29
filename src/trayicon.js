const fs = require('fs');
const path = require('path');
const SysTray = require('systray').default;
const AutoLaunch = require('auto-launch');
const volumectrl = require('bindings')('volumectrl');

const {IS_PACKAGED} = require('./consts.js');
const blockerAutoLaunch = new AutoLaunch({
	name: 'Spotify Ad Blocker',
	path: process.execPath,
});
const state = require('./state.js');

const createTray = (autoLaunchEnabled) => {
	let muted = false;
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
			title: "DEBUG ONLY: Toggle muting",
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
				volumectrl.mute(false, state.pid)
				.then(() => systray.kill());
				break;
			case 2:
				// Only available if this isn't running packaged
				muted = !muted;

				volumectrl.mute(muted, state.pid) // Enter current Spotify PID to test volumectrl
				.then(() => {
					console.log(`Mute on demand: ${muted}`);
				})
				.catch((e) => {
					console.error(e);
				});

				break;
		}
	});
};

// Checking for whether the app is already registered to
// run at startup only makes sense when run as .exe
if(IS_PACKAGED) {
	blockerAutoLaunch.isEnabled()
	.then(createTray);
}
else {
	createTray(false);
}
