Promise = require("bluebird");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const Conf = require("conf");
const {join, dirname} = require("path");
const cliProgress = require('cli-progress');
const {firstStart, cleanTmps} = require('./utils')
const {elvuiLogic} = require('./elvui')
const {curseLogic} = require('./curse')
puppeteer.use(StealthPlugin());

const main = async () => {
    try {

        const multibar = new cliProgress.MultiBar({
            clearOnComplete: false,
            format: '[{bar}] {percentage}% | {value}/{total} | {filename}',
            hideCursor: true
        }, cliProgress.Presets.shades_grey);

        const config = new Conf({});

        firstStart(config)

        const cfg = {
            ...config.store,
            tmp: join(dirname(config.path), config.get("tmp")),
        };

        return puppeteer.launch({headless: !cfg.debug}).then(async (browser) => {
            await Promise.map(
                cfg.addons.curse,
                (addon) => curseLogic(browser, addon, multibar, cfg),
                {
                    concurrency: process.platform === 'win32' ? 1 : 2, // WARN: windows buggy...
                }
            );

            if (cfg.addons.elvui) {
                await Promise.map(
                    ["elvui", ...cfg.addons.elvui],
                    (addon) => elvuiLogic(browser, addon, multibar, cfg),
                    {
                        concurrency: 1, // TODO: chrome "page" set download really is on instance level
                    }
                )
            }
            return Promise.all([
                browser.close(),
                multibar.stop()
            ]).then(() => cleanTmps(cfg));
        });

    } catch (err) {
        console.log(chalk.red('Something went terribly wrong. Usually timeouts and a simple re-run of the command fixes it.'))
        console.log(chalk.red('Enable debug mode to learn more.'))
        process.exit(1)
    }

};

module.exports = main

main();
