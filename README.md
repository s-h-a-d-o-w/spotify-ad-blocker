<p align="center"><img src="./assets/spotify-ad-blocker.png" /></p>
<h1 align="center">Spotify Ad Blocker</h1>

**Windows only for now!**

Blocks ads by muting Spotify (and only Spotify) while they are running.

Works a lot like [EZBlocker](https://github.com/Xeroday/Spotify-Ad-Blocker) - great stuff, 
would not have gotten the idea to do this without it! 

Differences:

- No need to keep Spotify running with Spotify Ad Blocker.
- No settings, only a "Run at startup" option (can be toggled on/off) from the tray icon.

## Usage (WIP)

Just grab the latest release and run it.

## Bugs? 

If you experience problems, run `spotify-ad-blocker.exe --debug` until those errors occur and 
then copy/paste the contents of `%APPDATA%/spotify-ad-blocker/error.log` as well as 
`%APPDATA%/spotify-ad-blocker/debug.log` into your bug report.

## Building

- Install Mingw64, make sure its `bin` directory is in `PATH` (`gcc` has to be available).
This is required to build mutevolume.exe - kind of the core piece... 

- Run `yarn build`

- Start ResourceHacker (yes, the GUI) and select `Icon`, then right click -> `Replace Icon...`. 
Leave everything at default, simply select `spotify-ad-blocker_for_exe.ico` from `./assets` and 
then save.
(If the new icon doesn't show up in e.g. Explorer, run  
[`ie4uinit.exe -ClearIconCache`](https://superuser.com/a/499079/700677) on Win7,
`ie4uinit.exe -show` on Win10)

