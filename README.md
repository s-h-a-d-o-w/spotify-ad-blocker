<p align="center"><img src="./assets/spotify-ad-blocker.png" /></p>
<h1 align="center">Spotify Ad Blocker</h1>

**Windows only for now!**

Blocks ads by muting Spotify (and only Spotify) while they are running.

Internally a lot like [EZBlocker](https://github.com/Xeroday/Spotify-Ad-Blocker) - great stuff, 
would not have gotten the idea to do this without it! 

**What's different about Spotify Ad Blocker?**

- No need to keep Spotify running.
- No settings, only a "Run at startup" option (can be toggled on/off) from the tray icon.
- Stable RAM usage (~15-40 MB - you know... caching and garbage collection) - which is great if 
you like me have your machine running for weeks or months at a time.
- Spotify Ad Blocker compensates for the fact that Spotify signals a bit too early that an ad is 
done playing.

## Usage

Simply download the latest release and run it.
Control it through the tray icon.

## Bugs? 

If you experience problems, run `spotify-ad-blocker.exe --debug` until those errors occur and 
then copy/paste the contents of `%APPDATA%/spotify-ad-blocker/error.log` as well as 
`%APPDATA%/spotify-ad-blocker/debug.log` into your issue description.

## Miscellaneous

The systray icon runs as a separate process, so don't be alarmed if you someday notice a 
`tray_windows_release.exe` in your task manager and wonder where it comes from. :smile: 

## Building

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
dependency.
