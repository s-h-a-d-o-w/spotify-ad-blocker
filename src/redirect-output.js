const fs = require('fs');
const fecha = require('fecha');

let stdoutFile, stderrFile;

/**
 * Since all output is redirected to files, nothing can be caught any more after this is called!
 */
function endStreams() {
	stdoutFile.end();
	stderrFile.end();
}

function setupRedirection(logPaths) {
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
	stdoutFile = fs.createWriteStream(logPaths.DEBUG, {flags: 'a'});
	process.stdout.write = function (string, encoding) {
		// ignore stdout if not run with --debug
		if(process.argv.includes('--debug')) {
			string = `${fecha.format(new Date(), "HH:mm:ss.SSS")}: ${string}`;
			stdoutFile.write(string, encoding);
		}
	};

	stderrFile = fs.createWriteStream(logPaths.ERROR, {flags: 'a'});
	process.stderr.write = function (string, encoding) {
		string = `${fecha.format(new Date(), "HH:mm:ss.SSS")}: ${string}`;
		stderrFile.write(string, encoding);
	};
}

module.exports = {
	endStreams,
	setupRedirection,
};
