<p align="center"><img src="./assets/spotify-ad-blocker_icon.png" /></p>

<p align="center"><h1>Spotify Ad Blocker</h1></p>

**Windows only for now!**

Blocks ads by muting Spotify (and only Spotify) while they are running.

Works a lot like [EZBlocker](https://github.com/Xeroday/Spotify-Ad-Blocker) - great stuff, 
would not have gotten the idea to do this without it! 

Differences:

- No need to keep Spotify running.
- Uses less RAM and CPU (measured on a pretty weak machine):
```
EZBlocker: ~25 MB RAM, 2-4% CPU usage in idle
This: ~20 MB RAM, 0-2% CPU usage in idle
```

Tool | RAM | CPU (Spotify plays) | CPU (Spotify not running)
---- | --- | ------------------- | -------------------------
EZBlocker | ~25 MB | 2-4% | -
Spotify Ad Blocker | 17-30 MB | 0-1% | 0-2%



## Usage (WIP)

Just grab the latest release and run it.

## Bugs? 

If you experience problems, run `spotify-ad-blocker.exe --debug` until those errors occur and 
then paste `%APPDATA%/spotify-ad-blocker/error.log` as well as 
`%APPDATA%/spotify-ad-blocker/debug.log` with your bug report.
