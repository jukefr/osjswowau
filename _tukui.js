const chalk = require("chalk");
const { basename } = require("path");
const { existsSync } = require("fs");
const { extractFile, deleteFile } = require("./__utils");
const { waitFile, waitFor } = require("./__wait");

const tukuiLogic = async (config, page, name = "tukui", bar, tmp, toc) => {
  await page._client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: `${tmp}-${name}`,
  });

  let version;
  let versionNode;
  let versionRaw;
  switch (name) {
    case "elvui":
      await page.goto("https://www.tukui.org/download.php?ui=elvui", {
        waitUntil: "networkidle2",
      });
      await waitFor(config.get("delay"));
      await page.waitForSelector("#download > div > div > a");
      versionNode = await page.$("#download > div > div > a");
      versionRaw = await (await versionNode.getProperty("innerText")).jsonValue();
      version = versionRaw.trim().replace("Download ElvUI ", "");
      break;
    case "tukui":
      await page.goto("https://www.tukui.org/download.php?ui=tukui", {
        waitUntil: "networkidle2",
      });
      await waitFor(config.get("delay"));
      await page.waitForSelector("#download > div > div > a");
      versionNode = await page.$("#download > div > div > a");
      versionRaw = await (await versionNode.getProperty("innerText")).jsonValue();
      version = versionRaw.trim().replace("Download Tukui V", "");
      break;
    default:
      await page.goto(`https://www.tukui.org/addons.php?id=${name}`, {
        waitUntil: "networkidle0",
      });
      await waitFor(config.get("delay"));
      await page.waitForSelector("#extras");
      versionNode = await page.$("p.extras:nth-child(1) > b:nth-child(1)");
      if (versionNode) {
        versionRaw = await (await versionNode.getProperty("innerText")).jsonValue();
        version = versionRaw.trim();
      } else {
        // throw new Error('Version for tukui module could not be found.')
      }
  }

  const configAddon = config.get(`detected.tukui.${name}`);
  const pathsExist = ((configAddon && configAddon._paths) || []).every((path) => existsSync(path));
  const isUpToDate = pathsExist && configAddon && configAddon._version && configAddon._version === version;
  if (isUpToDate) {
    if (bar) {
      bar.update(4, {
        filename: ` - already latest ${chalk.bold(chalk.green(Object.keys(configAddon)[0]))}`,
      });
      bar.stop();
    }
    return page.close();
  }

  if (toc && toc.Version && (version.includes(toc.Version) || toc.Version.includes(version))) {
    if (bar) {
      bar.update(4, {
        filename: ` - already latest ${chalk.bold(chalk.green(basename(toc.path).replace(".toc", "")))}`,
      });
      bar.stop();
    }
    return page.close();
  }

  switch (name) {
    case "tukui":
    case "elvui":
      await page.waitForSelector("#download > div > div > a");
      await page.click("#download > div > div > a");
      break;
    default:
      await page.waitForSelector("div.col-md-3:nth-child(3) > a:nth-child(1)");
      await page.click("div.col-md-3:nth-child(3) > a:nth-child(1)");
  }
  if (bar) bar.update(1, { filename: ` - downloading ${chalk.bold(chalk.green(name))}` });
  const filename = await waitFile(config, null, name, tmp);
  await waitFor(250); // chrome is a bitch and think that download isnt over even when i already validated md5...
  await page.close();
  if (bar) bar.update(2, { filename: ` - extracting ${chalk.bold(chalk.green(basename(filename)))}` });
  await extractFile(config, filename, "tukui", name, version, name);
  if (bar) bar.update(3, { filename: ` - deleting ${chalk.bold(chalk.green(basename(filename)))}` });
  await deleteFile(filename);
  if (bar) {
    bar.update(4, { filename: ` - updated ${chalk.bold(chalk.green(basename(filename)))}` });
    bar.stop();
  }
  return Promise.resolve();
};

module.exports = {
  tukuiLogic,
};
