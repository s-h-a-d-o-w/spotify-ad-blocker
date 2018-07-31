// The base for below is this:
// https://stackoverflow.com/a/21767578/5040168

#include <windows.h>
#include <iostream>
#include <string>

using namespace std;

struct Spotify {
	HWND handle;
	int pid;
};
Spotify spotify;

struct ParamWindow
{
	unsigned long ulPID;
	HWND hWnd_out;
};

BOOL isMainWindow(HWND handle)
{
	return GetWindow(handle, GW_OWNER) == (HWND)0 && IsWindowVisible(handle);
}

// Find Spotify's handle among all windows
BOOL CALLBACK enumWindowsCallback(HWND handle, LPARAM lParam)
{
	ParamWindow& param = *(ParamWindow*)lParam;
	unsigned long pid = 0;

	GetWindowThreadProcessId(handle, &pid);

	// A single process can have many handles, only that of the main
	// window can be used to get the title
	if(param.ulPID != pid || !isMainWindow(handle))
		return TRUE;

	param.hWnd_out = handle;
	return FALSE;
}

HWND getHandle(unsigned long pid)
{
	ParamWindow param;
	param.ulPID = pid;
	param.hWnd_out = 0;

	EnumWindows(enumWindowsCallback, (LPARAM)&param);

	return param.hWnd_out;
}

// Return is int instead of bool to allow simple communication of errors
// when this is used with N-API instead of a standalone .exe. (Who knows, maybe that'll work again
// at some point - currently: "Error: Invalid access to memory location.")
int isAdPlaying(int pid) {
	// Get handle of Spotify window if it's not already stored
	if(!(spotify.pid == pid && spotify.handle)) {
		spotify.pid = pid;
		spotify.handle = getHandle(pid);

		if(spotify.handle == 0)
			return 2;
	}

	// Get current window title
	int len = 1 + GetWindowTextLength(spotify.handle);
	char* title = new char[len];
	// Use ANSI version to avoid having to use uncommon types/functions
	int result = GetWindowTextA(spotify.handle, title, len);

	if(result == 0 && GetLastError() != ERROR_SUCCESS) {
		delete[] title;
		return 3;
	}
	else {
		bool isAd = strstr(title, " - ") == NULL;
		delete[] title;
		return isAd ? 1 : 0;
	}
}

int main() {
	// pid and result of ad check are communicated via stdin/stdout
	for(string pid; getline(cin, pid);) {
		try {
			cout << isAdPlaying(stoi(pid));
		}
		catch(...) {
			cout << "Input has to be a number!" << endl;
		}
	}

	return 0;
}
