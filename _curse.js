const { existsSync, createReadStream } = require("fs");
const moment = require("moment");
const md5File = require("md5-file");
const unzipper = require("unzipper");
const { log, delay } = require("./_utils");

const curseLogic = async (page, name, multibar, cfg) => {
  let bar;

  cfg.debug || (bar = multibar.create(3, 0, { filename: name }));
  const wait = async (f, m) => {
    const start = moment();
    while (moment().diff(start, "ms") < cfg.timeout) {
      if (existsSync(f)) {
        const md5 = await md5File(f);
        if (md5 === m) {
          return true;
        }
      }
      cfg.debug && log.debug(name, "waiting", cfg.polling, "ms");
      await delay(cfg.polling);
    }
  };

  cfg.debug || bar.update(1, { filename: name });
  await page._client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: cfg.tmp,
  });
  await page.goto(`https://www.curseforge.com/wow/addons/${name}/files`);

  await delay(cfg.delay);

  const fileList = await page.$$eval(".listing tbody tr", (list) =>
    list.map(
      (x) => x.querySelector("td:nth-child(2) > a:nth-child(1)").innerText
    )
  );
  cfg.debug && log.debug({ fileList });

  const index = fileList.reduceRight(
    (a, c, i) => (c.includes("classic") || c.includes("Classic") ? a : i),
    false
  );
  cfg.debug && log.debug({ index });

  const d2 = await Promise.all([
    page.$eval(
      `.listing > tbody:nth-child(2) > tr:nth-child(${
        index + 1
      }) > td:nth-child(2) > a:nth-child(1)`,
      (x) => x.click()
    ),
    page.waitForNavigation(),
  ]);
  cfg.debug && log.debug({ d2 });

  const filepath = await page.$eval(
    "div.flex-row:nth-child(1) > span:nth-child(2)",
    (x) => x.innerText
  );
  const md5 = await page.$eval(
    "div.flex:nth-child(7) > span:nth-child(2)",
    (x) => x.innerText
  );
  cfg.debug && log.debug({ filepath, md5 });

  await Promise.all([
    page.$eval(
        "article.box > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > a:nth-child(1)",
        (x) => x.click()
    ),
    page.waitForNavigation(),
  ]);

  await Promise.all([
    page.$eval(
      "p.text-sm > a:nth-child(1)",
      (x) => x.click()
    ),
    wait(`${cfg.tmp}/${filepath}`, md5),
  ]);

  cfg.debug || bar.update(2, { filename: filepath });

  await new Promise((resolve, reject) =>
    createReadStream(`${cfg.tmp}/${filepath}`)
      .on("close", (err) => (err ? reject(err) : resolve()))
      .on("error", (err) => (err ? reject(err) : resolve()))
      .pipe(unzipper.Extract({ path: cfg.addonPath }))
      .on("close", (err) => (err ? reject(err) : resolve()))
      .on("error", (err) => (err ? reject(err) : resolve()))
  );

  cfg.debug || bar.update(3, { filename: filepath });
  return page.close();
};

module.exports = {
  curseLogic,
};
