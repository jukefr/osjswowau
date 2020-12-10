const chalk = require("chalk");
const { rmdir } = require("fs").promises;
const glob = require("glob-promise");

const cleanTmps = async (cfg) => {
  const tmps = await glob(`${cfg.tmp}\*`);
  return Promise.map(tmps, async (d) => rmdir(d, { recursive: true }));
};

const firstStart = (config) => {
  if (config.get("firstStart") === false) return false;

  if (Object.keys(config.store).length === 0) {
    config.set(template);
  }

  if (
    config.get("realpath") ===
    "/home/user/Games/world-of-warcraft/drive_c/Program Files (x86)/World of Warcraft/_retail_/Interface/AddOns"
  ) {
    log.info("First run detected.");
    log.info(`Please edit ${chalk.yellow(config.path)} to match your needs.`);
    process.platform === "win32" &&
      log.info(
        `Make sure to use double backslashes ${chalk.yellow(
          "\\\\"
        )} to escape the ${chalk.yellow("realpath")} (AddOns folder) variable.`
      );
    process.platform === "win32" &&
      log.info(`ie. ${chalk.yellow('"C:\\\\Program Files\\\\..."')}`);
    log.info();
    log.info(
      `If this is a mistake you can set ${chalk.yellow(
        '"firstStart": false'
      )} in the configuration file.`
    );
    log.info(
      "hint: if your configuration keeps getting reset you are probably making syntax errors"
    );
    process.exit(1);
  }
};

const template = {
  realpath:
    "/home/user/Games/world-of-warcraft/drive_c/Program Files (x86)/World of Warcraft/_retail_/Interface/AddOns",
  timeout: 30000, // will depend on your connection and state of sites
  polling: 1000, // recommended
  waitAfterNavig: 2000, // will depend on your connection and state of sites
  tmp: "./tmp",
  debug: false,
  addons: {
    curse: [
      "azeroth-auto-pilot",
      "big-wigs",
      "details",
      "little-wigs",
      "pawn",
      "plater-nameplates",
      "tradeskill-master",
      "weakauras-2",
    ],
    elvui: [
      // having this section will enable elvui updates (or not)
      137, // floating combat text
      38, // shadow and light
      3, // addon skins
    ],
  },
};

const delay = (d) =>
  new Promise(function (resolve) {
    setTimeout(resolve, d);
  });

const log = {
  error: (...msg) => console.log(chalk.red(...msg)),
  info: (...msg) => console.log(chalk.green(...msg)),
  debug: (...msg) => console.log(chalk.blue(...msg)),
};

module.exports = {
  firstStart,
  template,
  delay,
  log,
  cleanTmps,
};
