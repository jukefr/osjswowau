const { existsSync, createReadStream, statSync } = require("fs");
const unzipper = require("unzipper");
const glob = require("glob-promise");
const chalk = require("chalk");
const { basename } = require("path");
const { delay, deleteFile } = require("./_utils");

const tukuiLogic = async (page, name = "tukui", bar, cfg) => {
  const wait = async (f, m) => {
    const start = Date.now();
    let size;

    while (Date.now() - start < cfg.timeout) {
      const [fname] = await glob(`${cfg.tmp}-${m}/*.zip`);
      if (existsSync(fname)) {
        if (size && size !== 0 && size === statSync(fname).size) return fname;
        size = statSync(fname).size;
      }
      await delay(cfg.polling);
    }
    return null;
  };

  if (bar) bar.update(1, { filename: `downloading ${chalk.green(name)}` });

  await page._client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: `${cfg.tmp}-${name}`,
  });

  switch (name) {
    case "elvui":
      await page.goto("https://www.tukui.org/download.php?ui=elvui", {
        waitUntil: "networkidle2",
      });
      break;
    case "tukui":
      await page.goto("https://www.tukui.org/download.php?ui=tukui", {
        waitUntil: "networkidle2",
      });
      break;
    default:
      await page.goto(`https://www.tukui.org/addons.php?id=${name}`, {
        waitUntil: "networkidle2",
      });
  }
  await delay(cfg.delay);

  switch (name) {
    case "tukui":
    case "elvui":
      await page.click("#download > div > div > a");
      break;
    default:
      await page.click("div.col-md-3:nth-child(3) > a:nth-child(1)");
  }

  const filename = await wait(null, name);

  if (bar) bar.update(2, { filename: `extracting ${chalk.green(basename(filename))}` });

  await new Promise((resolve, reject) =>
    createReadStream(filename)
      .on("close", (err) => (err ? reject(err) : resolve()))
      .on("error", (err) => (err ? reject(err) : resolve()))
      .pipe(unzipper.Extract({ path: cfg.addonPath }))
      .on("close", (err) => (err ? reject(err) : resolve()))
      .on("error", (err) => (err ? reject(err) : resolve()))
  );

  if (bar) bar.update(3, { filename: `deleting ${chalk.green(basename(filename))}` });
  await deleteFile(filename);
  return page.close();
};

module.exports = {
  tukuiLogic,
};
