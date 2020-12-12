const { existsSync, createReadStream, statSync } = require("fs");
const unzipper = require("unzipper");
const glob = require("glob-promise");
const { basename } = require("path");
const chalk = require("chalk");
const { delay, deleteFile, WaitTimeoutError } = require("./_utils");

const wowinterfaceLogic = async (page, name = "tukui", bar, cfg) => {
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
    throw new WaitTimeoutError();
  };

  if (bar) bar.update(1, { filename: `downloading ${chalk.green(name)}` });

  await page._client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: `${cfg.tmp}-${name}`,
  });

  switch (name) {
    default:
      await page.goto(`https://www.wowinterface.com/downloads/download${name}`);
  }
  await delay(cfg.delay);

  const filename = await wait(null, name);

  if (bar) bar.update(2, { filename: `extracting ${chalk.green(basename(filename))}` });

  await new Promise((resolve, reject) =>
    createReadStream(filename)
      .on("error", (err) => reject(err))
      .pipe(unzipper.Extract({ path: cfg.addonPath }))
      .on("close", (err) => (err ? reject(err) : resolve()))
      .on("error", (err) => reject(err))
  );

  if (bar) bar.update(3, { filename: `deleting ${chalk.green(basename(filename))}` });
  await deleteFile(filename);
  return page.close();
};

module.exports = {
  wowinterfaceLogic,
};
