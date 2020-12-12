const chalk = require("chalk");
const { existsSync, statSync, createReadStream } = require("fs");
const { rmdir, unlink } = require("fs").promises;
const glob = require("glob-promise");
const https = require("https");
const md5File = require("md5-file");
const unzipper = require("unzipper");
const pkg = require("./package.json");

const schema = {
  fresh: { type: "boolean", default: true }, // used on first start, should remain disabled after
  headless: { type: "boolean", default: true }, // hide chromium windows
  concurrency: { type: "number", maximum: 10, minimum: 1, default: 5 }, // amount of addons that can be updated at the same time ("threads")
  addonPath: {
    type: "string",
    default: process.platform.includes("win") ? "C:\\path\\to\\addons\\folder\\..." : "path/to/addons/folder",
  },
  waitForKey: { type: "boolean", default: !!process.__nexe }, // wait for a key to continue, enabled by default on nexe
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

const deleteFile = (path) => unlink(path);

// TODO: find an automatic way to do this....
const getRevision = (p) => {
  if (p === "linux") return "812859";
  if (p === "mac") return "812851";
  if (p === "win64" || p === "win32") return "812899";
  throw new Error("unsupported OS currently sorry");
};

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

const cleanTmps = async (tmp) => {
  const tmps = await glob(`${tmp}-*`);
  const queue = tmps.map((t) => rmdir(t, { recursive: true }));
  return Promise.all(queue);
};

class FreshStartError extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "FreshStartError";
  }
}

class WaitTimeoutError extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "WaitTimeoutError";
  }
}

const firstStart = (config) => {
  if (config.get("fresh")) {
    console.log("First run or configuration updated.");
    console.log(`Please edit ${chalk.yellow(config.path)} to match your needs.`);
    if (process.platform === "win32" || process.platform === "win64")
      console.log(
        `Make sure to use double backslashes ${chalk.yellow("\\\\")} to escape the ${chalk.yellow(
          "addonPath"
        )} (AddOns folder) variable.`
      );
    if (process.platform === "win32" || process.platform === "win64")
      console.log(`ie. ${chalk.yellow('"C:\\\\Program Files\\\\..."')}`);
    config.set("fresh", false);
    throw new FreshStartError();
  }
};

const delay = (d) =>
  new Promise((resolve) => {
    setTimeout(resolve, d);
  });

const errorLogic = (err, debug) => {
  switch (err.constructor) {
    case FreshStartError:
      console.log("");
      console.log(chalk.red("This is your first run. Terminating so you can edit config."));
      if (debug) console.log(chalk.red("cause"), err.cause || err);
      break;
    case SyntaxError:
      console.log("");
      console.log(chalk.red("Your configuration file probably has an incorrect syntax."));
      if (debug) console.log(chalk.red("cause"), err.cause || err);
      break;
    default:
      console.log("");
      console.log(chalk.red("Something went wrong. Usually a re-run of the command should work."));
      console.log(
        chalk.red(`Otherwise enable debug mode to learn more. (start with ${chalk.bold(chalk.red("DEBUG=1"))} env)`)
      );
      console.log(chalk.italic(chalk.bold(chalk.red(err.message))));
      if (debug) console.log(chalk.red(err.constructor.name));
      if (debug) console.log(chalk.red("trace"), err.stack || err);
  }
};

const waitToContinue = () => {
  console.log("");
  console.log(chalk.bold("Press any key to continue..."));
  process.stdin.setRawMode(true);
  return new Promise((resolve) =>
    process.stdin.once("data", () => {
      process.stdin.setRawMode(false);
      return resolve();
    })
  );
};

const endLogic = async (config) => {
  const latest = await getLatestTag();
  if (latest) {
    const latestName = latest.name.replace("v", "");
    console.log(chalk.bold(chalk.green("osjswowau")), `v${chalk.bold(pkg.version)}`, "finished");
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
  if (process.__nexe) {
    return waitToContinue();
  }
  if (config && config.get("waitForKey")) {
    return waitToContinue();
  }
  return null;
};

const errorLogicWrapper = async (err, config, debug) => {
  errorLogic(err, debug);
  await endLogic(config);
  process.exit(1);
};

const waitMd5 = async (config, m, name, tmp) => {
  const start = Date.now();
  while (Date.now() - start < config.get("timeout")) {
    const [fname] = await glob(`${tmp}-${name}/*.zip`);
    if (existsSync(fname)) {
      const md5 = await md5File(fname);
      if (md5 === m) {
        return fname;
      }
    }
    await delay(config.get("polling"));
  }
  throw new WaitTimeoutError();
};

const waitFile = async (config, f, m, tmp) => {
  const start = Date.now();
  let size;

  while (Date.now() - start < config.get("timeout")) {
    const [fname] = await glob(`${tmp}-${m}/*.zip`);
    if (existsSync(fname)) {
      if (size && size !== 0 && size === statSync(fname).size) return fname;
      size = statSync(fname).size;
    }
    await delay(config.get("polling"));
  }
  throw new WaitTimeoutError();
};

const unzip = (config, filename) =>
  new Promise((resolve, reject) =>
    createReadStream(filename)
      .on("error", (err) => reject(err))
      .pipe(unzipper.Extract({ path: config.get("addonPath") }))
      .on("close", (err) => (err ? reject(err) : resolve()))
      .on("error", (err) => reject(err))
  );

module.exports = {
  getRevision,
  unzip,
  waitFile,
  waitMd5,
  firstStart,
  schema,
  delay,
  cleanTmps,
  migrations,
  getLatestTag,
  deleteFile,
  FreshStartError,
  WaitTimeoutError,
  errorLogic,
  endLogic,
  errorLogicWrapper,
};
