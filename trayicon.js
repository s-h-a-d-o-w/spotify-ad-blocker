var fs = require('fs');
var path = require('path');
var SysTray = require('systray').default;

const icon = fs.readFileSync(path.join(__dirname, 'assets/nodejs.ico'));
const systray = new SysTray({
    menu: {
        icon: icon.toString('base64'),
        title: "Spotify Ad Blocker",
        tooltip: "Spotify Ad Blocker",
        items: [{
            title: "Exit",
            enabled: true
        }]
    },
    debug: false,
    copyDir: true, // copy go tray binary to outside directory, useful for packing tool like pkg.
})

// Triggered when user clicks "Exit"
systray.onClick(() => systray.kill());
