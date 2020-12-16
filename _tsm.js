const { basename } = require("path");
const chalk = require("chalk");
const { extractFile, deleteFile } = require("./__utils");
const { waitFile, waitFor } = require("./__wait");

const tsmLogic = async (config, page, name = "tsm", bar, tmp) => {
  await page._client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: `${tmp}-${name}`,
  });

  await page.goto("https://blog.tradeskillmaster.com/category/changelog/");
  await waitFor(config.get("delay"));

  const versionNode = await page.$("div:nth-child(1) > h2:nth-child(1) > a:nth-child(1)");
  const versionRaw = await (await versionNode.getProperty("innerText")).jsonValue();
  const version = versionRaw.replace("TradeSkillMaster v", "").replace(" Changelog", "").trim();

  const configAddon = config.get(`detected.tsm.${name}`);
  const isUpToDate = configAddon && configAddon._version && configAddon._version === version;
  if (isUpToDate) {
    if (bar) {
      bar.update(4, {
        filename: ` - already latest ${chalk.bold(chalk.green(Object.keys(configAddon)[0]))}`,
      });
      bar.stop();
    }
    return page.close();
  }

  await page.goto("https://www.tradeskillmaster.com/install", {
    waitUntil: "networkidle2",
  });

  await waitFor(config.get("delay"));
  if (bar) bar.update(1, { filename: ` - downloading ${chalk.bold(chalk.green(name))}` });
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
  await waitFor(250); // chrome is a bitch and think that download isnt over even when i already validated md5...
  await page.close();
  if (bar) bar.update(2, { filename: ` - extracting ${chalk.bold(chalk.green(basename(filename)))}` });
  await extractFile(config, filename, "tsm", name, version, name);
  if (bar) bar.update(3, { filename: ` - deleting ${chalk.bold(chalk.green(basename(filename)))}` });
  await deleteFile(filename);
  if (bar) {
    bar.update(4, { filename: ` - updated ${chalk.bold(chalk.green(basename(filename)))}` });
    bar.stop();
  }
  return Promise.resolve();
};

module.exports = {
  tsmLogic,
};
