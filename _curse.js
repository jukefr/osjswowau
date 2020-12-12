const { existsSync, createReadStream } = require("fs");
const md5File = require("md5-file");
const unzipper = require("unzipper");
const glob = require("glob-promise");
const { basename } = require("path");
const chalk = require("chalk");
const { delay, deleteFile, WaitTimeoutError } = require("./_utils");

const curseLogic = async (page, name, bar, cfg) => {
  const wait = async (m) => {
    const start = Date.now();
    while (Date.now() - start < cfg.timeout) {
      const [fname] = await glob(`${cfg.tmp}-${name}/*.zip`);
      if (existsSync(fname)) {
        const md5 = await md5File(fname);
        if (md5 === m) {
          return fname;
        }
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

  await page.goto(`https://www.curseforge.com/wow/addons/${name}/files`, {
    waitUntil: "networkidle2",
  });
  const frames = page.frames();
  for (const frame of frames) {
    const maybeOptions = await frame.$("button[title='Options']");
    if (maybeOptions) await maybeOptions.click();
    if (maybeOptions) {
      await delay(1000);
      const newFrames = page.frames();
      for (const newFrame of newFrames) {
        const maybeReject = await newFrame.$("button[title='Reject All']");
        if (maybeReject) await maybeReject.click();
      }
    }
  }

  const fileListNodes = await page.$$(".listing tbody tr");
  for (let i = 0; i < fileListNodes.length; i += 1) {
    const el = fileListNodes[i].asElement();
    const elNode = await el.$("td:nth-child(2) > a:nth-child(1)");
    const text = await (await elNode.getProperty("innerText")).jsonValue();
    if (!text.includes("classic") && !text.includes("Classic")) {
      await el.click("td:nth-child(2) > a:nth-child(1)");
      break;
    }
  }

  const md5Node = await page.$("div.flex:nth-child(7) > span:nth-child(2)");
  const md5 = await (await md5Node.getProperty("innerText")).jsonValue();

  await Promise.all([
    page.click("article.box > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > a:nth-child(1)"),
    page.waitForNavigation(),
  ]);

  const [, filename] = await Promise.all([page.click("p.text-sm > a:nth-child(1)"), wait(md5)]);

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
  curseLogic,
};
