### Prerequisite (IMPORTANT):
Ensure that you're using NodeJS 8 or newer on OSX. Android projects can be built and tested on Linux and Windows, but these platforms are not officially supported.
Before getting started, ensure you follow the [official React Native Getting Started guide](https://facebook.github.io/react-native/docs/getting-started.html) for your desired platform (iOS/Android). It is also recommended to have the react-native-cli installed:

```bash
npm install -g react-native-cli
```

### Installation:
From your command line:
```bash
# Clone this repository
# On the directory (try deleting the node_modules first, this will ensure it install the latest dependencies)
# install dependencies
npm install
```

### To Run on iOS:
Use xcode

IMPORTANT! Before deploying the appilication, make sure to include "BLUETOOTH" in RCTSystemSettings macro.
[https://github.com/c19354837/react-native-system-setting/blob/master/iOS.md#ios](https://github.com/c19354837/react-native-system-setting/blob/master/iOS.md#ios), refer to the "Bluetooth" sections.

### To Run on Android:
```bash
# To build
cd android
gradle clean
cd..
adb devices
react-native run-android
```

### During building for Android (if error):
```bash
Keystore file '/Project-Folder/android/app/debug.keystore' not found for signing config 'debug'
```
[Download](https://raw.githubusercontent.com/facebook/react-native/master/template/android/app/debug.keystore) official template
And paste the downloaded debug.keystore in '/Project-Folder/android/app/'

If your metro-server keep crashing when building the project in Android environment,
navigate to */PROJECT_DIR/node_modules/metro-config/src/defaults/blacklist.js
Replace a block of code
```bash
var sharedBlacklist = [
  /node_modules[\/\\]react[\/\\]dist[\/\\].*/,
  /website\/node_modules\/.*/,
  /heapCapture\/bundle\.js/,
  /.*\/__tests__\/.*/
];
```

### Clean npm caches
```bash
watchman watch-del-all && rm -rf $TMPDIR/react-* &&
rm -rf node_modules/ && npm cache clean && npm install && 
npm start -- --reset-cache
```
