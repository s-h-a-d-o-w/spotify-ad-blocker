struct VolumeCtrlResult {
	int code;
	const char* msg;
};

// if no pid is supplied, all sounds will be muted
VolumeCtrlResult mute(bool mute, int pid = -1);
