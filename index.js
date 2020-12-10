const puppeteer = require("puppeteer-extra");
const Conf = require("conf");
const { join, dirname } = require("path");
const cliProgress = require("cli-progress");
const { firstStart, cleanTmps, template, log} = require("./utils");
const { elvuiLogic } = require("./elvui");
const { curseLogic } = require("./curse");
const updateNotifier = require("update-notifier");
const pkg = require("./package.json");
const chalk = require("chalk");
const { Cluster } = require("puppeteer-cluster");
const notifier = updateNotifier({ pkg, updateCheckInterval: 15000 });
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());


const main = async () => {
  let debugState = false;
  let multibar

  try {
    const config = new Conf({
      defaults: template,
      migrations: {
        ">=1.2.5": (store) => {
          store.set("concurrency", 5);
        },
        ">=2.1.8": (store) => {
          store.set("headless", true);
        },
      },
    });

    debugState = config.get('debug');

    (debugState) || (multibar = new cliProgress.MultiBar(
        {
          clearOnComplete: false,
          format: "{filename} - [{bar}] - {percentage}% ({value}/{total}) ",
          hideCursor: true,
          barsize: 20,
        },
        cliProgress.Presets.legacy
    ));

    firstStart(config);

    const cfg = {
      ...config.store,
      tmp: join(dirname(config.path), config.get("tmp")),
    };


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
        headless: cfg.headless,
      },
    });

    cluster.on('taskerror', (err, data) => {
      console.log(
          chalk.red(
              "Something went terribly wrong. Usually its a timeout and a simple re-run of the command fixes it."
          )
      );
      console.log(chalk.red("Enable debug mode to learn more."));
      cfg.debug &&
      console.log(chalk.red("queue task failed"), err.stack || err);
      if (notifier.update) {
        notifier.notify();
      }
      process.exit(1);
    });


    cfg.debug && log.debug({cluster})

    await cluster.task(({ page, data: { type, value } }) => {
      if (type === "elvui") return elvuiLogic(page, value, multibar, cfg);
      if (type === "curse") return curseLogic(page, value, multibar, cfg);
    });

    (cfg.addons.curse).map((value) => cluster.queue({ type: "curse", value }));
    if (cfg.addons.elvui) {
      [...cfg.addons.elvui, "elvui"].map((value) =>
        cluster.queue({ type: "elvui", value })
      );
    }

    cfg.debug && log.debug(cluster.jobQueue)

    await cluster.idle();
    await cleanTmps(cfg);
    (debugState) && await multibar.stop();
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
