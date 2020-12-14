const puppeteer = require("puppeteer-extra");
const { join, dirname } = require("path");
const cliProgress = require("cli-progress");
const chalk = require("chalk");
const { existsSync } = require("fs");
const { Cluster } = require("puppeteer-cluster");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { deleteTmpDirs, getChromium, createBar } = require("./__utils");
const { getConf } = require("./__conf");
const { tukuiLogic } = require("./_tukui");
const { curseLogic } = require("./_curse");
const { detectLogic } = require("./__detect");
const { tsmLogic } = require("./_tsm");
const { wowinterfaceLogic } = require("./_wowinterface");
const { handleFreshStart, handleError, handleCleanup } = require("./__handlers");
const pkg = require("./package.json");

puppeteer.use(StealthPlugin());

let debug = process.env.DEBUG || false;

let config = {};

const main = async (testing, exit) => {
  if (!testing) console.log(chalk.bold(chalk.green("osjswowau")), `v${chalk.bold(pkg.version)}`, "starting");

  try {
    config = getConf(testing);
    config.delete("errored");
    debug = debug || config.get("debug");
    const tmp = join(dirname(config.path), "tmp");
    if (debug) console.log(chalk.bold(chalk.yellow("debug mode active")));
    if (debug) console.log(process.execArgv, process.argv);

    const multibar = new cliProgress.MultiBar(
      {
        clearOnComplete: false,
        format: "{filename} - [{bar}] - {percentage}% ({value}/{total}) ",
        hideCursor: true,
        barsize: 20,
      },
      cliProgress.Presets.legacy
    );

    const revisionInfo = await getChromium(config, puppeteer, multibar, debug);

    await detectLogic(config, Cluster, puppeteer, revisionInfo, debug); // detect addons

    const cluster = await Cluster.launch({
      concurrency: Cluster.CONCURRENCY_BROWSER,
      maxConcurrency: config.get("concurrency"),
      timeout: config.get("timeout"),
      puppeteer,
      puppeteerOptions: {
        headless: config.get("headless"),
        executablePath: revisionInfo.executablePath,
        args: existsSync("/.dockerenv")
          ? ["--no-sandbox", "--disable-features=site-per-process"]
          : ["--disable-features=site-per-process"],
      },
    });

    await cluster.task(async ({ page, data: { type, value } }) => {
      await page.setDefaultNavigationTimeout(config.get("timeout"));
      await page.setDefaultTimeout(config.get("timeout"));
      if (debug) console.log("executing task", chalk.bold(chalk.yellow(value, type)));
      const bar = debug ? undefined : createBar(multibar, value);
      if (type === "tukui") return tukuiLogic(config, page, value, bar, tmp);
      if (type === "curse") return curseLogic(config, page, value, bar, tmp);
      if (type === "tsm") return tsmLogic(config, page, value, bar, tmp);
      if (type === "wowinterface") return wowinterfaceLogic(config, page, value, bar, tmp);
      return null;
    });

    const queue = [];

    const curse = config.get("addons.curse");
    if (curse && Array.isArray(curse) && curse.length !== 0) {
      curse.map((value) => queue.push({ type: "curse", value }));
    }

    const wowinterface = config.get("addons.wowinterface");
    if (wowinterface && Array.isArray(wowinterface) && wowinterface.length !== 0) {
      wowinterface.map((value) => queue.push({ type: "wowinterface", value }));
    }

    const tukui = config.get("addons.tukui");
    if (tukui) {
      if (tukui.tukui) queue.push({ type: "tukui", value: "tukui" });
      if (tukui.elvui) queue.push({ type: "tukui", value: "elvui" });
      if (tukui.addons && Array.isArray(tukui.addons) && tukui.addons.length !== 0)
        [...tukui.addons].map((value) => queue.push({ type: "tukui", value }));
    }

    const tsm = config.get("addons.tsm");
    if (tsm) {
      ["helper", "tsm"].map((value) => queue.push({ type: "tsm", value }));
    }

    try {
      await Promise.all(queue.map((v) => cluster.execute(v)));
    } catch (err) {
      await cluster.close();
      await handleError(err, config, debug, testing, exit);
    } finally {
      await cluster.idle();
      await cluster.close();
    }

    if (!debug) await multibar.stop();
    await deleteTmpDirs(tmp);

    return cluster.close();
  } catch (err) {
    await handleError(err, config, debug, testing, exit);
    if (testing) throw err;
    if (exit) process.exit(1);
  } finally {
    await handleCleanup(config);
    if (!module.parent) process.exit(0);
  }
  return config;
};

if (!module.parent) {
  main(process.argv[2], true);
} else {
  module.exports = main;
}
