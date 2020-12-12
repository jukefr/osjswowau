const chalk = require("chalk");
const { createReadStream, rmdirSync, unlinkSync } = require("fs");
const glob = require("glob-promise");
const https = require("https");
const unzipper = require("unzipper");
const { join, dirname } = require("path");
const { BadOsError } = require("./__errors");

const createBar = (mb, name) => mb.create(4, 0, { filename: `opening ${chalk.bold(chalk.green(name))}` });

const deleteFile = (path) => unlinkSync(path);

// TODO: find an automatic way to do this....
const getChromiumRevision = (p) => {
  if (p === "linux") return "812859";
  if (p === "mac") return "812851";
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

const deleteTmpDirs = async (tmp) => {
  const tmps = await glob(`${tmp}-*`);
  const queue = tmps.map((t) => rmdirSync(t, { recursive: true }));
  return Promise.all(queue);
};

const extractFile = (config, filename) =>
  new Promise((resolve, reject) =>
    createReadStream(filename)
      .on("error", (err) => reject(err))
      .pipe(unzipper.Extract({ path: config.get("addonPath") }))
      .on("close", (err) => (err ? reject(err) : resolve()))
      .on("error", (err) => reject(err))
  );

module.exports = {
  getChromium,
  getLatestVersion,
  deleteTmpDirs,
  deleteFile,
  extractFile,
  createBar,
};
