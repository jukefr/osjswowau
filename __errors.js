const chalk = require("chalk");

class CausalError extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
  }
}

class FreshStartError extends CausalError {}

class WaitTimeoutError extends CausalError {}

class BadOsError extends CausalError {}

class TooFastError extends CausalError {}

module.exports = {
  FreshStartError,
  WaitTimeoutError,
  BadOsError,
  TooFastError,
  messages: {
    freshStart: (err, debug, config) => {
      console.log("");
      console.log("Fresh run or old configuration migrated.");
      if (config) console.log(`Please edit ${chalk.yellow(config.path)} to match your needs.`);
      if (process.platform === "win32" || process.platform === "win64")
        console.log(
          `Make sure to use double backslashes ${chalk.yellow("\\\\")} to escape the ${chalk.yellow(
            "addonPath"
          )} (AddOns folder) variable.`
        );
      if (process.platform === "win32" || process.platform === "win64")
        console.log(`ie. ${chalk.yellow('"C:\\\\Program Files\\\\..."')}`);
      if (err) console.log(chalk.italic(chalk.bold(chalk.red(err.message))));
      if (debug && err) console.log(chalk.red("cause"), err.cause || err);
    },
    timeout: (err, debug) => {
      console.log("");
      console.log(chalk.red(`A timeout was reached.`));
      console.log(chalk.red(`Try launching the command again or increasing ${chalk.bold("timeout")} in your config.`));
      console.log(chalk.italic(chalk.bold(chalk.red(err.message))));
      if (debug) console.log(chalk.red("cause"), err.cause || err);
    },
    badOs: (err, debug) => {
      console.log("");
      console.log(chalk.red("Your operating system is not yet supported."));
      console.log(
        chalk.red(
          `Feel free to make a PR with a chromium revision number for ${chalk.bold(
            process.platform
          )} and it should work.`
        )
      );
      console.log(chalk.italic(chalk.bold(chalk.red(err.message))));
      if (debug) console.log(chalk.red("cause"), err.cause || err);
    },
    configSyntax: (err, debug) => {
      console.log("");
      console.log(chalk.red("Your configuration file may have han an incorrect syntax. Please check it carefully."));
      if (process.platform === "win32" || process.platform === "win64")
        console.log(
          `Make sure to use double backslashes ${chalk.yellow("\\\\")} to escape the ${chalk.yellow(
            "addonPath"
          )} (AddOns folder) variable.`
        );
      if (process.platform === "win32" || process.platform === "win64")
        console.log(`ie. ${chalk.yellow('"C:\\\\Program Files\\\\..."')}`);
      console.log(chalk.italic(chalk.bold(chalk.red(err.message))));
      if (debug) console.log(chalk.red("cause"), err.stack || err);
    },
    tooFast: (err, debug) => {
      console.log("");
      console.log(
        chalk.red(
          `The ${chalk.bold("delay")} property seems to be too low for your connection, try increasing it some more.`
        )
      );
      console.log(chalk.italic(chalk.bold(chalk.red(err.message))));
      if (debug) console.log(chalk.red("cause"), err.stack || err);
    },
    default: (err, debug) => {
      console.log("");
      console.log(chalk.red("Something went wrong. Usually a re-run of the command should work."));
      console.log(
        chalk.red(`Otherwise enable debug mode to learn more. (start with ${chalk.bold(chalk.red("DEBUG=1"))} env)`)
      );
      console.log(chalk.italic(chalk.bold(chalk.red(err.message))));
      if (debug) console.log(err);
      if (debug) console.log(chalk.red("cause"), err.stack || err);
    },
  },
};
