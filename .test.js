const {dirname, join} = require('path')
const test = require('ava')
const main = require('./index')
const {getConf} = require('./__conf')
const {deleteFolder} = require('./__utils')
const pkg = require('./package.json')
const {FreshStartError} = require('./__errors')
const { execFile } = require('child_process')

const testVars = {
  concurrency: 1,
  headless: false,
  debug: false
}

const conf = getConf(true)
const confDir = dirname(conf.path)

const oldConfig = { // to test migrations
  "realpath": "testing",
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
  "addonPath": "testing",
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
  "polling": 1000,
  "tmp": "./tmp",
  "debug": testVars.debug,
  "concurrency": testVars.concurrency,
  "headless": testVars.headless,
  "addons": {
    "curse": [
      "azeroth-auto-pilot"
    ],
    "tsm": true,
    "tukui": {
      "addons": [
        3
      ],
      "elvui": true,
      "tukui": true
    },
    "wowinterface": ["24608-Hekili"]
  },
  "fresh": false,
  "addonPath": "testing",
  "delay": 3000,
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
  const error = await t.throwsAsync( () => main(true), {instanceOf: FreshStartError});
  t.is(error.message, conf.path);
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

test.serial('throws on test config', async t => {
  const error = await new Promise ((resolve, reject) => execFile('node', ['index.js','testing'], {shell: true}, (error, stdout, stderr) => {
    if (error) {
      return reject(stderr)
    }
    return resolve(stdout)
  }))
  t.is(error.message, conf.path);
});

// check that integrated cleanup works