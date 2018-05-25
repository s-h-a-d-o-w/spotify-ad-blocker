# Spotify Ad Blocker

**TODO: How to package this for release... still...**

**Windows only for now!**

Blocks ads by muting Spotify (and only Spotify) while they are running.

Works a lot like this project (great stuff, would not have gotten the idea to do this without 
it!): https://github.com/Xeroday/Spotify-Ad-Blocker

Differences:

- No need to keep Spotify running. Just keep the blocker running. That's all.
- Uses less RAM and CPU (measured on a pretty weak machine):
```
EZBlocker: ~25 MB RAM, 2-4% CPU usage in idle
This: ~20 MB RAM, 0-2% CPU usage in idle
```

## Usage (WIP)

Just grab the latest release and run it.

## Bugs? 

If you experience problems, run `spotify-ad-blocker.exe --debug` until those errors occur and 
then paste `%APPDATA%/spotify-ad-blocker/error.log` as well as 
`%APPDATA%/spotify-ad-blocker/debug.log` with your bug report.
