const chalk = require("chalk");
const { rmdir, unlink } = require("fs").promises;
const glob = require("glob-promise");
const { inspect } = require("util");
const https = require("https");
const pkg = require("./package.json");

const debug = process.env.DEBUG || false

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

          resp.on("end", () => resolve(JSON.parse(data)[0]));
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

class FreshStartError extends Error{
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "FreshStartError";
  }
}

class WaitTimeoutError extends Error{
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "WaitTimeoutError";
  }
}


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
    config.set("fresh", false);
    throw new FreshStartError()
  }
};

const delay = (d) =>
  new Promise((resolve) => {
    setTimeout(resolve, d);
  });

const errorLogic = (err, config) => {
  switch (err.constructor) {
    case FreshStartError:
      console.log(chalk.red("This is your first run. Terminating so you can edit config."));
      if (debug) console.log(chalk.red("cause"), err.cause || err);
      break
    case SyntaxError:
      console.log(chalk.red("Your configuration file probably has an incorrect syntax."));
      if (debug) console.log(chalk.red("cause"), err.cause || err);
      break;
    default:
      console.log(chalk.red("Something went wrong. Usually a re-run of the command should work."));
      console.log(chalk.red("Otherwise enable debug mode to learn more. (start with DEBUG=1 env)"));
      console.log(chalk.italic(chalk.red(err.message)));
      if (debug) console.log(chalk.red(err.constructor.name));
      if (debug) console.log(chalk.red("trace"), err.stack || err);
  }
  if (config.set) config.set('errored', "1")
}

const endLogic = (latest) => {
  if (latest) {
    const latestName = latest.name.replace("v", "");
    console.log(chalk.bold(chalk.green("osjswowau")), "version", chalk.bold(pkg.version), "finished");
    if (`${latestName}` !== `${pkg.version}`) {
      console.log("");
      console.log(
        "new version",
        chalk.bold(chalk.green(latestName)),
        "detected, you are running",
        chalk.bold(chalk.red(pkg.version))
      );
      console.log("please run", chalk.bold(chalk.green('"npm i -g osjswowau"')), "to update");
      console.log(
        "or download the latest binary build from",
        chalk.bold(chalk.green("https://github.com/jukefr/osjswowau/releases"))
      );
    }
  }
}

const errorLogicWrapper = (err, config, latest) => {
  errorLogic(err, config)
  if (!config.get) { // config is bad
    endLogic()
    process.exit(1)
  }
  if (config.get('errored')) endLogic(latest)
  if (config.get('errored')) process.exit(Number(config.get('errored')))
}

module.exports = {
  firstStart,
  schema,
  delay,
  log,
  cleanTmps,
  migrations,
  getLatestTag,
  deleteFile,
  FreshStartError,
  WaitTimeoutError,
  errorLogic,
  endLogic,
  errorLogicWrapper
};
