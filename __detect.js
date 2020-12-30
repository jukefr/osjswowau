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
  try {
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
  } catch (err) {
    // eh
  }
};

const tocParser = (filePath) => {
  let toc = {};
  const contents = readFileSync(filePath, "utf-8");
  for (const line of contents.split(/\r?\n/)) {
    if (line.startsWith("## ") && !line.endsWith("##")) {
      const [keyRaw, ...valueRaw] = line.split(":");
      const key = keyRaw.replace("## ", "").trim();
      const value = valueRaw.join(":").replace(/\r?\n/, "").trim();
      toc = {
        ...toc,
        tocpath: filePath,
        [key]: value,
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
        if (toc) {
          tocs = {
            ...tocs,
            ...tocParser(toc),
          };
        }
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
    if (Object.prototype.hasOwnProperty.call(addons, addon) && !addons[addon].detected) {
      switch (addons[addon].osjswowau.type) {
        case "wowinterface":
          config.set("addons.wowinterface", [
            ...new Set([...config.get("addons.wowinterface"), addons[addon].osjswowau.uid]),
          ]);
          break;
        case "curse":
          config.set("addons.curse", [...new Set([...config.get("addons.curse"), addons[addon].osjswowau.uid])]);
          break;
        case "tsm":
          config.set("addons.tsm", true);
          break;
        case "tukui":
          switch (addons[addon].osjswowau.uid) {
            case "elvui":
              config.set("addons.tukui.elvui", true);
              break;
            case "tukui":
              config.set("addons.tukui.tukui", true);
              break;
            default:
              config.set("addons.tukui.addons", [
                ...new Set([...config.get("addons.tukui.addons"), `${addons[addon].osjswowau.uid || ""}`]),
              ]);
          }
          break;
        default:
        // throw new Error("Tried to update config for a not found type of addon.");
      }
      const { type, uid, tocname, id, ...rest } = addons[addon].osjswowau;
      config.set(`detected.${type}.${uid}.${tocname}`, {
        ...config.get(`detected.${type}.${uid}.${tocname}`),
        ...rest,
      });
      if (id) config.set(`detected.${type}.${uid}._id`, id);
      if (config.get(`detected.${type}.${uid}._version`) || addons[addon].Version)
        config.set(
          `detected.${type}.${uid}._version`,
          config.get(`detected.${type}.${uid}._version`) || addons[addon].Version
        ); // seed with toc values
      config.set(`detected.${type}.${uid}._paths`, [
        ...new Set([...(config.get(`detected.${type}.${uid}._paths`) || []), addons[addon].tocpath]),
      ]); // seed with toc values
    }
  }
};

const getName = async (page, type, id) => {
  switch (type) {
    case "wowinterface":
      await page.goto(
        `https://duckduckgo.com/?q=world+of+warcraft+site%3Awww.wowinterface.com+inurl%3Adownloads%2Finfo${id}&t=h_&ia=web`
      );
      break;
    case "curse":
      await page.goto(
        `https://duckduckgo.com/?q=files+project+id+${id}+site%3Awww.curseforge.com+inurl%3Awow%2Faddons%2F+-umt_content&t=h_&ia=web`
      );
      break;
    default:
      throw new Error("Bad type passed to get uid function.");
  }
  await page.waitForSelector(".result__a");
  const result = await page.$(".result__a");
  const url = await (await result.getProperty("href")).jsonValue();

  if (!url) throw new Error("The resolved url was empty.");

  switch (type) {
    case "wowinterface":
      return `${id}-${url.split(`info${id}-`)[1].replace(".html", "")}`;
    case "curse":
      return url.split(`wow/addons/`)[1].split("/")[0].split("?")[0].toLowerCase(); // curse project name is case insensitive
    default:
      throw new Error("Bad type passed to get uid function.");
  }
};

const detectLogic = async (config, Cluster, puppeteer, revisionInfo, debug, testing) => {
  if (!config.get("addonPath")) {
    // windows
    if (process.platform === "win32") {
      // start with homedir
      await detectAddonsPath(homedir(), ["\\Windows", "\\Temp", "\\PerfLogs", "\\System Volume Information", "\\$Recycle.Bin", "\\Program Files\\WindowsApps"]);
      // then drives in general
      const drives = await listWindowsDrives();
      await Promise.all(drives.map((drive) => detectAddonsPath(drive, ["\\Windows", "\\Temp", "\\PerfLogs", "\\System Volume Information", "\\$Recycle.Bin", "\\Program Files\\WindowsApps"])));
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

  await cluster.task(async ({ page, data: { type, value, tocname } }) => {
    await page.setDefaultNavigationTimeout(config.get("timeout"));
    await page.setDefaultTimeout(config.get("timeout"));

    if (debug) console.log("getting addon name task", chalk.bold(chalk.yellow(value, type)));

    let foundUid;
    if (type === "curse") {
      foundUid = await getName(page, "curse", value);
    }
    if (type === "wowinterface") {
      foundUid = await getName(page, "wowinterface", value);
    }

    if (foundUid) {
      return {
        type,
        uid: foundUid,
        tocname,
        id: value,
      };
    }

    throw new Error("Something went wrong with the find name cluster task.");
  });

  const tocs = await getAddonTocs(config.get("addonPath"));
  const augmented = {};
  const nomatch = {};
  for (const toc in tocs) {
    // this is beautiful...
    if (Object.prototype.hasOwnProperty.call(tocs, toc)) {
      const check = () => {
        if (Object.keys(config.get("detected")).length !== 0) {
          const detected = config.get("detected");
          for (const [type, typeValues] of Object.entries(detected)) {
            if (Object.keys(typeValues).length !== 0) {
              for (const [uid, uidValues] of Object.entries(typeValues)) {
                if (Object.keys(uidValues).length !== 0) {
                  for (const [tocname] of Object.entries(uidValues)) {
                    if (toc === tocname) {
                      return {
                        type,
                        uid,
                        tocname,
                      };
                    }
                  }
                }
              }
            }
          }
        }
        return false;
      };
      const isInConf = check();
      if (isInConf) {
        augmented[isInConf.tocname] = {
          ...tocs[toc],
          osjswowau: isInConf,
          detected: true,
        };
      } else if (tocs[toc]["X-Curse-Project-ID"]) {
        const osjswowau = await cluster.execute({
          type: "curse",
          value: tocs[toc]["X-Curse-Project-ID"],
          toc: tocs[toc],
          tocname: toc,
          config,
        });
        augmented[osjswowau.tocname] = {
          ...tocs[toc],
          osjswowau,
        };
      } else if (tocs[toc]["X-WoWI-ID"]) {
        const osjswowau = await cluster.execute({
          type: "wowinterface",
          value: tocs[toc]["X-WoWI-ID"],
          toc: tocs[toc],
          tocname: toc,
          config,
        });
        augmented[osjswowau.tocname] = {
          ...tocs[toc],
          osjswowau,
        };
      } else if (tocs[toc]["X-Tukui-ProjectID"]) {
        const value = tocs[toc]["X-Tukui-ProjectID"];
        let uid;
        if (value === "-2") uid = "elvui";
        else if (value === "-1") uid = "tukui";
        else uid = value;
        const osjswowau = { type: "tukui", uid, tocname: toc };
        augmented[osjswowau.tocname] = {
          ...tocs[toc],
          osjswowau,
        };
      } else if (tocs[toc].Title.includes("TradeSkillMaster")) {
        const osjswowau = { type: "tsm", uid: "tsm", tocname: toc };
        augmented[osjswowau.tocname] = {
          ...tocs[toc],
          osjswowau,
        };
      } else if (database[toc]) {
        if (isContainedIn(database[toc].matches, tocs[toc])) {
          const { gives } = database[toc];
          const type = Object.keys(gives)[0];
          const uid = gives[type];
          const osjswowau = { type, uid, tocname: toc };
          augmented[osjswowau.tocname] = {
            ...tocs[toc],
            osjswowau,
          };
        }
      } else nomatch[toc] = tocs[toc]; // not matched against anything
    }
  }

  await cluster.idle();
  updateConf(config, augmented);

  if (augmented) {
    console.log();
    console.log(chalk.bold(`Tracked addons :`));
    const list = [];
    const uidMap = {};
    let uids = [];
    for (const [tocname, addon] of Object.entries(augmented)) {
      // we usually only want the first result
      if (!uidMap[addon.osjswowau.uid])
        uidMap[addon.osjswowau.uid] = { tocname, uid: addon.osjswowau.uid, type: addon.osjswowau.type };
      uids = [...uids, addon.osjswowau.uid].map((x) => `${x}`);
    }
    for (const [uid, values] of Object.entries(uidMap)) {
      list.push(` - (${values.type}) ${chalk.green(chalk.bold(values.tocname))} [${chalk.italic(uid)}]`);
    }
    const curse = config.get("addons.curse").filter((x) => !uids.includes(x));
    const wowinterface = config.get("addons.wowinterface").filter((x) => !uids.includes(x));
    const tukui = [
      ...config.get("addons.tukui.addons").filter((x) => !uids.includes(x)),
      ...(config.get("addons.tukui.tukui") ? ["tukui"] : []).filter((x) => !uids.includes(x)),
      ...(config.get("addons.tukui.elvui") ? ["elvui"] : []).filter((x) => !uids.includes(x)),
    ];
    const tsm = (config.get("addons.tsm") ? ["tsm"] : []).filter((x) => !uids.includes(x));
    list.push(...curse.map((addon) => ` - (curse) ${chalk.yellow(chalk.bold(addon))}`));
    list.push(...wowinterface.map((addon) => ` - (wowinterface) ${chalk.yellow(chalk.bold(addon))}`));
    list.push(...tukui.map((addon) => ` - (tukui) ${chalk.yellow(chalk.bold(addon))}`));
    list.push(...tsm.map((addon) => ` - (tsm) ${chalk.yellow(chalk.bold(addon))}`));

    list.map((addon) => console.log(addon));

    const groupedNoMatches = {}; // used to guess what is relevant to show to user
    for (const [tocname] of Object.entries(augmented)) {
      Object.keys(nomatch)
        .filter((toc) => toc.includes(tocname))
        .forEach((v) => {
          groupedNoMatches[v] = tocname;
        });
    }

    const notFound = Object.entries(nomatch).filter(([k]) => !groupedNoMatches[k]);

    if (Object.keys(notFound).length !== 0) {
      console.log(chalk.bold("The following addons are either not supported yet, or this is your first run."));
      console.log(chalk.bold("You can manually specify addons in the configuration file."));
      notFound.forEach(([key]) => console.log(` - ${chalk.red(chalk.bold(key))}`));
    }

    console.log();
  }

  await cluster.close();

  return augmented;
};

module.exports = {
  detectLogic,
  getAddonTocs,
};
