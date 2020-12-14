const { basename } = require("path");
const chalk = require("chalk");
const { extractFile, deleteFile } = require("./__utils");
const { waitFile } = require("./__wait");

const wowinterfaceLogic = async (config, page, name, bar, tmp) => {
  await page._client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: `${tmp}-${name}`,
  });
  switch (name) {
    default:
      await page.goto(`https://www.wowinterface.com/downloads/download${name}`);
  }
  if (bar) bar.update(1, { filename: `downloading ${chalk.bold(chalk.green(name))}` });
  const filename = await waitFile(config, null, name, tmp);
  if (bar) bar.update(2, { filename: `extracting ${chalk.bold(chalk.green(basename(filename)))}` });
  await extractFile(config, filename);
  if (bar) bar.update(3, { filename: `deleting ${chalk.bold(chalk.green(basename(filename)))}` });
  await deleteFile(filename);
  if (bar) bar.update(4, { filename: `finished ${chalk.bold(chalk.green(basename(filename)))}` });
  return page.close();
};

module.exports = {
  wowinterfaceLogic,
};
