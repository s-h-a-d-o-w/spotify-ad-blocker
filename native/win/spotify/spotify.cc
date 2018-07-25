#include <vcclr.h>

#using <System.dll>

using namespace System;
using namespace System::Diagnostics;

gcroot<Process^> spotify = nullptr;

int isAdPlaying(int pid) {
	if(static_cast<Process^>(spotify) != nullptr && pid == spotify->Id) {
		spotify->Refresh();

		if(spotify->HasExited) {
			Console::WriteLine("Process has exited.");
			spotify = nullptr;
			return -1;
		}

		//Console::WriteLine(DateTime::Now + spotify->MainWindowTitle);
		bool adPlaying;
		try {
			adPlaying = spotify->MainWindowTitle->Contains(" - ");
			return adPlaying ? 0 : 1;
		}
		catch(...) {
			return -1;
		}
	}

	//Console::WriteLine("Grabbing new process (pid:" + pid + ")");

	String^ title = "";
	try {
		spotify = Process::GetProcessById(pid);

		//Console::WriteLine("Window title (pid: " + spotify->Id + "): " + spotify->MainWindowTitle);
		return spotify->MainWindowTitle->Contains(" - ") ? 0 : 1;
	}
	catch(...) {
		//Console::WriteLine("Could not find process (pid: " + pid + ")");
		return -1;
	}
}
