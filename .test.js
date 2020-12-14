const {dirname, join} = require('path')
const {readdirSync} = require('fs')
const test = require('ava')
const {getConf} = require('./__conf')
const {deleteFolder, getChromiumRevision} = require('./__utils')
const {promisify} = require('util')
const execFile = promisify(require('child_process').execFile)
const pkg = require('./package.json')

const conf = getConf(true)
const confDir = dirname(conf.path)

const headless = true

const testVars = {
  concurrency: headless ? 3 : 1,
  headless,
  debug: true,
  addonPath: join(confDir, 'testingAddonPath'),
  timeout: headless ? 30000 : 60000,
  polling: 500,
  delay: 2500,
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
    'ElvUI_FCT',
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

const testConfig = {
  "timeout": testVars.timeout,
  "polling": testVars.polling,
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
  "delay": testVars.delay,
  "waitForKey": false
}

test.serial('0 reset', async t => {
  await deleteFolder(`${confDir}/**/*`)
  t.pass();
});

test.serial('1 set testconfig', t => {
  conf.set(testConfig)
  t.pass();
});

test.serial('2 migrated testconfig matches expected', async t => {
  t.is(JSON.stringify(conf.get()), JSON.stringify(testConfig));
});

test.serial('3 can do the real deal', async t => {
  try {
    const { stdout } = await execFile('node', ['index.js', 'testing'], {shell: true});
    t.true(stdout.includes(`osjswowau v${pkg.version} finished`))
    t.pass()
  } catch (error) {
    t.log(error);
    t.fail()
  }

});

test.serial('4 the addon folder count makes sense',  t => {
  const getDirectories =  source =>
    readdirSync(source, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)


  t.is(JSON.stringify(getDirectories(testVars.addonPath)), JSON.stringify(testVars.finalTestResults));
});

test.serial('5 check that we cleanup after ourselves',  t => {
  const getDirectories =  source =>
    readdirSync(source, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)

  t.is(getDirectories(dirname(conf.path)).length, 2);
});


test.serial('6 check remaining chromium version ',  t => {
  const getDirectories =  source =>
    readdirSync(source, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)

  t.deepEqual(getDirectories(dirname(conf.path)), [
      'chromium-' + getChromiumRevision(process.platform),
      'testingAddonPath',
    ]
  );
});

// TODO: test version update notif
