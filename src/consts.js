const path = require('path');

const AD_CHECK_INTERVAL = 100;
const IS_PACKAGED = process.mainModule.id.endsWith('.exe') || process.hasOwnProperty('pkg');
const PATH_APPDATA = path.join(process.env.APPDATA, 'spotify-ad-blocker');
const PATH_LOGS = {
	DEBUG: path.join(PATH_APPDATA, 'debug.log'),
	ERROR: path.join(PATH_APPDATA, 'error.log'),
};

const PATHS = {
	APPDATA: path.join(process.env.APPDATA, 'spotify-ad-blocker'),
	DEBUG_LOG: path.join(process.env.APPDATA, 'spotify-ad-blocker/debug.log'),
	ERROR_LOG: path.join(process.env.APPDATA, 'spotify-ad-blocker/error.log'),
};

module.exports = {
	AD_CHECK_INTERVAL,
	IS_PACKAGED,
	PATH_APPDATA,
	PATH_LOGS,
	PATHS,
};
