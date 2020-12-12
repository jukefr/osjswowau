const { basename } = require("path");
const chalk = require("chalk");
const { delay, deleteFile, waitFile, unzip } = require("./_utils");

const tsmLogic = async (config, page, name = "tsm", bar, tmp) => {
  if (bar) bar.update(1, { filename: `downloading ${chalk.bold(chalk.green(name))}` });
  await page._client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: `${tmp}-${name}`,
  });
  await page.goto("https://www.tradeskillmaster.com/install", {
    waitUntil: "networkidle2",
  });
  await delay(config.get("delay"));
  let filename;
  if (name === "tsm") {
    [, filename] = await Promise.all([
      page.click("div.col-sm-6:nth-child(1) > a:nth-child(2)"),
      waitFile(config, null, name, tmp),
    ]);
  } else {
    [, filename] = await Promise.all([
      page.click("div.col-sm-6:nth-child(1) > a:nth-child(5)"),
      waitFile(config, null, name, tmp),
    ]);
  }
  if (bar) bar.update(2, { filename: `extracting ${chalk.bold(chalk.green(basename(filename)))}` });
  await unzip(config, filename);
  if (bar) bar.update(3, { filename: `deleting ${chalk.bold(chalk.green(basename(filename)))}` });
  await deleteFile(filename);
  if (bar) bar.update(4, { filename: `finished ${chalk.bold(chalk.green(basename(filename)))}` });
  return page.close();
};

module.exports = {
  tsmLogic,
};
