const fs = require('fs');
const fecha = require('fecha');

const {PATHS} = require('./consts.js');

/**
 * Redirects stdout and stderr to provided log paths.
 * stdout only if process is run with --debug, otherwise its output is lost.
 */
function setup() {
	// Redirect uncaught/unhandled things to console.error (makes logging them to file possible)
	// ------------------------------------------------------------------------------
	process.on('uncaughtException', (err) => {
		console.error(err);
		setTimeout(() => process.exit(1), 500);
	});
	process.on('unhandledRejection', (reason, p) => {
		console.error('Unhandled Rejection at:', p, 'reason:', reason);
		setTimeout(() => process.exit(1), 500);
	});

	// Redirect stdout/stderr to log files if app is run as packaged .exe
	// --------------------------------------------------------------------
	const stdoutFile = fs.createWriteStream(PATHS.DEBUG_LOG, {flags: 'a'});
	// ignore stdout if not run with --debug
	const isDebug = process.argv.includes('--debug');
	process.stdout.write = function (string, encoding) {
		if(isDebug) {
			string = `${fecha.format(new Date(), "HH:mm:ss.SSS")}: ${string}`;
			stdoutFile.write(string, encoding);
		}
	};

	const stderrFile = fs.createWriteStream(PATHS.ERROR_LOG, {flags: 'a'});
	process.stderr.write = function (string, encoding) {
		string = `${fecha.format(new Date(), "HH:mm:ss.SSS")}: ${string}`;
		stderrFile.write(string, encoding);
	};
}

module.exports = {
	setup
};
