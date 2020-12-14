const { basename } = require("path");
const chalk = require("chalk");
const { appendFileSync } = require("fs");
const { extractFile, deleteFile } = require("./__utils");
const { waitFile, waitFor } = require("./__wait");

const wowinterfaceLogic = async (config, page, name, bar, tmp, toc, debug, type) => {
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

  if (toc && toc.Version && (version.includes(toc.Version) || toc.Version.includes(version))) {
    if (bar) {
      bar.update(4, {
        filename: `arlready up to date ${chalk.bold(chalk.green(basename(toc.path).replace(".toc", "")))}`,
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

  if (bar) bar.update(1, { filename: `downloading ${chalk.bold(chalk.green(name))}` });
  const filename = await waitFile(config, null, name, tmp);
  if (bar) bar.update(2, { filename: `extracting ${chalk.bold(chalk.green(basename(filename)))}` });
  await extractFile(config, filename);
  if (bar) bar.update(3, { filename: `deleting ${chalk.bold(chalk.green(basename(filename)))}` });
  await deleteFile(filename);
  if (bar) {
    bar.update(4, { filename: `updated ${chalk.bold(chalk.green(basename(filename)))}` });
    bar.stop();
  }
  if (toc && (!version.includes(toc.Version) || !toc.Version.includes(version))) {
    appendFileSync(toc.path, `\r\n## Version: ${version}\r\n`);
    appendFileSync(toc.path, `\r\n## OSJSWOWAU: ${type}-${name}\r\n`);
  }
  return page.close();
};

module.exports = {
  wowinterfaceLogic,
};
