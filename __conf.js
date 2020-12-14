const Conf = require("conf");
const { join, dirname } = require("path");
const pkg = require("./package.json");

const schema = {
  fresh: { type: "boolean", default: true }, // used on first start, should remain disabled after
  headless: { type: "boolean", default: true }, // hide chromium windows
  concurrency: { type: "number", maximum: 10, minimum: 1, default: 5 }, // amount of addons that can be updated at the same time ("threads")
  detectedAddonPath: { type: "string" },
  waitForKey: { type: "boolean", default: !!process.__nexe }, // wait for a key to continue, enabled by default on nexe
  timeout: {
    // how long an action can take (goto, click, wait, etc) in ms
    type: "number",
    maximum: 300 * 1000,
    minimum: 10 * 1000,
    default: 30 * 1000,
  },
  polling: {
    // how long timeout loops wait after each check in ms
    type: "number",
    maximum: 10 * 1000,
    minimum: 250,
    default: 1000,
  },
  delay: {
    // applied after every navigation action (goto, click, etc) in ms
    type: "number",
    maximum: 10 * 1000,
    minimum: 250,
    default: 2 * 1000,
  },
  addons: {
    type: "object",
    properties: {
      curse: {
        type: "array",
        items: { type: "string" },
        default: [],
      },
      tukui: {
        type: "object",
        properties: {
          tukui: { type: "boolean", default: false },
          elvui: { type: "boolean", default: false },
          addons: {
            type: "array",
            items: { type: "string" },
            default: [],
          },
        },
        default: {},
      },
      tsm: { type: "boolean", default: false },
      wowinterface: {
        type: "array",
        items: { type: "string" },
        default: [],
      },
    },
    default: {},
  },
};

const migrations = {
  "2.2.0": (store) => {
    const curse = store.get("addons.curse");
    if (curse) {
      const removeTSM = curse.filter((i) => {
        const includes = ["tradeskillmaster_apphelper", "tradeskill-master"].includes(i);
        if (!includes) {
          return i;
        }
        store.set("addons.tsm", includes);
        return false;
      });
      return store.set("addons.curse", removeTSM);
    }
    return null;
  },
  "2.2.2": (store) => {
    const addonPath = store.get("realpath");
    if (addonPath) {
      store.delete("realpath");
      store.set("addonPath", addonPath);
    }

    const delay = store.get("waitAfterNavig");
    if (delay) {
      store.delete("waitAfterNavig");
      store.set("delay", delay);
    }
  },
  "3.1.0": (store) => {
    const elvui = store.get("addons.elvui");
    if (Array.isArray(elvui)) {
      store.set("addons.tukui.addons", elvui);
      store.set("addons.tukui.elvui", true);
      store.delete("addons.elvui");
    }
  },
};

const getConf = (testing) => {
  const config = new Conf({
    projectName: pkg.name,
    projectVersion: pkg.version,
    clearInvalidConfig: false,
    projectSuffix: testing ? "testing" : "",
    schema,
    migrations,
  });
  if (testing) config.set("addonPath", join(dirname(config.path), "testingAddonPath"));
  return config;
};

module.exports = {
  getConf,
  schema,
  migrations,
};
