# 💽 osjswowau
**O**pen **S**ource **J**ava**S**cript **WoW** **A**ddon **U**pdater

- ✨ Detects `Interface/AddOns` folder and **installed addons.**
- ⬆️ Checks if **updates are available**. 
- ♻️ **Cross-platform**, supports  **Windows**, **macOs**, **Linux**.
- 📝 Manage as you please with a **configuration file**.
- 🚀 **Parallel** processing of updates.
- 🕵️ Emulates a **real user**, no rate limiting.
- 📦 Builds available on **[Github Releases](https://github.com/jukefr/osjswowau/releases)**.

![demo gif](https://i.imgur.com/f9BC08g.gif)

## 📦 Installation
Download from [Github Releases](https://github.com/jukefr/osjswowau/releases) and run it. *(recommended)*

`npm i -g osjswowau` if you prefer to use Nodejs.

## 🗃 Addon Sources
- **CurseForge addons** (latest version, md5 checked)
- **WoWInterface addons** (latest version, no hashes available)
- **Elvui, Tukui and Tukui addons** (latest version, no hashes available)
- **TradeSkillMaster and TradeSkillMaster_Apphelper** (latest version, no hashes available)


## 📝 Configuration
The default settings should work out of the box for most people.

When encountering a timeout error, a second or third attempt at launching osjswowau should work.

If not, you might need to adjust some configuration values.

`__utils.js.schema` contains useful comments to explain the variables.

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

**Note** : you need the [corresponding client](https://www.tradeskillmaster.com/install). (for now)

On linux just run it in the same wine container with the same prefix and everything should work just fine.

## 🚑 Debug
The debug mode can help you learn the location of the configuration file.

It also display more information about errors which may be useful for reporting issues.

To enable the debug mode either set `config.debug` to `true`.

Or run the command with the `DEBUG` environment variable : `DEBUG=1 osjswoway`

## ✅ Future Plans
- [ ] classic/retail toggle (currently only retail)
- [ ] add version compare now that we can parse toc
- [ ] wireshark the tsm client to see how it gets the latest values