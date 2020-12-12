const puppeteer = require("puppeteer-extra");
const Conf = require("conf");
const { join, dirname } = require("path");
const cliProgress = require("cli-progress");
const chalk = require("chalk");
const { existsSync } = require("fs");
const { Cluster } = require("puppeteer-cluster");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { firstStart, cleanTmps, schema, migrations, getLatestTag } = require("./_utils");
const { tukuiLogic } = require("./_tukui");
const { curseLogic } = require("./_curse");
const { tsmLogic } = require("./_tsm");
const { wowinterfaceLogic } = require("./_wowinterface");
const pkg = require("./package.json");

console.log(chalk.bold(chalk.green("osjswowau")), "version", chalk.bold(pkg.version), "starting");

puppeteer.use(StealthPlugin());

const main = async () => {
  try {
    const config = new Conf({
      projectName: pkg.name,
      projectVersion: pkg.version,
      clearInvalidConfig: false,
      projectSuffix: '',
      schema,
      migrations,
    });

    const multibar = new cliProgress.MultiBar(
      {
        clearOnComplete: false,
        format: "{filename} - [{bar}] - {percentage}% ({value}/{total}) ",
        hideCursor: true,
        barsize: 20,
      },
      cliProgress.Presets.legacy
    );

    firstStart(config);

    const cfg = {
      ...config.store,
      tmp: join(dirname(config.path), "tmp"),
    };

    process.on("unhandledRejection", (reason) => {
      console.log(
        chalk.red("Something went terribly wrong. Usually its a timeout and a simple re-run of the command fixes it.")
      );
      console.log(chalk.red("Enable debug mode to learn more."));
      if (cfg.debug) console.log("unhandled rejection", reason.stack || reason);
    });

    // TODO: find an automatic way to do this....
    const getRevision = (p) => {
      if (p === "linux") return "812859";
      if (p === "mac") return "812851";
      if (p === "win64" || p === "win32") return "812899";
      throw new Error("unsupported OS currently sorry");
    };

    const revision = getRevision(process.platform);

    const browserFetcher = puppeteer.createBrowserFetcher({
      path: join(dirname(config.path), `chromium-${revision}`),
    });

    const revisionInfo = await browserFetcher.download(revision, (transferred, total) => {
      if (!cfg.debug) {
        if (!cfg.chromiumBar) {
          cfg.chromiumBar = multibar.create(total, 0, {
            filename: `chromium-${revision}`,
          });
          return null;
        }
        return cfg.chromiumBar.update(transferred, {
          filename: `chromium-${revision}`,
        });
      }
      return null;
    });

    const cluster = await Cluster.launch({
      concurrency: Cluster.CONCURRENCY_BROWSER,
      maxConcurrency: cfg.concurrency,
      puppeteer,
      puppeteerOptions: {
        headless: cfg.headless,
        executablePath: revisionInfo.executablePath,
        args: existsSync("/.dockerenv")
          ? ["--no-sandbox", "--disable-features=site-per-process"]
          : ["--disable-features=site-per-process"],
      },
    });

    cluster.on("taskerror", (err) => {
      console.log(
        chalk.red("Something went terribly wrong. Usually its a timeout and a simple re-run of the command fixes it.")
      );
      console.log(chalk.red("Enable debug mode to learn more."));
      if (cfg.debug) console.log(chalk.red("queue task failed"), err.stack || err);
    });

    const makeBar = (mb) => mb.create(3, 0, { filename: "" });

    await cluster.task(({ page, data: { type, value } }) => {
      const bar = cfg.debug ? undefined : makeBar(multibar);
      if (type === "tukui") return tukuiLogic(page, value, bar, cfg);
      if (type === "curse") return curseLogic(page, value, bar, cfg);
      if (type === "tsm") return tsmLogic(page, value, bar, cfg);
      if (type === "wowinterface") return wowinterfaceLogic(page, value, bar, cfg);
      return null;
    });

    if (cfg.addons.curse && Array.isArray(cfg.addons.curse) && cfg.addons.curse.length !== 0) {
      cfg.addons.curse.map((value) => cluster.queue({ type: "curse", value }));
    }

    if (cfg.addons.wowinterface && Array.isArray(cfg.addons.wowinterface) && cfg.addons.wowinterface.length !== 0) {
      cfg.addons.wowinterface.map((value) => cluster.queue({ type: "wowinterface", value }));
    }
    if (cfg.addons.tukui) {
      if (cfg.addons.tukui.tukui) cluster.queue({ type: "tukui", value: "tukui" });
      if (cfg.addons.tukui.elvui) cluster.queue({ type: "tukui", value: "elvui" });
      if (cfg.addons.tukui.addons && Array.isArray(cfg.addons.tukui.addons) && cfg.addons.tukui.addons.length !== 0)
        [...cfg.addons.tukui.addons].map((value) => cluster.queue({ type: "tukui", value }));
    }
    if (cfg.addons.tsm) {
      ["helper", "tsm"].map((value) => cluster.queue({ type: "tsm", value }));
    }

    await cluster.idle();
    if (!cfg.debug) await multibar.stop();
    await cleanTmps(cfg);
    return cluster.close();
  } catch (err) {
    console.log(
      chalk.red("Something went wrong. Usually a re-run of the command should work.")
    );
    console.log(chalk.red("Otherwise enable debug mode to learn more."));
    if (err instanceof SyntaxError) {
      console.log(chalk.red("Your configuration file probably has an incorrect syntax."));
    }
    console.log(chalk.red("trace"), err.stack || err);
  } finally {
    const [latest] = await getLatestTag();
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

  return null;
};

module.exports = main;

main();
