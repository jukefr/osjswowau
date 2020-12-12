module.exports = {
  schema: {
    fresh: { type: "boolean", default: true }, // used on first start, should remain disabled after
    headless: { type: "boolean", default: true }, // hide chromium windows
    concurrency: { type: "number", maximum: 10, minimum: 1, default: 5 }, // amount of addons that can be updated at the same time ("threads")
    addonPath: {
      type: "string",
      default: process.platform.includes("win") ? "C:\\path\\to\\addons\\folder\\..." : "path/to/addons/folder",
    },
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
          items: { type: "string", default: "azeroth-auto-pilot" },
          default: [
            "azeroth-auto-pilot",
            "big-wigs",
            "details",
            "little-wigs",
            "pawn",
            "plater-nameplates",
            "weakauras-2",
          ],
        },
        tukui: {
          tukui: { type: "boolean", default: false },
          elvui: { type: "boolean", default: true },
          addons: {
            type: "array",
            items: { type: "number", default: 3 },
            default: [137, 38, 3],
          },
        },
        tsm: { type: "boolean", default: false },
        wowinterface: {
          type: "array",
          items: { type: "string", default: "24608-Hekili" },
          default: [],
        },
      },
      default: {},
    },
  },
  migrations: {
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
  },
};
