const { existsSync, accessSync, constants } = require("fs");
const { homedir } = require("os");
const { promisify } = require("util");
const exec = promisify(require("child_process").exec);
const { join } = require("path");
const { resolve } = require("path");
const { readdir } = require("fs").promises;
const chalk = require("chalk");

// thats probably not a good practice at all but eh..... it works ?
let wasDetected = false;
let detectedAddonPath;

const listWindowsDrives = () =>
  exec("wmic logicaldisk get name").then(({ stdout }) =>
    stdout
      .split("\r\r\n")
      .filter((value) => /[A-Za-z]:/.test(value))
      .map((value) => value.trim())
      .filter((drive) => existsSync(`${drive}\\`))
      .map((drive) => `${drive}\\`)
  );

const detectAddonsPath = async (dir, ignores = []) => {
  if (wasDetected) return detectedAddonPath;
  return readdir(dir, { withFileTypes: true }).then((dirents) =>
    Promise.all(
      dirents.reduce((ac, dirent) => {
        if (wasDetected) return detectedAddonPath;
        const res = resolve(dir, dirent.name);
        if (res.includes(join("Interface", "AddOns"))) {
          ac.push(res);
          detectedAddonPath = res;
          wasDetected = true;
          return ac;
        }
        if (existsSync(res)) {
          try {
            accessSync(res, constants.R_OK);
            if (dirent.isDirectory()) {
              if (ignores.reduce((a, ignore) => !res.startsWith(ignore) && a, true)) {
                ac.push(detectAddonsPath(res));
                return ac;
              }
            }
          } catch (err) {
            return ac;
          }
        }
        return ac;
      }, [])
    )
  );
};

const detectLogic = async () => {
  // windows
  if (process.platform.includes("win")) {
    // start with homedir
    await detectAddonsPath(homedir());
    // then drives in general
    const drives = await listWindowsDrives();
    await Promise.all(drives.map((drive) => detectAddonsPath(drive)));
  }

  // macos
  if (process.platform === "darwin") {
    // start with homedir
    await detectAddonsPath(homedir());
    // then applications
    await detectAddonsPath("/Applications");
    // then drive
    await detectAddonsPath("/", ["/proc", "/sys", "/dev"]);
  }

  // linux
  if (process.platform === "linux") {
    // start with homedir
    await detectAddonsPath(homedir());
    // then current drive
    await detectAddonsPath("/", ["/run", "/proc", "/sys", "/media", "/dev", "/mnt", "/mount"]);
    // then other drives
    await detectAddonsPath("/", ["/proc", "/sys", "/dev"]);
  }

  console.log(chalk.green("detected addon path"), detectedAddonPath);
};

detectLogic();
