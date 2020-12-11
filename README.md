# 🕹️ osjswowau
**O**pen **S**ource **J**ava**S**cript **WoW** **A**ddon **U**pdater

- manage a **single configuration file** and always be up to date everywhere
- it's also **cross-platform** (windows/linux/macos/docker)
- supports **concurrent** threads (configurable, defaults to 5)
- 

![demo gif](https://i.imgur.com/AxjnSHu.gif)

## requirements
- node.js lts or newer

## supported addon sources
- **curse addons** (latest, md5 checked)
- **tukui** + **elvui** + **tukui addons** (latest, no hashes available)
- **tsm** + **tsm_apphelper** (latest, no hashes available)

## try it out
you will need to run it twice

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
if you have a good connection the default settings (except `addonPath` and `addons`) will probably work fine for you

otherwise, try simply re-running the command a second time before changing the configuration, web pages can be finicky...

the first time you use the app it will tell you where the configuration file is located

`_utils.js/schema` is used to validate the configuration and contains useful comments to explain the variables

### curse addons
curse addon names go in `addons.curse`

simply use the name of the extension from the curse site
```
https://www.curseforge.com/wow/addons/plater-nameplates/...
-> plater-nameplates
```

### tukui, elvui and tukui addons
having an `elvui: true` array in your `addons.tukui` config section will enable updating elvui

having an `tukui: true` array in your `addons.tukui` config section will enable updating tukui

tukui addon ids go in `addons.tukui.addons`

you need the addon id as they do not provide names ( or hashes 😞 )
```
https://www.tukui.org/addons.php?id=137
-> 137
```

### tsm and apphelper
simply having the `addons.tsm` key set to true will update them

you still need the [corresponding software though](https://www.tradeskillmaster.com/install)... (for now)

on linux just run it in the same wine container with the same prefix and everything should work just fine


## todo
- [ ] wowinterface
- [ ] classic/retail toggle (currently only retail)