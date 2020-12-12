const puppeteer = require("puppeteer-extra");
const Conf = require("conf");
const { join, dirname } = require("path");
const cliProgress = require("cli-progress");
const chalk = require("chalk");
const { existsSync } = require("fs");
const { Cluster } = require("puppeteer-cluster");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { firstStart, cleanTmps, schema, migrations, endLogic, errorLogicWrapper, getRevision } = require("./_utils");
const { tukuiLogic } = require("./_tukui");
const { curseLogic } = require("./_curse");
const { tsmLogic } = require("./_tsm");
const { wowinterfaceLogic } = require("./_wowinterface");
const pkg = require("./package.json");

puppeteer.use(StealthPlugin());

let debug = process.env.DEBUG || false;
console.log(chalk.bold(chalk.green("osjswowau")), "version", chalk.bold(pkg.version), "starting");

let config = {};

const main = async () => {
  try {
    config = new Conf({
      projectName: pkg.name,
      projectVersion: pkg.version,
      clearInvalidConfig: false,
      projectSuffix: "",
      schema,
      migrations,
    });
    config.delete("errored");
    debug = debug || config.get("debug");
    const tmp = join(dirname(config.path), "tmp")
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

    firstStart(config);

    const revision = getRevision(process.platform);
    process.on("unhandledRejection", async (err) => {
      await errorLogicWrapper(err, config, debug);
    });
    const browserFetcher = puppeteer.createBrowserFetcher({
      path: join(dirname(config.path), `chromium-${revision}`),
    });

    let chromiumBar
    const revisionInfo = await browserFetcher.download(revision, (transferred, total) => {
      if (!debug) {
        if (!chromiumBar) {
          chromiumBar = multibar.create(total, 0, {
            filename: `downloading ${chalk.green(`chromium-${revision}`)} `,
          });
          return null;
        }
        return chromiumBar.update(transferred, {
          filename: `downloading ${chalk.green(`chromium-${revision}`)} (${((transferred / total) * 100).toFixed(
            2
          )}% downloaded)`,
        });
      }
      return null;
    });

    const cluster = await Cluster.launch({
      concurrency: Cluster.CONCURRENCY_BROWSER,
      maxConcurrency: config.get('concurrency'),
      timeout: config.get('timeout'),
      puppeteer,
      puppeteerOptions: {
        headless: config.get('headless'),
        executablePath: revisionInfo.executablePath,
        args: existsSync("/.dockerenv")
          ? ["--no-sandbox", "--disable-features=site-per-process"]
          : ["--disable-features=site-per-process"],
      },
    });

    const makeBar = (mb) => mb.create(4, 0, { filename: "" });

    await cluster.task(async ({ page, data: { type, value } }) => {
      await page.setDefaultNavigationTimeout(config.get("timeout"));
      await page.setDefaultTimeout(config.get("timeout"));
      if (debug) console.log("executing task", chalk.bold(chalk.yellow(value, type)));
      const bar = debug ? undefined : makeBar(multibar);
      if (type === "tukui") return tukuiLogic(config, page, value, bar, tmp);
      if (type === "curse") return curseLogic(config, page, value, bar, tmp);
      if (type === "tsm") return tsmLogic(config, page, value, bar, tmp);
      if (type === "wowinterface") return wowinterfaceLogic(config, page, value, bar, tmp);
      return null;
    });

    const queue = [];

    const curse = config.get('addons.curse')
    if (curse && Array.isArray(curse) && curse.length !== 0) {
      curse.map((value) => queue.push({ type: "curse", value }));
    }

    const wowinterface = config.get('addons.curse')
    if (wowinterface && Array.isArray(wowinterface) && wowinterface.length !== 0) {
      wowinterface.map((value) => queue.push({ type: "wowinterface", value }));
    }

    const tukui = config.get('addons.tukui')
    if (tukui) {
      if (tukui.tukui) queue.push({ type: "tukui", value: "tukui" });
      if (tukui.elvui) queue.push({ type: "tukui", value: "elvui" });
      if (tukui.addons && Array.isArray(tukui.addons) && tukui.addons.length !== 0)
        [...tukui.addons].map((value) => queue.push({ type: "tukui", value }));
    }

    const tsm = config.get('addons.tsm')
    if (tsm) {
      ["helper", "tsm"].map((value) => queue.push({ type: "tsm", value }));
    }

    try {
      await Promise.all(queue.map((v) => cluster.execute(v)));
    } catch (err) {
      await cluster.close();
      await errorLogicWrapper(err, config, debug);
    } finally {
      await cluster.idle();
      await cluster.close();
    }

    if (!debug) await multibar.stop();
    await cleanTmps(config);

    return cluster.close();
  } catch (err) {
    await errorLogicWrapper(err, config, debug);
  } finally {
    await endLogic();
    process.exit(0);
  }
  return null;
};

module.exports = main;

main();
