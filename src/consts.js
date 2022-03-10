const path = require('path');

const TITLE_ERROR = '___unable_to_get_title___';
const AD_CHECK_INTERVAL = 100;
const SPOTIFY_CHECK_INTERVAL = 3000;
const IS_PACKAGED = process.argv[0].indexOf('node.exe') === -1;

const MENU = {
	AUTOLAUNCH: Symbol(),
	DEBUG_MUTE: Symbol(),
	EXIT: Symbol(),
};

const PATHS = {
	APPDATA: path.join(process.env.APPDATA, 'spotify-ad-blocker'),
	DEBUG_LOG: path.join(process.env.APPDATA, 'spotify-ad-blocker/debug.log'),
	ERROR_LOG: path.join(process.env.APPDATA, 'spotify-ad-blocker/error.log'),
};

module.exports = {
	AD_CHECK_INTERVAL,
	IS_PACKAGED,
	MENU,
	PATHS,
	TITLE_ERROR,
	SPOTIFY_CHECK_INTERVAL,
};
