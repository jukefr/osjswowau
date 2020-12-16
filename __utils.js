const chalk = require("chalk");
const { createReadStream, unlinkSync, readFileSync, createWriteStream, mkdirSync, existsSync } = require("fs");
const https = require("https");
const unzipper = require("unzipper");
const { join, dirname, basename } = require("path");
const rimraf = require("rimraf");
const { createHash } = require("crypto");
const { BadOsError } = require("./__errors");

const md5File = (filepath) => {
  const buffer = readFileSync(filepath);
  const sum = createHash("md5");
  sum.update(buffer);
  return sum.digest("hex");
};

const createBar = (mb, name) => mb.create(4, 0, { filename: ` - opening ${chalk.bold(chalk.green(name))}` });

const deleteFile = (path) => unlinkSync(path);

const deleteFolder = (folder) =>
  new Promise((resolve, reject) => {
    rimraf(folder, (er) => (er ? reject(er) : resolve()));
  });

// TODO: find an automatic way to do this....
const getChromiumRevision = (p) => {
  if (p === "linux") return "812859";
  if (p === "darwin") return "812851";
  if (p === "win64" || p === "win32") return "812899";
  throw new BadOsError();
};
const getChromium = (config, puppeteer, multibar, debug) => {
  let chromiumBar;
  const revision = getChromiumRevision(process.platform);
  const browserFetcher = puppeteer.createBrowserFetcher({
    path: join(dirname(config.path), `chromium-${revision}`),
  });

  return browserFetcher.download(revision, (transferred, total) => {
    if (!debug) {
      if (!chromiumBar) {
        chromiumBar = multibar.create(total, 0, {
          filename: `downloading ${chalk.green(chalk.bold(`chromium-${revision}`))} `,
        });
        return null;
      }
      return chromiumBar.update(transferred, {
        filename: `downloading ${chalk.green(chalk.bold(`chromium-${revision}`))} (${(
          (transferred / total) *
          100
        ).toFixed(2)}% downloaded)`,
      });
    }
    return null;
  });
};

const getLatestVersion = async () =>
  new Promise((resolve, reject) =>
    https
      .get(
        "https://api.github.com/repos/jukefr/osjswowau/tags",
        {
          headers: { "User-Agent": "Mozilla/5.0" },
        },
        (resp) => {
          let data = "";

          resp.on("data", (chunk) => {
            data += chunk;
          });

          resp.on("end", () => resolve(JSON.parse(data)[0]));
        }
      )
      .on("error", (err) => reject(err))
  );

const deleteTmpDirs = async (tmp) => deleteFolder(`${tmp}*`);

const makeSurePathExists = (addonPath, zippedPath) => {
  if (!existsSync(addonPath)) mkdirSync(addonPath);
  const directories = dirname(zippedPath).split("/");
  let currentPath = join(addonPath);
  for (const directory of directories) {
    currentPath = join(currentPath, directory);
    if (!existsSync(currentPath)) mkdirSync(currentPath);
  }
};

const extractFile = (config, filename, type, name, version, id) =>
  new Promise((resolve, reject) =>
    createReadStream(filename)
      .on("error", (err) => reject(err))
      .pipe(unzipper.Parse())
      .on("error", (err) => reject(err))
      .on("entry", (entry) => {
        const addonPath = config.get("addonPath");
        const path = join(addonPath, entry.path);
        makeSurePathExists(addonPath, entry.path);
        if (entry.type === "File") {
          const depth = entry.path.split("/").length;
          entry
            .pipe(createWriteStream(path))
            .on("close", (err) => {
              if (err) reject(err);
              if (path.endsWith(".toc")) {
                if (depth === 2) {
                  const tocname = basename(path).replace(".toc", "");
                  config.set(`detected.${type}.${name}.${tocname}`, {});
                  config.set(`detected.${type}.${name}._version`, version);
                  config.set(`detected.${type}.${name}._id`, id);
                }
              }
            })
            .on("error", (err) => reject(err));
        } else {
          entry.autodrain(); // should not happen we just want to extract everything
        }
      })
      .on("close", (err) => (err ? reject(err) : resolve()))
  );

module.exports = {
  md5File,
  getChromiumRevision,
  getChromium,
  getLatestVersion,
  deleteTmpDirs,
  deleteFile,
  extractFile,
  createBar,
  deleteFolder,
};
