{
  "targets": [{
      "target_name": "volumectrl",
      "include_dirs": ["native/win"],
      "sources": ["native/win/napi_init.cc", "native/win/volumectrl.cc"]
    }, {
      "target_name": "tray",
      "include_dirs": ["native/win/tray"],
      "sources": ["native/win/tray/napi.cc"]
    }, {
      "target_name": "spotify_inner",
      "type": "static_library",
      "include_dirs": ["native/win/spotify"],
      "sources": ["native/win/spotify/spotify.cc"],
      "msbuild_settings": {
        "ClCompile": {
          "CompileAsManaged": "true",
          "ExceptionHandling": "Async"
        },
        "Link": {
          "AdditionalLibraryDirectories": "C:\\Users\\Brix\\AppData\\Local\\Programs\\Common\\Microsoft\\Visual C++ for Python\\9.0\\WinSDK\\Lib\\x64\\"
        }
      }
    }, {
     "target_name": "spotify",
     "dependencies": ["spotify_inner"],
     "include_dirs": ["native/win/spotify"],
     "sources": ["native/win/spotify/napi.cc"],
      "msbuild_settings": {
        "Link": {
          "AdditionalDependencies": ["C:\\Users\\Brix\\AppData\\Local\\Programs\\Common\\Microsoft\\Visual C++ for Python\\9.0\\WinSDK\\Lib\\x64\\mscoree.lib"]
        }
      }
   }
  ]
}
