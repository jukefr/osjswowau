const { basename } = require("path");
const chalk = require("chalk");
const { existsSync } = require("fs");
const { extractFile, deleteFile } = require("./__utils");
const { waitFile, waitFor } = require("./__wait");

const wowinterfaceLogic = async (config, page, name, bar, tmp, _, debug) => {
  await page._client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: `${tmp}-${name}`,
  });

  switch (name) {
    default:
      await page.goto(`https://www.wowinterface.com/downloads/info${name}.html`);
      await waitFor(config.get("delay"));
  }

  if (debug) console.log("responding to privacy popup if it exists");
  if (
    (await page.$(
      "#qc-cmp2-ui > div.qc-cmp2-footer.qc-cmp2-footer-overlay.qc-cmp2-footer-scrolled > div > button:nth-child(1)"
    )) !== null
  ) {
    await page.click(
      "#qc-cmp2-ui > div.qc-cmp2-footer.qc-cmp2-footer-overlay.qc-cmp2-footer-scrolled > div > button:nth-child(1)"
    );
  }

  const versionNode = await page.$("#version");
  const versionRaw = await (await versionNode.getProperty("innerText")).jsonValue();
  const version = versionRaw.split("Version:")[1].trim().split(", Classic:")[0];

  const configAddon = config.get(`detected.wowinterface.${name}`);
  const pathsExist = (configAddon._paths || []).every((path) => existsSync(path));
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

  switch (name) {
    default:
      await page.goto(`https://www.wowinterface.com/downloads/download${name}`);
      await waitFor(config.get("delay"));
  }

  if (bar) bar.update(1, { filename: ` - downloading ${chalk.bold(chalk.green(name))}` });
  const filename = await waitFile(config, null, name, tmp);
  await waitFor(250); // chrome is a bitch and think that download isnt over even when i already validated md5...
  await page.close();
  if (bar) bar.update(2, { filename: ` - extracting ${chalk.bold(chalk.green(basename(filename)))}` });
  await extractFile(config, filename, "wowinterface", name, version, name.split("-")[0]);
  if (bar) bar.update(3, { filename: ` - deleting ${chalk.bold(chalk.green(basename(filename)))}` });
  await deleteFile(filename);
  if (bar) {
    bar.update(4, { filename: ` - updated ${chalk.bold(chalk.green(basename(filename)))}` });
    bar.stop();
  }
  return Promise.resolve();
};

module.exports = {
  wowinterfaceLogic,
};
