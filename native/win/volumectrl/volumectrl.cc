// Based on
// https://gist.github.com/rdp/8363580
// and
// https://stackoverflow.com/a/25584074/5040168

// ORIGINAL HEADER:
// ================================
// to compile (using mingw-w64)
// g++ this_filename.c  -lole32
// outputs current system volume (out of 0-100) to stdout, ex: output "23"
// mostly gleaned from examples here: http://msdn.microsoft.com/en-us/library/windows/desktop/dd370839(v=vs.85).aspx
// download a compiled version here:
// https://sourceforge.net/projects/mplayer-edl/files/adjust_get_current_system_volume_vista_plus.exe.exe (updated, can set it too now!)
#include <mmdeviceapi.h>
#include <audiopolicy.h>
#include <stdio.h>

#include "volumectrl.h"


#define STRINGIFY2(x) #x
#define STRINGIFY(x) STRINGIFY2(x)

#define SAFE_RELEASE(punk)                     \
	if ((punk) != NULL)                        \
		{ (punk)->Release(); (punk) = NULL; }

#define HR_CALL(the_call)                                                      \
	hr = the_call;                                                             \
	if(FAILED(hr)) {                                                           \
		res = {-hr, "Windows API Error @ " __FILE__ ":" STRINGIFY(__LINE__) }; \
		goto Exit;                                                             \
	}


VolumeCtrlResult mute(bool mute, int pid) {
	VolumeCtrlResult res = {0, ""};
	HRESULT hr = S_OK; // Used by macro above

	IAudioSessionManager2 *pSessionManager = NULL;
	IAudioSessionEnumerator *pSessionEnumerator = NULL;
	ISimpleAudioVolume *pVolumeControl = NULL;

	IMMDeviceEnumerator *pEnumerator = NULL;
	IMMDevice *pDevice = NULL;


	CoInitialize(NULL);

	// Get enumerator for audio endpoint devices.
	HR_CALL(CoCreateInstance(__uuidof(MMDeviceEnumerator),
						NULL, CLSCTX_INPROC_SERVER,
						__uuidof(IMMDeviceEnumerator),
						(void**)&pEnumerator));

	// Get default audio-rendering device.
	HR_CALL(pEnumerator->GetDefaultAudioEndpoint(eRender, eConsole, &pDevice));

	// Get SessionEnumerator through SessionManager
	HR_CALL(pDevice->Activate(__uuidof(IAudioSessionManager2), 0, NULL, (void**)&pSessionManager));
	HR_CALL(pSessionManager->GetSessionEnumerator(&pSessionEnumerator));
	int count;
	HR_CALL(pSessionEnumerator->GetCount(&count));

	// Iterate over sessions to find the one with matching pid
	for(int i = 0; i < count; i++) {
		IAudioSessionControl *pCtrl;
		IAudioSessionControl2 *pCtrl2;
		long unsigned int cPid;

		// Get pid of current session
		HR_CALL(pSessionEnumerator->GetSession(i, &pCtrl));
		HR_CALL(pCtrl->QueryInterface(__uuidof(IAudioSessionControl2), (void**)&pCtrl2));
		HR_CALL(pCtrl2->GetProcessId(&cPid));

		//printf("pid #%d: %d\n", i, cPid);
		if(cPid == pid) {
			//printf("Found %d!\n", cPid);

			// Get volume control.
			// See also (at the bottom):
			// https://social.msdn.microsoft.com/Forums/en-US/e1f5eff5-22f7-483e-a061-1671f8ee8ff1/how-to-retrieve-audio-sessions-guids-audiosessionguid?forum=vcmfcatl
			HR_CALL(pCtrl->QueryInterface(__uuidof(ISimpleAudioVolume), (void**)&pVolumeControl));

			// Do the muting
			HR_CALL(pVolumeControl->SetMute((BOOL)mute, NULL));

			SAFE_RELEASE(pVolumeControl);
			SAFE_RELEASE(pCtrl);
			SAFE_RELEASE(pCtrl2);
			break;
		}

		SAFE_RELEASE(pCtrl);
		SAFE_RELEASE(pCtrl2);
	}

	fflush(stdout); // just in case

Exit:
	SAFE_RELEASE(pSessionEnumerator);
	SAFE_RELEASE(pSessionManager)

	SAFE_RELEASE(pEnumerator)
	SAFE_RELEASE(pDevice)

	CoUninitialize();

	return res;
}
