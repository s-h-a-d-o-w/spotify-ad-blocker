<p align="center"><img src="./assets/spotify-ad-blocker_icon.png" /></p>
<h1 align="center">Spotify Ad Blocker</h1>

**Windows only for now!**

Blocks ads by muting Spotify (and only Spotify) while they are running.

Works a lot like [EZBlocker](https://github.com/Xeroday/Spotify-Ad-Blocker) - great stuff, 
would not have gotten the idea to do this without it! 

Differences:

- No need to keep Spotify running.
- Uses less RAM and CPU (which was **the** surprising thing for me because despite the advancements 
in JS, I did not think it would do this well):

	Tool | RAM | CPU (Spotify plays) | CPU (Spotify not running)
	---- | --- | ------------------- | -------------------------
	EZBlocker | ~25 MB | 2-4% | -
	Spotify Ad Blocker | ~20 MB | 0-1% | 0-2%

## Usage (WIP)

Just grab the latest release and run it.

## Bugs? 

If you experience problems, run `spotify-ad-blocker.exe --debug` until those errors occur and 
then copy/paste the contents of `%APPDATA%/spotify-ad-blocker/error.log` as well as 
`%APPDATA%/spotify-ad-blocker/debug.log` into your bug report.
