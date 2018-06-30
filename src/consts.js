const path = require('path');

const IS_PACKAGED = process.mainModule.id.endsWith('.exe') || process.hasOwnProperty('pkg');
const PATH_APPDATA = path.join(process.env.APPDATA, 'spotify-ad-blocker');
const PATH_LOGS = {
	DEBUG: path.join(PATH_APPDATA, 'debug.log'),
	ERROR: path.join(PATH_APPDATA, 'error.log'),
};

module.exports = {
	IS_PACKAGED,
	PATH_APPDATA,
	PATH_LOGS,
};
