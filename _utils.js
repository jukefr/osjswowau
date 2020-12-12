const chalk = require("chalk");
const { rmdir, unlink } = require("fs").promises;
const glob = require("glob-promise");
const { inspect } = require("util");
const https = require("https");

const deleteFile = (path) => unlink(path);

const getLatestTag = async () =>
  new Promise((resolve, reject) =>
    https
      .get(
        "https://api.github.com/repos/jukefr/osjswowau/tags",
        {
          headers: { "User-Agent": "Mozilla/5.0" },
        },
        (resp) => {
          let data = "";

          resp.on("data", (chunk) => {
            data += chunk;
          });

          resp.on("end", () => resolve(JSON.parse(data)));
        }
      )
      .on("error", (err) => reject(err))
  );

const migrations = {
  "2.2.0": (store) => {
    const curse = store.get("addons.curse");
    if (curse) {
      const removeTSM = curse.filter((i) => {
        const includes = ["tradeskillmaster_apphelper", "tradeskill-master"].includes(i);
        if (!includes) {
          return i;
        }
        store.set("addons.tsm", includes);
        return false;
      });
      return store.set("addons.curse", removeTSM);
    }
    return null;
  },
  "2.2.2": (store) => {
    const addonPath = store.get("realpath");
    if (addonPath) {
      store.delete("realpath");
      store.set("addonPath", addonPath);
    }

    const delay = store.get("waitAfterNavig");
    if (delay) {
      store.delete("waitAfterNavig");
      store.set("delay", delay);
    }
  },
  "3.1.0": (store) => {
    const elvui = store.get("addons.elvui");
    if (Array.isArray(elvui)) {
      store.set("addons.tukui.addons", elvui);
      store.set("addons.tukui.elvui", true);
      store.delete("addons.elvui");
    }
  },
};

const schema = {
  fresh: { type: "boolean", default: true }, // used on first start, should remain disabled after
  debug: { type: "boolean", default: false }, // disable progress bars and enable more verbose logs
  headless: { type: "boolean", default: true }, // hide chromium windows
  concurrency: { type: "number", maximum: 10, minimum: 1, default: 5 }, // amount of addons that can be updated at the same time ("threads")
  addonPath: { type: "string", default: "C:\\blabla\\bla..." },
  timeout: {
    // how long an action can take (goto, click, wait, etc) in ms
    type: "number",
    maximum: 300 * 1000,
    minimum: 10 * 1000,
    default: 30 * 1000,
  },
  polling: {
    // how long timeout loops wait after each check in ms
    type: "number",
    maximum: 10 * 1000,
    minimum: 250,
    default: 1000,
  },
  delay: {
    // applied after every navigation action (goto, click, etc) in ms
    type: "number",
    maximum: 10 * 1000,
    minimum: 250,
    default: 2 * 1000,
  },
  addons: {
    type: "object",
    properties: {
      curse: {
        type: "array",
        items: { type: "string", default: "azeroth-auto-pilot" },
        default: [
          "azeroth-auto-pilot",
          "big-wigs",
          "details",
          "little-wigs",
          "pawn",
          "plater-nameplates",
          "weakauras-2",
        ],
      },
      tukui: {
        tukui: { type: "boolean", default: false },
        elvui: { type: "boolean", default: true },
        addons: {
          type: "array",
          items: { type: "number", default: 3 },
          default: [137, 38, 3],
        },
      },
      tsm: { type: "boolean", default: false },
      wowinterface: {
        type: "array",
        items: { type: "string", default: "24608-Hekili" },
        default: [],
      },
    },
    default: {},
  },
};

const cleanTmps = async (cfg) => {
  const tmps = await glob(`${cfg.tmp}-*`);
  const queue = tmps.map((t) => rmdir(t, { recursive: true }));
  return Promise.all(queue);
};

const log = {
  error: (...msg) => console.log(chalk.red(...msg)),
  info: (...msg) => console.log(chalk.green(...msg)),
  debug: (...msg) => console.log(chalk.blue(inspect(...msg))),
};

const firstStart = (config) => {
  if (config.get("fresh")) {
    log.info("First run or configuration updated.");
    log.info(`Please edit ${chalk.yellow(config.path)} to match your needs.`);
    if (process.platform === "win32" || process.platform === "win64")
      log.info(
        `Make sure to use double backslashes ${chalk.yellow("\\\\")} to escape the ${chalk.yellow(
          "addonPath"
        )} (AddOns folder) variable.`
      );
    if (process.platform === "win32" || process.platform === "win64")
      log.info(`ie. ${chalk.yellow('"C:\\\\Program Files\\\\..."')}`);
    log.info();
    log.info("hint: if your configuration keeps getting reset you are probably making syntax errors");
    config.set("fresh", false);
    process.exit(1);
  }
};

const delay = (d) =>
  new Promise((resolve) => {
    setTimeout(resolve, d);
  });

module.exports = {
  firstStart,
  schema,
  delay,
  log,
  cleanTmps,
  migrations,
  getLatestTag,
  deleteFile,
};
