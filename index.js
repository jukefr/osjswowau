const puppeteer = require("puppeteer-extra");
const Conf = require("conf");
const { join, dirname } = require("path");
const cliProgress = require("cli-progress");
const chalk = require("chalk");
const { existsSync } = require("fs");
const { Cluster } = require("puppeteer-cluster");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { firstStart, cleanTmps, schema, migrations, endLogic, errorLogicWrapper, getLatestTag} = require("./_utils");
const { tukuiLogic } = require("./_tukui");
const { curseLogic } = require("./_curse");
const { tsmLogic } = require("./_tsm");
const { wowinterfaceLogic } = require("./_wowinterface");
const pkg = require("./package.json");

const debug = process.env.DEBUG || false
if (debug) console.log(chalk.bold(chalk.yellow("debug mode active")));

console.log(chalk.bold(chalk.green("osjswowau")), "version", chalk.bold(pkg.version), "starting");

let config = {}
let latest

puppeteer.use(StealthPlugin());

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
    config.delete('errored')

    latest = await getLatestTag();

    process.on('unhandledRejection',  err => {
      errorLogicWrapper(err, config, latest)
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
      if (!debug) {
        if (!cfg.chromiumBar) {
          cfg.chromiumBar = multibar.create(total, 0, {
            filename: `downloading ${chalk.green(`chromium-${revision}`)} `,
          });
          return null;
        }
        return cfg.chromiumBar.update(transferred, {
          filename: `downloading ${chalk.green(`chromium-${revision}`)} (${((transferred / total) * 100).toFixed(
            2
          )}% downloaded)`,
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

    cluster.on("taskerror", (err, data) => {
      if (debug) console.log(chalk.red('task data'), data)
      errorLogicWrapper(err, config, latest)
    });

    const makeBar = (mb) => mb.create(3, 0, { filename: "" });

    await cluster.task(async ({ page, data: { type, value } }) => {
      await page.setDefaultNavigationTimeout(config.get('timeout'));
      await page.setDefaultTimeout(config.get('timeout'));
      if (debug) console.log('queuing task', chalk.yellow(value, type))
      const bar = debug ? undefined : makeBar(multibar);
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
    if (!debug) await multibar.stop();
    await cleanTmps(cfg);
    return cluster.close();
  } catch (err) {
    errorLogicWrapper(err, config, latest)
  } finally {
    await endLogic()
  }

  return null;
};

module.exports = main;

main();
