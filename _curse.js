const { basename } = require("path");
const chalk = require("chalk");
const {appendFileSync} = require('fs')
const { extractFile, deleteFile } = require("./__utils");
const { waitMd5, waitFor } = require("./__wait");

const curseLogic = async (config, page, name, bar, tmp, toc) => {
  await page._client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: `${tmp}-${name}`,
  });
  await page.goto(`https://www.curseforge.com/wow/addons/${name}/files`, {
    waitUntil: "networkidle2",
  });
  await waitFor(config.get("delay"));

  const frames = page.frames();
  for (const frame of frames) {
    const maybeOptions = await frame.$("button[title='Options']");
    if (maybeOptions) await maybeOptions.click();
    if (maybeOptions) {
      await waitFor(config.get("delay"));
      const newFrames = page.frames();
      for (const newFrame of newFrames) {
        const maybeReject = await newFrame.$("button[title='Reject All']");
        if (maybeReject) await maybeReject.click();
      }
    }
  }

  let version
  const fileListNodes = await page.$$(".listing tbody tr");
  for (const node of fileListNodes) {
    const el = node.asElement();
    const elNode = await el.$("td:nth-child(2) > a:nth-child(1)");
    version = await (await elNode.getProperty("innerText")).jsonValue();
    if (!version.includes("classic") && !version.includes("Classic")){
      if (toc.Version && (version.includes(toc.Version) || toc.Version.includes(version))) {
        if (bar) bar.update(4, { filename: `arlready up to date ${chalk.bold(chalk.green(name))}` });
        return page.close();
      }
      console.log(toc, version);
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
  if (bar) bar.update(1, { filename: `downloading ${chalk.bold(chalk.green(name))}` });
  const [, filename] = await Promise.all([page.click("p.text-sm > a:nth-child(1)"), waitMd5(config, md5, name, tmp)]);
  if (bar) bar.update(2, { filename: `extracting ${chalk.bold(chalk.green(basename(filename)))}` });
  await extractFile(config, filename);
  if (bar) bar.update(3, { filename: `deleting ${chalk.bold(chalk.green(basename(filename)))}` });
  await deleteFile(filename);
  if (bar) bar.update(4, { filename: `finished ${chalk.bold(chalk.green(basename(filename)))}` });
  if (!version.includes(toc.Version) || !toc.Version.includes(version)) {
    appendFileSync(toc.path, `## Version: ${version}`);
  }
  return page.close();
};

module.exports = {
  curseLogic,
};
