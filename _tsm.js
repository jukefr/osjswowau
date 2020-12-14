const { basename } = require("path");
const chalk = require("chalk");
const { appendFileSync } = require("fs");
const { extractFile, deleteFile } = require("./__utils");
const { waitFile, waitFor } = require("./__wait");

const tsmLogic = async (config, page, name = "tsm", bar, tmp, toc, debug, type) => {
  await page._client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: `${tmp}-${name}`,
  });

  await page.goto("https://blog.tradeskillmaster.com/category/changelog/");
  await waitFor(config.get("delay"));

  const versionNode = await page.$("div:nth-child(1) > h2:nth-child(1) > a:nth-child(1)");
  const versionRaw = await (await versionNode.getProperty("innerText")).jsonValue();
  const version = versionRaw.replace("TradeSkillMaster v", "").replace(" Changelog", "").trim();

  if (toc && toc.Version && (version.includes(toc.Version) || toc.Version.includes(version))) {
    if (bar)
      bar.update(4, {
        filename: `arlready up to date ${chalk.bold(
          chalk.green(name === "tsm" ? "TradeSkillMaster" : "TradeSkillMaster_AppHelper")
        )}`,
      });
    return page.close();
  }

  await page.goto("https://www.tradeskillmaster.com/install", {
    waitUntil: "networkidle2",
  });

  await waitFor(config.get("delay"));
  if (bar) bar.update(1, { filename: `downloading ${chalk.bold(chalk.green(name))}` });
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
  await extractFile(config, filename);
  if (bar) bar.update(3, { filename: `deleting ${chalk.bold(chalk.green(basename(filename)))}` });
  await deleteFile(filename);
  if (bar) bar.update(4, { filename: `updated ${chalk.bold(chalk.green(basename(filename)))}` });
  if (toc && (!version.includes(toc.Version) || !toc.Version.includes(version))) {
    appendFileSync(toc.path, `\r\n## Version: ${version}\r\n`);
    appendFileSync(toc.path, `\r\n## OSJSWOWAU: ${type}-${name}\r\n`);
  }
  return page.close();
};

module.exports = {
  tsmLogic,
};
