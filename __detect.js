const { existsSync, accessSync, constants, readFileSync } = require("fs");
const { homedir } = require("os");
const { promisify } = require("util");
const exec = promisify(require("child_process").exec);
const { join } = require("path");
const { resolve, basename } = require("path");
const { readdir } = require("fs").promises;
const chalk = require("chalk");
const database = require("./__database");
require("events").EventEmitter.defaultMaxListeners = 25;

// thats probably not a good practice at all but eh..... it works ?
let wasDetected = false;
let detectedAddonPath;

const listWindowsDrives = () =>
  exec("wmic logicaldisk get name").then(({ stdout }) =>
    stdout
      .split("\r\r\n")
      .filter((value) => /[A-Za-z]:/.test(value))
      .map((value) => value.trim())
      .filter((drive) => existsSync(`${drive}\\`))
      .map((drive) => `${drive}\\`)
  );

const detectAddonsPath = async (dir, ignores = []) => {
  if (wasDetected) return detectedAddonPath;
  return readdir(dir, { withFileTypes: true }).then((dirents) =>
    Promise.all(
      dirents.reduce((ac, dirent) => {
        if (wasDetected) return detectedAddonPath;
        const res = resolve(dir, dirent.name);
        if (res.includes(join("Interface", "AddOns"))) {
          ac.push(res);
          detectedAddonPath = res;
          wasDetected = true;
          return ac;
        }
        if (existsSync(res)) {
          try {
            accessSync(res, constants.R_OK);
            if (dirent.isDirectory()) {
              if (ignores.reduce((a, ignore) => !res.includes(ignore) && a, true)) {
                ac.push(detectAddonsPath(res));
                return ac;
              }
            }
          } catch (err) {
            return ac;
          }
        }
        return ac;
      }, [])
    )
  );
};

const tocParser = (filePath) => {
  let toc = {};
  const contents = readFileSync(filePath, "utf-8");
  for (const line of contents.split("\n")) {
    if (line.startsWith("## ") && !line.endsWith("##\r")) {
      toc = {
        ...toc,
        [line.split(":")[0].replace("## ", "")]: line.split(":")[1].trim().replace("\r", ""),
      };
    }
  }
  return { [basename(filePath).replace(".toc", "")]: toc };
};

const getAddonTocs = async (addonPath) => {
  if (existsSync(addonPath)) {
    const dirents = await readdir(addonPath, { withFileTypes: true });
    let tocs = {};
    for (const dirent of dirents) {
      if (dirent.isDirectory()) {
        const addonFullPath = resolve(addonPath, dirent.name);
        const contents = await readdir(addonFullPath, { withFileTypes: true });
        const [toc] = contents
          .map((entry) => entry.name)
          .filter((entry) => entry.endsWith(".toc"))
          .map((entry) => resolve(addonFullPath, entry));
        tocs = {
          ...tocs,
          ...tocParser(toc),
        };
      }
    }
    return tocs;
  }
  return {};
};

const isContainedIn = (a, b) => {
  // yoinked from so :3
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    let i = 0;
    let j = 0;
    const la = a.length;
    const lb = b.length;
    for (i, j, la, lb; i < la && j < lb; j += 1) if (isContainedIn(a[i], b[j])) i += 1;
    return i === la;
  }
  if (Object(a) === a) {
    for (const p in a) {
      if (Object.prototype.hasOwnProperty.call(a, p)) {
        if (!(p in b && isContainedIn(a[p], b[p]))) return false;
      }
    }
    return true;
  }
  return a === b;
};

const updateConf = (config, addons) => {
  for (const addon in addons) {
    if (Object.prototype.hasOwnProperty.call(addons, addon)) {
      switch (Object.keys(addons[addon])[0]) {
        case "wowinterface":
          config.set("addons.wowinterface", [
            ...new Set([...config.get("addons.wowinterface"), addons[addon].wowinterface]),
          ]);
          break;
        case "curse":
          config.set("addons.curse", [...new Set([...config.get("addons.curse"), addons[addon].curse])]);
          break;
        case "tsm":
          config.set("addons.tsm", true);
          break;
        case "tukui":
          switch (addons[addon].tukui) {
            case -2:
              config.set("addons.tukui.elvui", true);
              break;
            case -1:
              config.set("addons.tukui.tukui", true);
              break;
            default:
              config.set("addons.tukui.addons", [
                ...new Set([...config.get("addons.tukui.addons"), addons[addon].tukui]),
              ]);
          }
          break;
        default:
          // console.log(addon, addons[addon], Object.keys(addons[addon])[0])
          throw new Error("This should not happen... I made a code mistake somewhere probably...");
      }
    }
  }
};

const getWowinterfaceName = async (page, id) => {
  await page.goto(
    `https://duckduckgo.com/?q=world+of+warcraft+site%3Awww.wowinterface.com+inurl%3Adownloads%2Finfo${id}&t=h_&ia=web`
  );
  await page.waitForSelector(".result__a");
  const foo = await page.$$(".result__a");
  for (let i = 0; i < foo.length; i += 1) {
    const hmm = await (await foo[i].getProperty("href")).jsonValue();
    const noom = hmm.split(`info${id}-`)[1].replace(".html", "");
    const containsLetters = /[a-zA-Z]/g;
    if (containsLetters.test(noom)) {
      return `${id}-${noom}`;
    }
  }
  return undefined;
};

const getCurseName = async (page, id) => {
  await page.goto(
    `https://duckduckgo.com/?q=files+project+id+${id}+site%3Awww.curseforge.com+inurl%3Awow%2Faddons%2F&t=h_&ia=web`
  );
  await page.waitForSelector(".result__a");
  const foo = await page.$$(".result__a");
  for (let i = 0; i < foo.length; i += 1) {
    const hmm = await (await foo[i].getProperty("href")).jsonValue();
    const noom = hmm.split(`wow/addons/`)[1].split("/")[0];
    const containsLetters = /[a-zA-Z]/g;
    if (containsLetters.test(noom)) {
      return noom;
    }
  }
  return undefined;
};

const detectLogic = async (config, Cluster, puppeteer, revisionInfo, debug, testing) => {
  if (!config.get("addonPath")) {
    // windows
    if (process.platform.includes("win")) {
      // start with homedir
      await detectAddonsPath(homedir(), ['\\Windows']);
      // then drives in general
      const drives = await listWindowsDrives();
      await Promise.all(drives.map((drive) => detectAddonsPath(drive, ['\\Windows'])));
    }

    // macos
    if (process.platform === "darwin") {
      // start with homedir
      await detectAddonsPath(homedir());
      // then applications
      await detectAddonsPath("/Applications");
      // then drive
      await detectAddonsPath("/", ["/proc", "/sys", "/dev"]);
    }

    // linux
    if (process.platform === "linux") {
      // start with homedir
      await detectAddonsPath(homedir());
      // then current drive
      await detectAddonsPath("/", ["/run", "/proc", "/sys", "/media", "/dev", "/mnt", "/mount"]);
      // then other drives
      await detectAddonsPath("/", ["/proc", "/sys", "/dev"]);
    }

    if (!detectedAddonPath) throw new Error("Could not find your addon path, please set it manually.");

    if (!testing) console.log(chalk.green("detected addon path"), detectedAddonPath);
    if (!testing) config.set("addonPath", detectedAddonPath);
    if (testing) detectedAddonPath = config.get("addonPath");
  }

  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_PAGE,
    maxConcurrency: 2, // you can get limited quite fast so we take it easy
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
    if (debug) console.log("getting addon name task", chalk.bold(chalk.yellow(value, type)));
    if (type === "curse") {
      const name = await getCurseName(page, value);
      return {
        [type]: name,
      };
    }
    if (type === "wowinterface") {
      const name = await getWowinterfaceName(page, value);
      return {
        [type]: name,
      };
    }
    return undefined;
  });

  const tocs = await getAddonTocs(config.get("addonPath"));
  const detectedAddons = {};
  for (const toc in tocs) {
    if (Object.prototype.hasOwnProperty.call(tocs, toc)) {
      if (tocs[toc]["X-Curse-Project-ID"]) {
        detectedAddons[toc] = await cluster.execute({ type: "curse", value: tocs[toc]["X-Curse-Project-ID"] });
      } else if (tocs[toc]["X-WoWI-ID"]) {
        detectedAddons[toc] = await cluster.execute({ type: "wowinterface", value: tocs[toc]["X-WoWI-ID"] });
      } else if (tocs[toc]["X-Tukui-ProjectID"]) {
        detectedAddons[toc] = { tukui: Number(tocs[toc]["X-Tukui-ProjectID"]) };
      } else if (database[toc]) {
        if (isContainedIn(database[toc].matches, tocs[toc])) {
          detectedAddons[toc] = database[toc].gives;
        }
      } else if (debug) console.log(toc, tocs[toc]); // not matched against anything
    }
  }

  await cluster.idle();
  updateConf(config, detectedAddons);

  if (detectedAddons) console.log("The following addons were automatically detected :");
  if (detectedAddons) Object.keys(detectedAddons).map((addon) => ` - ${chalk.green(addon)}`);
  if (detectedAddons)
    console.log(chalk.bold("You can still manually edit the config it will also update your additions."));
  if (detectedAddons) console.log();

  return cluster.close();
}

module.exports = {
  detectLogic,
};
