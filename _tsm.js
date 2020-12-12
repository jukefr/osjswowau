const { existsSync, createReadStream, statSync } = require("fs");
const unzipper = require("unzipper");
const glob = require("glob-promise");
const { basename } = require("path");
const { delay, deleteFile } = require("./_utils");

const tsmLogic = async (page, name = "tsm", bar, cfg) => {
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

  if (bar) bar.update(1, { filename: name });

  await page._client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: `${cfg.tmp}-${name}`,
  });

  await page.goto("https://www.tradeskillmaster.com/install");

  await delay(cfg.delay);

  let filename;
  if (name === "tsm") {
    [, filename] = await Promise.all([page.click("div.col-sm-6:nth-child(1) > a:nth-child(2)"), wait(null, name)]);
  } else {
    [, filename] = await Promise.all([page.click("div.col-sm-6:nth-child(1) > a:nth-child(5)"), wait(null, name)]);
  }
  if (bar) bar.update(2, { filename: basename(filename) });

  await new Promise((resolve, reject) =>
    createReadStream(filename)
      .on("close", (err) => (err ? reject(err) : resolve()))
      .on("error", (err) => (err ? reject(err) : resolve()))
      .pipe(unzipper.Extract({ path: cfg.addonPath }))
      .on("close", (err) => (err ? reject(err) : resolve()))
      .on("error", (err) => (err ? reject(err) : resolve()))
  );

  if (bar) bar.update(3, { filename: basename(filename) });
  await deleteFile(filename);
  return page.close();
};

module.exports = {
  tsmLogic,
};
