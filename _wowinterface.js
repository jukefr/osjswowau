const { basename } = require("path");
const chalk = require("chalk");
const { delay, deleteFile, waitFile, unzip } = require("./_utils");

const wowinterfaceLogic = async (config, page, name = "tukui", bar, tmp) => {
  if (bar) bar.update(1, { filename: `downloading ${chalk.bold(chalk.green(name))}` });
  await page._client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: `${tmp}-${name}`,
  });
  switch (name) {
    default:
      await page.goto(`https://www.wowinterface.com/downloads/download${name}`, {
        waitUntil: "networkidle2",
      });
  }
  await delay(config.get("delay"));
  const filename = await waitFile(config, null, name, tmp);
  if (bar) bar.update(2, { filename: `extracting ${chalk.bold(chalk.green(basename(filename)))}` });
  await unzip(config, filename);
  if (bar) bar.update(3, { filename: `deleting ${chalk.bold(chalk.green(basename(filename)))}` });
  await deleteFile(filename);
  if (bar) bar.update(4, { filename: `finished ${chalk.bold(chalk.green(basename(filename)))}` });
  return page.close();
};

module.exports = {
  wowinterfaceLogic,
};
