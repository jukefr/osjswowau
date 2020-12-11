# osjswowau
open source javascript wow addon updater

it's also cross-platform (windows/linux/macos)

manage a single config file and always be up to date everywhere

it also supports concurrent threads (configurable, defaults to 5)

![demo gif](https://i.imgur.com/AxjnSHu.gif)

## requirements
- node.js lts or newer

## supported
- curse **(latest, md5 checked)**
- elvui + elvui addons **(latest, no hashes available)**
- tsm + tsm_apphelper **(latest, no hashes available)**

## try it out
**you will need to run it twice (it downloads 130Mb of chromium on every execution, so slow connections may favor installation and usage section)**

the first time we bootstrap the configuration file and kill the process to give you some time to edit it
```bash
$ npx osjswowau
```

## installation and usage
```bash
$ npm i -g osjswowau

$ osjswowaus
```

## how to configure
if you have a good connection the default settings (except `realpath` and `addons`) will probably work fine for you

otherwise, try simply re-running the command a second time before changing the configuration, web pages can be finicky...

the first time you use the app it will tell you where the configuration file is located
```js
{
    realpath: "/home/user/Games/world-of-warcraft/drive_c/Program Files (x86)/World of Warcraft/_retail_/Interface/AddOns",
    timeout: 30000, // will depend on your connection and state of sites
    polling: 1000, // recommended
    waitAfterNavig: 2000, // will depend on your connection and state of sites
    tmp: "./tmp",
    debug: false,
    concurrency: 5,
    headless: true,
    addons: {
        curse: [
            "azeroth-auto-pilot",
            "big-wigs",
            "details",
            "little-wigs",
            "pawn",
            "plater-nameplates",
            "weakauras-2",
        ],
        elvui: [ // having this section will enable elvui updates (or not)
            137, // floating combat text
            38, // shadow and light
            3, // addon skins
        ],
        tsm: true // enable or disablr tsm+apphelper update
    },
}
```

### curse addons
simply use the name of the extension from the curse site
```
https://www.curseforge.com/wow/addons/plater-nameplates/...
-> plater-nameplates
```

### elvui and elvui addons
having an `elvui` array in your `addons` config section will automatically enable updating elvui

you need the addon id as they do not provide names ( or hashes 😞 )
```
https://www.tukui.org/addons.php?id=137
-> 137
```

### tsm and apphelper
simply having the `addons.tsm` key set to true will update them

you still need the [corresponding software though](https://www.tradeskillmaster.com/install)... (for now)

on linux just run it in the same wine container with the same prefix and everything should work just fine