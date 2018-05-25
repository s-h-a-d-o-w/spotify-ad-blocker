/**
 * One-time executions in here.
 */
const fs = require('fs');
const path = require('path');
const fecha = require('fecha');


// Redirect uncaught/unhandled things to console.error (makes logging them to file possible)
// ------------------------------------------------------------------------------
// Need to output unhandled things using console.error because they obviously
// aren't written properly to process.stderr - they don't end up in the error log by default.
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



// DON'T FORGET TO COMMENT OUT THIS DEBUG SHIT!!!
//process.pkg = true;



let stdoutFile = fs.createWriteStream(path.join(process.env.APPDATA, 'spotify-ad-blocker/debug.log'), {flags: 'a'});
let stdoutWrite = process.stdout.write;
process.stdout.write = function (string, encoding, fd) {
	string = `${fecha.format(new Date(), "HH:mm:ss.SSS")}: ${string}`;

	if(process.pkg) {
		// if packaged but not debug, simply ignore stdout
		if(process.argv.includes('--debug')) {
			stdoutFile.write(string, encoding);
		}
	}
	else {
		stdoutWrite.apply(process.stdout, arguments);
	}
};

let stderrFile = fs.createWriteStream(path.join(process.env.APPDATA, 'spotify-ad-blocker/error.log'), {flags: 'a'});
let stderrWrite = process.stderr.write;
process.stderr.write = function (string, encoding, fd) {
	string = `${fecha.format(new Date(), "HH:mm:ss.SSS")}: ${string}`;

	if(process.pkg)
		stderrFile.write(string, encoding);
	else
		stderrWrite.apply(process.stderr, arguments);
};
