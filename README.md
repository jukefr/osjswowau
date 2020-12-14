# 💽 osjswowau
**O**pen **S**ource **J**ava**S**cript **WoW** **A**ddon **U**pdater

- ✨ Detects **addon path** and **installed addons.**
- ♻️ **Cross-platform**, supports  Windows, macOs, Linux.
- 📝 **Configuration file**, manage as you please.
- 🚀 Configurable **concurrent** threads.
- 🕵️ Emulates a **real user session**, no rate limiting hopefully.
- 📦 Portable builds available on **[Github Releases](https://github.com/jukefr/osjswowau/releases)**.

![demo gif](https://i.imgur.com/f9BC08g.gif)

## 📦 Installation
Download from [Github Releases](https://github.com/jukefr/osjswowau/releases) and run it. *(recommended)*

`npm i -g osjswowau` if you prefer to use Nodejs.

## 🗃 Addon Sources
- **[CurseForge addons](#%EF%B8%8F-curseforge-addons---httpswwwcurseforgecomwowaddons)** (latest version, md5 checked)
- **[WoWInterface addons](#%EF%B8%8F-wowinterface-addons---httpswwwwowinterfacecom)** (latest version, no hashes available)
- **[Elvui, Tukui and Tukui addons](#%EF%B8%8F-elvui-tukui-and-tukui-addons---httpswwwtukuiorg)** (latest version, no hashes available)
- **[TradeSkillMaster and TradeSkillMaster_Apphelper](#%EF%B8%8F-tradeskillmaster-and-tradeskillmaster_apphelper---httpswwwtradeskillmastercom)** (latest version, no hashes available)


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

### ⚡️ TradeSkillMaster and TradeSkillMaster_Apphelper - https://www.tradeskillmaster.com
TradeSkillMaster and TradeSkillMaster_Apphelper are enabled by setting `config.addons.tsm` to `true`.

Note : you need the [corresponding client](https://www.tradeskillmaster.com/install). (for now)

On linux just run it in the same wine container with the same prefix and everything should work just fine.


## ✅ Future Plans
- [ ] classic/retail toggle (currently only retail)