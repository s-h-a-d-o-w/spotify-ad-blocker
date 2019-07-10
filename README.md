<p align="center"><img src="./assets/spotify-ad-blocker.png" width="100px" /></p>
<h2 align="center">Spotify Ad Blocker</h2>

**Windows only for now!**

### Simply [download the latest release](https://github.com/s-h-a-d-o-w/spotify-ad-blocker/releases/latest) and run it.

Spotify Ad Blocker is portable and can be controlled through the tray icon. It blocks ads by muting Spotify 
(and only Spotify) while they are running.

Inspired by [EZBlocker](https://github.com/Xeroday/Spotify-Ad-Blocker) - great stuff, would not have gotten the idea 
to do this without it! 

**What's different about Spotify Ad Blocker?**

- flexibility (Spotify doesn't need to keep running)
- minimalism (No UI aside from the tray menu and options aside from automatic startup)

## Bugs? 

If you experience problems, please [get in touch](mailto://ao@variations-of-shadow.com).

### Github users 

Run `spotify-ad-blocker.exe --debug` until those errors occur and 
then copy/paste the contents of `%APPDATA%/spotify-ad-blocker/error.log` as well as 
`%APPDATA%/spotify-ad-blocker/debug.log` into your issue description.

## Development Notes

Please note that I am not too familiar with native code development and I was struggling a bit 
to make things work. If you know better and would like to clean up the build progress for various 
C/C++ code, I appreciate any contribution.

Building is a prerequisite to using `yarn start`. (Not triggered automatically on every 
start because it takes a while) 

### Building

This is only relevant if you for some reason want to build this project yourself - maybe you 
want to fork it or something. (Plus - notes to my future self :wink:) 

- A recent Node.js version (see `engines` in `package.json`) is needed, since N-API is used 
for the native addon in this project and this was still experimental in Node 8.x, printing 
warnings to the console.

- Run `yarn build`

- Start ResourceHacker (yes, the GUI) and select `Icon`, then right click -> `Replace Icon...`. 
Leave everything at default, simply select `spotify-ad-blocker_for_exe.ico` from `./assets` and 
then save.
(If the new icon doesn't show up in e.g. Explorer, run 
[`ie4uinit.exe -ClearIconCache`](https://superuser.com/a/499079/700677) on Win7,
`ie4uinit.exe -show` on Win10)

### Future Linux support

- This might help:
https://askubuntu.com/a/508230/689361
https://bazaar.launchpad.net/~mkayaalp/indicator-muteads/stable/files/head:/src/

### Patches

##### pkg

- Patching `projectToNearby` was necessary so that pkg doesn't look for .node files where it was 
started (execpath) but the cwd (which we manipulate).
- Removing the override of `spawn` enables us to spawn ourselves on exit. Makes it possible for this 
to be a standalone executable that doesn't leave a mess behind (see cleanup branch in `bootstrap.js`).

##### winreg

- Without this patch, toggling "Run on startup" would briefly pop up a command prompt.

### Misc

Since `pkg` doesn't allow for including of native addons in the package, we rename them to 
`.foolpkg` temporarily.

The npm scripts are intentionally called e.g. `beforebuild` instead of `prebuild` to ensure 
consistency between using yarn vs. npm vs. whatever.

## TODO

Nothing in terms of functionality, just improving the implementation:

- Would be nice to have a custom process description in task manager instead of `Node.js: ...`.
Unfortunately, modifying this with ResourceHacker doesn't work and other tools I've tried also 
didn't work.  
Apparently, rcedit can be safely used on the files in pkg's `.pkg-cache`, so maybe 
that would work but... modifying files in third party parts of the build pipeline seems very 
dirty to me.  
An acceptable solution might be to implement features in `pkg` that let the user a) only 
fetch the binaries b) let the user specify the node binary to be used. So one could do a), then 
copy the binary into a temp directory, modify it and use b) to tell `pkg` to use that one instead 
of the one from its own cache.  
**If someone reads this, thinks it's a good idea and finds the time to implement this in `pkg` 
(and zeit actually merges the features), please do let me know.**
 
- Expand volumectrl to a more general volume control library and then use that as an external 
dependency via registry.
