Promise = require("bluebird");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const Conf = require("conf");
const { join, dirname } = require("path");
const cliProgress = require("cli-progress");
const { firstStart, cleanTmps } = require("./utils");
const { elvuiLogic } = require("./elvui");
const { curseLogic } = require("./curse");
const updateNotifier = require("update-notifier");
const pkg = require("./package.json");
const chalk = require("chalk");
updateNotifier({ pkg, updateCheckInterval: 1000 * 60 * 60 }).notify();
puppeteer.use(StealthPlugin());

let debugState = false;

const main = async () => {
  try {
    const multibar = new cliProgress.MultiBar(
      {
        clearOnComplete: false,
        format: "{filename} - [{bar}] - step {value}/{total}",
        hideCursor: true,
        barsize: 20,
      },
      cliProgress.Presets.legacy
    );

    const config = new Conf({});

    firstStart(config);

    const cfg = {
      ...config.store,
      tmp: join(dirname(config.path), config.get("tmp")),
    };

    debugState = cfg.debug;

    process.on("unhandledRejection", (reason, promise) => {
      console.log(
        chalk.red(
          "Something went terribly wrong. Usually its a timeout and a simple re-run of the command fixes it."
        )
      );
      console.log(chalk.red("Enable debug mode to learn more."));
      cfg.debug &&
        console.log("Unhandled Rejection at:", reason.stack || reason);
      process.exit(1);
    });

    return puppeteer.launch({ headless: !cfg.debug }).then(async (browser) => {
      await Promise.map(
        cfg.addons.curse,
        (addon) => curseLogic(browser, addon, multibar, cfg),
        {
          concurrency: 1, // WARN: stupid bugs...
        }
      );

      if (cfg.addons.elvui) {
        await Promise.map(
          ["elvui", ...cfg.addons.elvui],
          (addon) => elvuiLogic(browser, addon, multibar, cfg),
          {
            concurrency: 1, // TODO: chrome "page" set download really is on instance level
          }
        );
      }
      return Promise.all([browser.close(), multibar.stop()]).then(() =>
        cleanTmps(cfg)
      );
    });
  } catch (err) {
    console.log(
      chalk.red(
        "Something went terribly wrong. Usually its a timeout and a simple re-run of the command fixes it."
      )
    );
    console.log(chalk.red("Enable debug mode to learn more."));
    debugState && console.log("Unhandled Rejection at:", err.stack || err);
    process.exit(1);
  }
};

module.exports = main;

main();
