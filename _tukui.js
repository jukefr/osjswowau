const chalk = require("chalk");
const { basename } = require("path");
const { extractFile } = require("./__utils");
const { waitFile, waitFor } = require("./__wait");

const tukuiLogic = async (config, page, name = "tukui", bar, tmp) => {
  await page._client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: `${tmp}-${name}`,
  });
  switch (name) {
    case "elvui":
      await page.goto("https://www.tukui.org/download.php?ui=elvui", {
        waitUntil: "networkidle2",
      });
      break;
    case "tukui":
      await page.goto("https://www.tukui.org/download.php?ui=tukui", {
        waitUntil: "networkidle2",
      });
      break;
    default:
      await page.goto(`https://www.tukui.org/addons.php?id=${name}`, {
        waitUntil: "networkidle0",
      });
  }
  await waitFor(config.get("delay"));
  switch (name) {
    case "tukui":
    case "elvui":
      await page.waitForSelector("#download > div > div > a");
      await page.click("#download > div > div > a")
      break;
    default:
      await page.waitForSelector("div.col-md-3:nth-child(3) > a:nth-child(1)");
      await page.click("div.col-md-3:nth-child(3) > a:nth-child(1)");
  }
  if (bar) bar.update(1, { filename: `downloading ${chalk.bold(chalk.green(name))}` });
  const filename = await waitFile(config, null, name, tmp);
  if (bar) bar.update(2, { filename: `extracting ${chalk.bold(chalk.green(basename(filename)))}` });
  await extractFile(config, filename);
  if (bar) bar.update(3, { filename: `deleting ${chalk.bold(chalk.green(basename(filename)))}` });
  // await deleteFile(filename);
  if (bar) bar.update(4, { filename: `finished ${chalk.bold(chalk.green(basename(filename)))}` });
  return page.close();
};

module.exports = {
  tukuiLogic,
};
