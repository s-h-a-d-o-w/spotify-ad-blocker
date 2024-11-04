// Standalone volume control script - for testing, not used by the app.
const volumectrl = require('bindings')('volumectrl');

async function main() {
	const pid = parseInt(process.argv[2], 10);
	console.log(`Attempting to mute PID ${pid}`);
	try {
		await volumectrl.mute(false, pid);
		console.log('Muted.');
	} catch (error) {
		console.error(error);
	}
}

main();
