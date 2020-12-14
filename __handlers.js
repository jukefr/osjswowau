const chalk = require("chalk");
const { FreshStartError, BadOsError, WaitTimeoutError, messages } = require("./__errors");
const { waitToContinue } = require("./__wait");
const pkg = require("./package.json");
const { getLatestVersion } = require("./__utils");

const defaultErrorLogic = (err, debug) => {
  if (err.message && err.message.includes("Timeout hit:")) return messages.timeout(err, debug);
  if (err.message && err.message.includes("timeout")) return messages.timeout(err, debug);
  if (err.message && err.message.includes("Timeout")) return messages.timeout(err, debug);
  if (err.message && err.message.includes("Node is either not visible or not an HTMLElement"))
    return messages.tooFast(err, debug);
  return messages.default(err, debug);
};

const syntaxLogic = (err, debug) => {
  if (err.message && err.message.includes("in JSON at position")) return messages.configSyntax(err, debug);
  return messages.default(err, debug);
};

const errorLogic = (err, debug) => {
  switch (err.constructor) {
    case FreshStartError:
      messages.freshStart(err, debug);
      break;
    case WaitTimeoutError:
      messages.timeout(err, debug);
      break;
    case BadOsError:
      messages.badOs(err, debug);
      break;
    case SyntaxError:
      syntaxLogic(err, debug);
      break;
    default:
      defaultErrorLogic(err, debug);
  }
};

const handleCleanup = async (config) => {
  const latest = await getLatestVersion();
  if (latest) {
    const latestName = latest.name.replace("v", "");
    console.log(chalk.bold(chalk.green("osjswowau")), `v${chalk.bold(pkg.version)}`, "finished");
    if (`${latestName}` !== `${pkg.version}`) {
      console.log("");
      console.log(
        "new version",
        chalk.bold(chalk.green(latestName)),
        "detected, you are running",
        chalk.bold(chalk.red(pkg.version))
      );
      console.log("please run", chalk.bold(chalk.green('"npm i -g osjswowau"')), "to update");
      console.log(
        "or download the latest binary build from",
        chalk.bold(chalk.green("https://github.com/jukefr/osjswowau/releases"))
      );
    }
  }
  if (process.__nexe) {
    return waitToContinue();
  }
  if (config && config.get("waitForKey")) {
    return waitToContinue();
  }
  return null;
};

const handleError = async (err, config, debug, testing, exit) => {
  errorLogic(err, debug);
  await handleCleanup(config);
  if (testing) throw err;
  if (exit) process.exit(1);
};

module.exports = {
  handleError,
  handleCleanup,
};
