const { existsSync, accessSync, constants, readFileSync } = require("fs");
const { homedir } = require("os");
const { promisify } = require("util");
const exec = promisify(require("child_process").exec);
const { join } = require("path");
const { resolve, basename } = require("path");
const { readdir } = require("fs").promises;
const chalk = require("chalk");
const database = require("./__database");
require('events').EventEmitter.defaultMaxListeners = 50;

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
              if (ignores.reduce((a, ignore) => !res.startsWith(ignore) && a, true)) {
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
    if (line.startsWith("## ")) {
      toc = {
        ...toc,
        [line.split(":")[0].replace("## ", "")]: line.split(":")[1].trim().replace("\r", ""),
      };
    }
  }
  return { [basename(filePath).replace(".toc", "")]: toc };
};

const getAddonTocs = async (addonPath) => {
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
};

const isContainedIn = (a, b) => {
  // yoink
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    // assuming same order at least
    let i = 0;
    let j = 0;
    const la = a.length;
    const lb = b.length;
    for (i, j, la, lb; i < la && j < lb; j += 1) if (isContainedIn(a[i], b[j])) i += 1;
    return i === la;
  }
  if (Object(a) === a) {
    for (const p in a) if (!(p in b && isContainedIn(a[p], b[p]))) return false;
    return true;
  }
  return a === b;
};

const updateConf = (config, addons) => {
  for (const addon in addons) {
    switch (Object.keys(addons[addon])[0]) {
      case "wowinterface":
        config.set("addons.wowinterface", [...new Set([...config.get("addons.wowinterface"), addons[addon].wowinterface])]);
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
          default:
            config.set("addons.tukui.addons", [...new Set([...config.get("addons.tukui.addons"), addons[addon].tukui])]);
        }
        break;
      default:
        throw new Error("This should not happen...");
    }
  }
};

const getWowinterfaceName = async (page, id) => {
  await page.goto(`https://www.google.com/search?q=download${id}-&as_sitesearch=www.wowinterface.com`);
  await page.waitForSelector("#rso a");
  const test = await page.$("#rso a");
  const url = await (await test.getProperty("href")).jsonValue();
  return basename(url).replace("download", "");
};

const getCurseName = async (page, id) => {
  await page.goto(`https://www.google.com/search?q=files+project+id+${id}&as_sitesearch=www.curseforge.com`);
  await page.waitForSelector("#rso a");
  const test = await page.$("#rso a");
  const url = await (await test.getProperty("href")).jsonValue();
  const value = url.replace("https://www.curseforge.com/wow/addons/", "").split("/")[0];
  if (value === 'https://') return undefined
  return value
};

const detectLogic = async (config, Cluster, puppeteer, revisionInfo, debug) => {
  if (!config.get("detectedAddonPath")) {
    // windows
    if (process.platform.includes("win")) {
      // start with homedir
      await detectAddonsPath(homedir());
      // then drives in general
      const drives = await listWindowsDrives();
      await Promise.all(drives.map((drive) => detectAddonsPath(drive)));
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
    console.log(chalk.green("detected addon path"), detectedAddonPath);
    config.set("detectedAddonPath", detectedAddonPath);
  }

  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_BROWSER,
    maxConcurrency: 3,
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

  const store = []

  await cluster.task(async ({ page, data: { type, value } }) => {
    await page.setDefaultNavigationTimeout(config.get("timeout"));
    await page.setDefaultTimeout(config.get("timeout"));
    if (debug) console.log("getting addon name task", chalk.bold(chalk.yellow(value, type)));
    if (type === "curse") {
      const name = await getCurseName(page, value);
      store.push({
        type,
        name
      })
    }
    if (type === "wowinterface") {
      const name = await getWowinterfaceName(page, value);
      store.push({
        type,
        name
      })
    }
  });

  const tocs = await getAddonTocs(detectedAddonPath || config.get("detectedAddonPath"));
  const detectedAddons = {};
  for (const toc in tocs) {
    if (tocs[toc]["X-Curse-Project-ID"]) {
      cluster.queue({type: 'curse', value: tocs[toc]["X-Curse-Project-ID"]})
    } else if (tocs[toc]["X-WoWI-ID"]) {
      cluster.queue({type: 'wowinterface', value: tocs[toc]["X-WoWI-ID"]})
    } else {
      console.log(toc)
      if (database[toc]) {
        if (isContainedIn(database[toc].matches, tocs[toc])) {
          detectedAddons[toc] = database[toc].gives;
        }
      } else {
        // not in db
      }
    }

  }

  updateConf(config, detectedAddons);

  await cluster.idle();

  for (const addon of store) {
    switch (addon.type){
      case 'curse':
        config.set("addons.curse", [...new Set([...config.get("addons.curse"), addon.name])]);
        break
      case 'wowinterface':
        config.set("addons.wowinterface", [...new Set([...config.get("addons.wowinterface"), addon.name])]);
        break
      default:
        throw new Error('shouldnt happen')
    }
  }

  console.log("The following addons were detected.");
  console.log("They will be automatically updated from now on.");
  Object.keys(detectedAddons).map((addon) => console.log(` - ${chalk.green(addon)}`));

};

module.exports = {
  detectLogic,
};
