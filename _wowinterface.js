const { existsSync, createReadStream, statSync } = require("fs");
const moment = require("moment");
const unzipper = require("unzipper");
const glob = require("glob-promise");
const { basename } = require("path");
const { log, delay } = require("./_utils");

const wowinterfaceLogic = async (page, name = "tukui", multibar, cfg) => {
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

  switch (name) {
    default:
      await page.goto(`https://www.wowinterface.com/downloads/download${name}`);
  }
  await delay(cfg.delay);

  const filename = await wait(null, name)

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
  wowinterfaceLogic,
};
