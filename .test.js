const {dirname, join} = require('path')
const {readdirSync} = require('fs')
const test = require('ava')
const main = require('./index') // TODO: test exports also
const {getConf} = require('./__conf')
const {deleteFolder} = require('./__utils')
const pkg = require('./package.json')
const {promisify} = require('util')
const execFile = promisify(require('child_process').execFile)

const conf = getConf(true)
const confDir = dirname(conf.path)

const testVars = {
  concurrency: 5,
  headless: false,
  debug: false,
  addonPath: join(conf.path, 'testing'),
  finalTestResults: [
    'AAP-Core',
    'AAP-EasternKingdoms',
    'AAP-Shadowlands',
    'AddOnSkins',
    'BigWigs',
    'BigWigs_CastleNathria',
    'BigWigs_Core',
    'BigWigs_Options',
    'BigWigs_Plugins',
    'BigWigs_Shadowlands',
    'Details',
    'Details_DataStorage',
    'Details_EncounterDetails',
    'Details_RaidCheck',
    'Details_Streamer',
    'Details_TinyThreat',
    'Details_Vanguard',
    'ElvUI',
    'ElvUI_OptionsUI',
    'ElvUI_Redtuzk',
    'ElvUI_SLE',
    'Hekili',
    'LittleWigs',
    'LittleWigs_BurningCrusade',
    'LittleWigs_Cataclysm',
    'LittleWigs_Classic',
    'LittleWigs_Legion',
    'LittleWigs_MistsOfPandaria',
    'LittleWigs_WarlordsOfDraenor',
    'LittleWigs_WrathOfTheLichKing',
    'Pawn',
    'Plater',
    'Rarity',
    'Rarity_Options',
    'TheUndermineJournal',
    'TradeSkillMaster',
    'TradeSkillMaster_AppHelper',
    'Tukui',
    'WeakAuras',
    'WeakAurasArchive',
    'WeakAurasModelPaths',
    'WeakAurasOptions',
    'WeakAurasTemplates',
    'WorldQuestsList',
  ]
}


const oldConfig = { // to test migrations
  "realpath": testVars.addonPath,
  "timeout": 30000,
  "polling": 1000,
  "waitAfterNavig": 2000,
  "tmp": "./tmp",
  "debug": testVars.debug,
  "concurrency": testVars.concurrency,
  "headless": testVars.headless,
  "addons": {
    "curse": [
      "azeroth-auto-pilot",
      "big-wigs",
      "details",
      "little-wigs",
      "pawn",
      "plater-nameplates",
      "tradeskill-master",
      "weakauras-2"
    ],
    "elvui": [
      137,
      38,
      107,
      3
    ]
  }
}

const expectedOutput = {
  "timeout": 30000,
  "polling": 1000,
  "tmp": "./tmp",
  "debug": testVars.debug,
  "concurrency": testVars.concurrency,
  "headless": testVars.headless,
  "addons": {
    "curse": [
      "azeroth-auto-pilot",
      "big-wigs",
      "details",
      "little-wigs",
      "pawn",
      "plater-nameplates",
      "weakauras-2"
    ],
    "tsm": true,
    "wowinterface": [],
    "tukui": {
      "addons": [
        137,
        38,
        107,
        3
      ],
      "elvui": true
    }
  },
  "fresh": false,
  "addonPath": testVars.addonPath,
  "waitForKey": false,
  "delay": 2000,
  "__internal__": {
    "migrations": {
      "version": pkg.version
    }
  }
}

const testConfig = {
  "timeout": 30000,
  "polling": 500,
  "tmp": "./tmp",
  "debug": testVars.debug,
  "concurrency": testVars.concurrency,
  "headless": testVars.headless,
  "addons": {
    "curse": [
      "azeroth-auto-pilot",
      "big-wigs",
      "details",
      "little-wigs",
      "pawn",
      "undermine-journal",
      "plater-nameplates",
      "weakauras-2",
      "world-quests-list",
      "rarity"
    ],
    "tsm": true,
    "tukui": {
      "addons": [
        137,
        38,
        107,
        3
      ],
      "elvui": true,
      "tukui": true
    },
    "wowinterface": ["24608-Hekili"]
  },
  "fresh": false,
  "addonPath": testVars.addonPath,
  "delay": 1000,
  "waitForKey": false
}



test.serial('reset 1', async t => {
  await deleteFolder(`${confDir}/**/*`)
  t.pass();
});

test.serial('set oldconfig', t => {
  conf.set(oldConfig)
  t.pass();
});

test.serial('throws on fresh config', async t => {
  try {
    const {stdout} = await execFile('node', ['index.js','testing']);
    t.true(stdout.includes("Brand new installation or old configuration migrated"))
  } catch (error) {
    t.log(error);
    t.fail()
  }
});

test.serial('migrated config matches expected', async t => {
  t.is(JSON.stringify(conf.get()), JSON.stringify(expectedOutput));
});

test.serial('reset 2', async t => {
  await deleteFolder(`${confDir}/**/*`)
  t.pass();
});

test.serial('set testconfig', t => {
  conf.set(testConfig)
  t.pass();
});

test.serial('migrated testconfig matches expected', async t => {
  t.is(JSON.stringify(conf.get()), JSON.stringify(testConfig));
});

test.serial('can do the real deal', async t => {
  try {
    const {stdout} = await execFile('node', ['index.js','testing']);
  } catch (error) {
    t.log(error);
    t.fail()
  }
  const getDirectories =  source =>
     readdirSync(source, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
  const test =  getDirectories(testVars.addonPath)
  t.log(test)
  t.log(testVars.finalTestResults)
  t.pass()
});

test.serial('the addon folder count makes sense now', async t => {

  // t.deepEqual(, testVars.finalTestResults)
});

// check that some addons were actually extracted


// check that integrated cleanup works