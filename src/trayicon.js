const path = require('path');
const AutoLaunch = require('auto-launch');
const volumectrl = require('bindings')('volumectrl');

const {IS_PACKAGED, MENU} = require('./consts.js');
const state = require('./state.js');
const Tray = require('./Tray.js');

const autoLaunch = new AutoLaunch({
	name: 'Spotify Ad Blocker',
	path: process.execPath,
});

let isMutedDebug = false; // only used in dev environment

const createTray = (autoLaunchEnabled) => {
	const trayItems = [{
		id: MENU.AUTOLAUNCH,
		text: 'Run on startup',
		enabled: IS_PACKAGED,
		checked: autoLaunchEnabled,
	}, {
		id: MENU.EXIT,
		text: 'Exit',
		enabled: true,
	}];

	if(!IS_PACKAGED) {
		trayItems.push({
			id: MENU.DEBUG_MUTE,
			text: "DEBUG ONLY: Toggle muting",
			enabled: true,
			checked: isMutedDebug,
		});
	}

	const tray = new Tray({
		icon: IS_PACKAGED ? 'spotify-ad-blocker.ico' : path.join(__dirname, '../assets/spotify-ad-blocker.ico'),
		items: trayItems,
		tooltip: `Spotify Ad Blocker`,
	});

	tray.on('click', function(item) {
		// console.log(this);

		if(item.id === MENU.AUTOLAUNCH) {
			item.checked ? autoLaunch.disable() : autoLaunch.enable();

			item.checked = !item.checked;
			this.update(item);
		}
		else if(item.id === MENU.EXIT) {
			this.destroy();
			process.exit(0);
		}
		else if(item.id === MENU.DEBUG_MUTE) {
			isMutedDebug = !isMutedDebug;

			volumectrl.mute(isMutedDebug, state.pid)
			.then(() => {
				console.log(`[DEBUG] muted: ${isMutedDebug}`);
			})
			.catch(console.error);

			item.checked = isMutedDebug;
			this.update(item);
		}
	});
};


if(IS_PACKAGED) {
	autoLaunch.isEnabled()
	.then(createTray);
}
else {
	createTray(false);
}
