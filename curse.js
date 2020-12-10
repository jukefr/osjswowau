Promise = require("bluebird");
const { existsSync, createReadStream } = require("fs");
const moment = require("moment");
const md5File = require("md5-file");
const unzipper = require("unzipper");
const { log, delay } = require("./utils");

const curseLogic = async (b, name, multibar, cfg) => {
  const bar = multibar.create(3, 0, { filename: name });
  const wait = async (f, m) => {
    const start = moment();
    while (moment().diff(start, "ms") < cfg.timeout) {
      if (existsSync(f)) {
        const md5 = await md5File(f);
        if (md5 === m) {
          return true;
        }
      }
      await delay(cfg.polling);
    }
  };

  bar.update(1, { filename: name });
  const page = await b.newPage();
  await page._client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: cfg.tmp,
  });
  await page.goto(`https://www.curseforge.com/wow/addons/${name}/files`);

  await delay(cfg.waitAfterNavig);
  const filepath = await page.$eval(
    "div.flex-row:nth-child(1) > span:nth-child(2)",
    (x) => x.innerText
  );
  const md5 = await page.$eval(
    "div.flex:nth-child(7) > span:nth-child(2)",
    (x) => x.innerText
  );
  await Promise.all([
    page.$eval(
      "article.box > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > a:nth-child(1)",
      (x) => x.click()
    ),
    wait(`${cfg.tmp}/${filepath}`, md5),
  ]).catch((err) => log.error(name, err));

  bar.update(2, { filename: filepath });

  await new Promise((resolve, reject) =>
    createReadStream(`${cfg.tmp}/${filepath}`)
      .pipe(unzipper.Extract({ path: cfg.realpath }))
      .on("close", (err) => (err ? reject(err) : resolve()))
      .on("error", (err) => (err ? reject(err) : resolve()))
  );

  bar.update(3, { filename: filepath });
  return page.close();
};

module.exports = {
  curseLogic,
};
