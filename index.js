const puppeteer = require("puppeteer-extra");
const Conf = require("conf");
const { join, dirname } = require("path");
const cliProgress = require("cli-progress");
const chalk = require("chalk");
const { existsSync } = require("fs");
const { Cluster } = require("puppeteer-cluster");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { firstStart, cleanTmps, schema, migrations, endLogic, errorLogicWrapper } = require("./_utils");
const { tukuiLogic } = require("./_tukui");
const { curseLogic } = require("./_curse");
const { tsmLogic } = require("./_tsm");
const { wowinterfaceLogic } = require("./_wowinterface");
const pkg = require("./package.json");

const debug = process.env.DEBUG || false;
if (debug) console.log(chalk.bold(chalk.yellow("debug mode active")));
if (debug) console.log(process.argv);

console.log(chalk.bold(chalk.green("osjswowau")), "version", chalk.bold(pkg.version), "starting");

let config = {};

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
    config.delete("errored");

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
    process.on("unhandledRejection", async (err) => {
      await errorLogicWrapper(err);
    });
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
      timeout: cfg.timeout,
      puppeteer,
      puppeteerOptions: {
        headless: cfg.headless,
        executablePath: revisionInfo.executablePath,
        args: existsSync("/.dockerenv")
          ? ["--no-sandbox", "--disable-features=site-per-process"]
          : ["--disable-features=site-per-process"],
      },
    });

    const makeBar = (mb) => mb.create(3, 0, { filename: "" });

    await cluster.task(async ({ page, data: { type, value } }) => {
      await page.setDefaultNavigationTimeout(config.get("timeout"));
      await page.setDefaultTimeout(config.get("timeout"));
      if (debug) console.log("executing task", chalk.bold(chalk.yellow(value, type)));
      const bar = debug ? undefined : makeBar(multibar);
      if (type === "tukui") return tukuiLogic(page, value, bar, cfg);
      if (type === "curse") return curseLogic(page, value, bar, cfg);
      if (type === "tsm") return tsmLogic(page, value, bar, cfg);
      if (type === "wowinterface") return wowinterfaceLogic(page, value, bar, cfg);
      return null;
    });

    const queue = [];

    if (cfg.addons.curse && Array.isArray(cfg.addons.curse) && cfg.addons.curse.length !== 0) {
      cfg.addons.curse.map((value) => queue.push({ type: "curse", value }));
    }

    if (cfg.addons.wowinterface && Array.isArray(cfg.addons.wowinterface) && cfg.addons.wowinterface.length !== 0) {
      cfg.addons.wowinterface.map((value) => queue.push({ type: "wowinterface", value }));
    }
    if (cfg.addons.tukui) {
      if (cfg.addons.tukui.tukui) queue.push({ type: "tukui", value: "tukui" });
      if (cfg.addons.tukui.elvui) queue.push({ type: "tukui", value: "elvui" });
      if (cfg.addons.tukui.addons && Array.isArray(cfg.addons.tukui.addons) && cfg.addons.tukui.addons.length !== 0)
        [...cfg.addons.tukui.addons].map((value) => queue.push({ type: "tukui", value }));
    }
    if (cfg.addons.tsm) {
      ["helper", "tsm"].map((value) => queue.push({ type: "tsm", value }));
    }

    try {
      await Promise.all(queue.map((v) => cluster.execute(v)));
    } catch (err) {
      await cluster.close();
      await errorLogicWrapper(err);
    } finally {
      await cluster.idle();
      await cluster.close();
    }

    if (!debug) await multibar.stop();
    await cleanTmps(cfg);

    return cluster.close();
  } catch (err) {
    await errorLogicWrapper(err);
  } finally {
    await endLogic();
    process.exit(0);
  }
  return null;
};

module.exports = main;

main();
