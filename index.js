Promise = require("bluebird");
const { mkdir, rmdir } = require("fs").promises;
const { existsSync, createReadStream, statSync } = require("fs");
const puppeteer = require("puppeteer-extra");
const moment = require("moment");
const md5File = require("md5-file");
const unzipper = require("unzipper");
const glob = require("glob-promise");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const chalk = require("chalk");
const Conf = require("conf");
const { join, dirname } = require("path");
puppeteer.use(StealthPlugin());

const delay = (d) =>
  new Promise(function (resolve) {
    setTimeout(resolve, d);
  });

const log = {
  error: (...msg) => console.log(chalk.red(...msg)),
  info: (...msg) => console.log(chalk.green(...msg)),
  debug: (...msg) => console.log(chalk.blue(...msg)),
};

const main = async () => {
  const config = new Conf({
    defaults: {
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
        elvui: [ // having this section will enable elvui updates (or not)
          137, // floating combat text
          38, // shadow and light
          3, // addon skins
        ],
      },
    },
  });

  if (
    config.get("realpath") ===
      "/home/user/Games/world-of-warcraft/drive_c/Program Files (x86)/World of Warcraft/_retail_/Interface/AddOns" &&
    config.get("tmp") !== "./foobar"
  ) {
    log.info("We have detected that this is your first usage.");
    log.info(`Please edit ${chalk.yellow(config.path)} to match your needs.`);
    process.exit(1);
  }
  try {
    const cfg = {
      ...config.store,
      tmp: join(dirname(config.path), config.get("tmp")),
    };

    if (!existsSync(cfg.tmp)) await mkdir(cfg.tmp);

    return puppeteer.launch({ headless: !cfg.debug }).then(async (browser) => {
      const curseLogic = async (b, name) => {
        const wait = async (f, m) => {
          const start = moment();
          while (moment().diff(start, "ms") < cfg.timeout) {
            if (existsSync(f)) {
              const md5 = await md5File(f);
              if (md5 === m) {
                return true;
              }
            }
            await delay(cfg.polling);
          }
        };

        log.info("downloading", name);

        const page = await b.newPage();
        await page._client.send("Page.setDownloadBehavior", {
          behavior: "allow",
          downloadPath: cfg.tmp,
        });
        await page.goto(`https://www.curseforge.com/wow/addons/${name}/files`);

        await delay(cfg.waitAfterNavig);
        const filepath = await page.$eval(
          "div.flex-row:nth-child(1) > span:nth-child(2)",
          (x) => x.innerText
        );
        const md5 = await page.$eval(
          "div.flex:nth-child(7) > span:nth-child(2)",
          (x) => x.innerText
        );
        await Promise.all([
          page.$eval(
            "article.box > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > a:nth-child(1)",
            (x) => x.click()
          ),
          wait(`${cfg.tmp}/${filepath}`, md5),
        ]).catch((err) => log.error(name, err));

        log.info("extracting", name);

        await new Promise((resolve, reject) =>
          createReadStream(`${cfg.tmp}/${filepath}`)
            .pipe(unzipper.Extract({ path: cfg.realpath }))
            .on("close", (err) => (err ? reject(err) : resolve()))
        );

        log.info("finished", name);
        await page.close();
        return true;
      };

      const elvuiLogic = async (b, name = "elvui") => {
        const wait = async (f, m) => {
          const start = moment();
          let size;

          while (moment().diff(start, "ms") < cfg.timeout) {
            if (m === "elvui") {
              [f] = await glob(`${cfg.tmp}\-elvui/elvui-*.zip`);
              cfg.debug && log.debug(f);
            } else {
              [f] = await glob(`${cfg.tmp}\-${name}/*.zip`);
              cfg.debug && log.debug(f);
            }
            if (existsSync(f)) {
              if (size && size !== 0 && size === statSync(f).size) return f;
              size = statSync(f).size;
              cfg.debug && log.debug(name, "size", size);
            }
            cfg.debug && log.debug(name, "waiting", cfg.polling, "ms");
            await delay(cfg.polling);
          }

          throw new Error("this shouldnt happen");
        };

        log.info("downloading", name);

        const page = await b.newPage();
        await page._client.send("Page.setDownloadBehavior", {
          behavior: "allow",
          downloadPath: `${cfg.tmp}\-${name}`,
        });

        if (name === "elvui") {
          await page.goto("https://www.tukui.org/download.php?ui=elvui");
        }

        if (Number.isInteger(name)) {
          cfg.debug && log.debug(`https://www.tukui.org/addons.php?id=${name}`);
          await page.goto(`https://www.tukui.org/addons.php?id=${name}`);
        }

        await delay(cfg.waitAfterNavig);

        let hm;
        if (name === "elvui") {
          [_, hm] = await Promise.all([
            page.$eval("#download > div > div > a", (x) => x.click()),
            wait("", name),
          ]);
        } else {
          [_, hm] = await Promise.all([
            page.$eval("div.col-md-3:nth-child(3) > a:nth-child(1)", (x) =>
              x.click()
            ),
            wait("", name),
          ]).catch((err) => log.error(name, err));
        }
        log.info("extracting", name, hm);

        await new Promise((resolve, reject) =>
          createReadStream(hm)
            .pipe(unzipper.Extract({ path: cfg.realpath }))
            .on("close", (err) => (err ? reject(err) : resolve()))
        );

        log.info("finished", name);
        return page.close();
      };

      await Promise.map(
        cfg.addons.curse,
        (addon) => curseLogic(browser, addon),
        {
          concurrency: 2,
        }
      );

      if (cfg.addons.elvui) {
        await Promise.map(
          ["elvui", ...cfg.addons.elvui],
          (addon) => elvuiLogic(browser, addon),
          {
            concurrency: 1, // WARN: chrome "page" set download really is on instance level
          }
        );
      }

      await browser.close();
      const tmps = await glob(`${cfg.tmp}\*`);
      return Promise.map(tmps, async (d) => rmdir(d, { recursive: true }));
    });
  } catch (err) {
    !cfg.debug && log.err("There was an error. Try enabling debug mode.");
    cfg.debug && log.debug(tmps);
    cfg.debug && log.err(err);
    cfg.debug && log.debug(err.trace);
    process.exit(1);
  }
};

main();
