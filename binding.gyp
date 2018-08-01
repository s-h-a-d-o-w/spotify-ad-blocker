{
  "targets": [{
    "target_name": "volumectrl",
    "conditions": [["OS=='win'", {
      "include_dirs": ["native/win/volumectrl"],
      "sources": ["native/win/volumectrl/napi.cc", "native/win/volumectrl/volumectrl.cc"]
    }]]
  }, {
    "target_name": "tray",
    "conditions": [["OS=='win'", {
      "include_dirs": ["native/win/tray"],
      "sources": ["native/win/tray/napi.cc"]
    }]]
  }]
}
