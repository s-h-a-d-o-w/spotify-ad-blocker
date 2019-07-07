{
  "targets": [{
      "target_name": "volumectrl",
      "conditions": [["OS=='win'", {
        "include_dirs": ["native/win/volumectrl"],
        "sources": ["native/win/volumectrl/napi_init.cc", "native/win/volumectrl/volumectrl.cc"]
      }]]
    }, {
      "target_name": "tray",
      "conditions": [["OS=='win'", {
        "include_dirs": ["native/win/tray"],
        "sources": ["native/win/tray/napi.cc"]
      }]]
    }, {
      "target_name": "spotify",
      "conditions": [["OS=='win'", {
        "include_dirs": ["native/win/spotify"],
        "sources": ["native/win/spotify/napi.cc", "native/win/spotify/spotify.cc"],
          "msbuild_settings": {
            "Link": {
              "AdditionalDependencies": ["C:\\Users\\Brix\\AppData\\Local\\Programs\\Common\\Microsoft\\Visual C++ for Python\\9.0\\WinSDK\\Lib\\x64\\mscoree.lib"]
            }
          }
      }]]
    }
  ]
}
