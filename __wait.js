const { existsSync, statSync } = require("fs");
const md5File = require("md5-file");
const glob = require("glob-promise");
const chalk = require("chalk");
const { WaitTimeoutError } = require("./__errors");

const waitFor = (d) =>
  new Promise((resolve) => {
    setTimeout(resolve, d);
  });

const waitMd5 = async (config, m, name, tmp) => {
  const start = Date.now();
  while (Date.now() - start < config.get("timeout")) {
    const [fname] = await glob(`${tmp}-${name}/*.zip`);
    if (existsSync(fname)) {
      const md5 = await md5File(fname);
      if (md5 === m) {
        return fname;
      }
    }
    await waitFor(config.get("polling"));
  }
  throw new WaitTimeoutError();
};

const waitFile = async (config, f, m, tmp) => {
  const start = Date.now();
  let size;

  while (Date.now() - start < config.get("timeout")) {
    const [fname] = await glob(`${tmp}-${m}/*.zip`);
    if (existsSync(fname)) {
      if (size && size !== 0 && size === statSync(fname).size) return fname;
      size = statSync(fname).size;
    }
    await waitFor(config.get("polling"));
  }
  throw new WaitTimeoutError();
};

const waitToContinue = () => {
  console.log("");
  console.log(chalk.bold("Press any key to continue..."));
  process.stdin.setRawMode(true);
  return new Promise((resolve) =>
    process.stdin.once("data", () => {
      process.stdin.setRawMode(false);
      return resolve();
    })
  );
};

module.exports = {
  waitFor,
  waitMd5,
  waitFile,
  waitToContinue,
};
