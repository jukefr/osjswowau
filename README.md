# 💽 osjswowau
**O**pen **S**ource **J**ava**S**cript **WoW** **A**ddon **U**pdater

- ✨ **Automagically detects addon path and installed addons.**
- 📝 Manage a **single configuration file** and always be up to date everywhere.
- ♻️ **Cross-platform** support. (windows/linux/macos/docker)
- 🚀 Supports **concurrent** threads. (configurable, defaults to 5)
- 🕵️ Emulates a **real user session** so no rate limiting. (hopefully)
- 📦 Portable builds available on **[github releases](https://github.com/jukefr/osjswowau/releases)**.

![demo gif](https://i.imgur.com/f9BC08g.gif)

## 📦 Installation
Download from [Github Release](https://github.com/jukefr/osjswowau/releases) and run it.

Or `npm i -g osjswowau` if you want to use Nodejs.

## 🗃 Addon Sources
- **CurseForge addons** (latest version, md5 checked)
- **WoWInterface addons** (latest version, no hashes available)
- **Elvui, Tukui and Tukui addons** (latest version, no hashes available)
- **TradeSkillMaster and TradeSkillMaster_Apphelper** (latest version, no hashes available)


## 📝 Configuration
If you have a good connection the default settings should work fine out of the box.

Usually when encountering an error, a second or third retry should work.

However if that is no the case then you might think about ajusting the configuration values.

`__utils.js/schema` is used to validate the configuration and contains useful comments to explain the variables

### ⚡️ CurseForge addons - https://www.curseforge.com/wow/addons
CurseForge addon names go in `config.addons.curse`.

To find the name of an addon from the URL :
```
https://www.curseforge.com/wow/addons/plater-nameplates/...
-> plater-nameplates
```

### ⚡️ WoWInterface addons - https://www.wowinterface.com/
WoWInterface addon names go in `config.addons.wowinterface`

To find the name of an addon from the URL :
```
https://www.wowinterface.com/downloads/info24608-Hekili.html
https://www.wowinterface.com/downloads/download24608-Hekili
-> 24608-Hekili
```

### ⚡️ Elvui, Tukui and Tukui addons - https://www.tukui.org
Tukui addon names go in `config.addons.tukui.addons`

To find the name of an addon from the URL :
```
https://www.tukui.org/addons.php?id=137
-> 137
```
Elvui is enabled by setting `config.addons.tukui.elvui` to `true`.

Tukui is enabled by setting `config.addons.tukui.tukui` to `true`.

### ⚡️ TradeSkillMaster and TradeSkillMaster_Apphelper - https://www.tradeskillmaster.com/install
TradeSkillMaster and TradeSkillMaster_Apphelper are enabled by setting `config.addons.tsm` to `true`.

Note : you need the [corresponding client](https://www.tradeskillmaster.com/install). (for now)

On linux just run it in the same wine container with the same prefix and everything should work just fine.


## ✅ Future Plans
- [ ] classic/retail toggle (currently only retail)