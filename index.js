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
const { Cluster } = require("puppeteer-cluster");
const notifier = updateNotifier({ pkg, updateCheckInterval: 30000 });
puppeteer.use(StealthPlugin());

let debugState = false;

const main = async () => {
  try {
    const multibar = new cliProgress.MultiBar(
      {
        clearOnComplete: false,
        format: "{filename} - [{bar}] - {percentage}% ({value}/{total}) ",
        hideCursor: true,
        barsize: 20,
      },
      cliProgress.Presets.legacy
    );

    const config = new Conf({
      migrations: {
        ">=1.2.5": (store) => {
          store.set("concurrency", 5);
        },
      },
    });

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
      if (notifier.update) {
        notifier.notify();
      }
      process.exit(1);
    });

    const cluster = await Cluster.launch({
      concurrency: Cluster.CONCURRENCY_BROWSER,
      maxConcurrency: cfg.concurrency,
      puppeteer,
      puppeteerOptions: {
        headless: !cfg.debug,
      },
    });

    await cluster.task(async ({ page, data: { type, value } }) => {
      if (type === "elvui") return elvuiLogic(page, value, multibar, cfg);
      if (type === "curse") return curseLogic(page, value, multibar, cfg);
    });

    cfg.addons.curse.map((value) => cluster.queue({ type: "curse", value }));
    if (cfg.addons.elvui) {
      [...cfg.addons.elvui, "elvui"].map((value) =>
        cluster.queue({ type: "elvui", value })
      );
    }

    await cluster.idle();
    await cleanTmps(cfg);
    await multibar.stop();
    if (notifier.update) {
      notifier.notify();
    }
    return cluster.close();
  } catch (err) {
    console.log(
      chalk.red(
        "Something went terribly wrong. Usually its a timeout and a simple re-run of the command fixes it."
      )
    );
    console.log(chalk.red("Enable debug mode to learn more."));
    console.log(chalk.red("Trace."), err.stack || err);
    if (notifier.update) {
      notifier.notify();
    }
    process.exit(1);
  }
};

module.exports = main;

main();
