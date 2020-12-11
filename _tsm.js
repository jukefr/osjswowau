const { existsSync, createReadStream, statSync } = require("fs");
const moment = require("moment");
const unzipper = require("unzipper");
const glob = require("glob-promise");
const { basename } = require("path");
const { log, delay } = require("./_utils");

const tsmLogic = async (page, name = "tsm", multibar, cfg) => {
  let bar;

  cfg.debug || (bar = multibar.create(3, 0));
  const wait = async (f, m) => {
    const start = moment();
    let size;

    while (moment().diff(start, "ms") < cfg.timeout) {
      [f] = await glob(`${cfg.tmp}\-${m}/*.zip`);
      if (existsSync(f)) {
        if (size && size !== 0 && size === statSync(f).size) return f;
        size = statSync(f).size;
        cfg.debug && log.debug(name, "size", size);
      }
      cfg.debug && log.debug(name, "waiting", cfg.polling, "ms");
      await delay(cfg.polling);
    }
  };

  cfg.debug || bar.update(1, { filename: name });

  await page._client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: `${cfg.tmp}\-${name}`,
  });

  await page.goto("https://www.tradeskillmaster.com/install");

  await delay(cfg.delay);

  let filename;
  if (name === "tsm") {
    [_, filename] = await Promise.all([
      page.$eval("div.col-sm-6:nth-child(1) > a:nth-child(2)", (x) =>
        x.click()
      ),
      wait(null, name),
    ]);
  } else {
    [_, filename] = await Promise.all([
      page.$eval("div.col-sm-6:nth-child(1) > a:nth-child(5)", (x) =>
        x.click()
      ),
      wait(null, name),
    ]);
  }
  cfg.debug || bar.update(2, { filename: basename(filename) });

  await new Promise((resolve, reject) =>
    createReadStream(filename)
      .on("close", (err) => (err ? reject(err) : resolve()))
      .on("error", (err) => (err ? reject(err) : resolve()))
      .pipe(unzipper.Extract({ path: cfg.addonPath }))
      .on("close", (err) => (err ? reject(err) : resolve()))
      .on("error", (err) => (err ? reject(err) : resolve()))
  );

  cfg.debug || bar.update(3, { filename: basename(filename) });
  return page.close();
};

module.exports = {
  tsmLogic,
};
