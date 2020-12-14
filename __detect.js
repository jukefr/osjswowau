const {existsSync, accessSync, constants} = require('fs')
const {homedir} = require('os')
const {cd, find} = require('shelljs')
const {exec} = require('child_process');
const {join} = require('path')
const drivelist = require('drivelist');
const { resolve } = require('path');
const { readdir } = require('fs').promises;
const chalk = require('chalk')

// thats probably not a good practice at all but eh..... it works ?
let wasDetected = false;
let detectedAddonPath

const detectAddonsPath = async (dir, ignores = [])  => {
  if (wasDetected) return detectedAddonPath
  return readdir(resolve(dir), { withFileTypes: true }).then(dirents => Promise.all(
      dirents.reduce((ac, dirent) => {
        if (wasDetected) return detectedAddonPath
        const res = resolve(dir, dirent.name);
        if (res.includes('Interface/AddOns')) {
          ac.push(res)
          detectedAddonPath = res
          wasDetected = true
          return ac
        }
        if (existsSync(res)) {
          try {
            accessSync(res, constants.R_OK)
            if (dirent.isDirectory()) {
              if (ignores.reduce((a, ignore) => !res.startsWith(ignore) && a, true)) {
                ac.push(detectAddonsPath(res))
                return ac
              }
            }
          } catch(err) {}
        }
        return ac
      }, [])
    ))
}


const detectLogic = async () => {
  const drives = await drivelist.list();

  // windows
  // test drive exists
  // if drive exsits test in program files
  // if program files test wow...
  // C:\Program Files (x86)\World of Warcraft\Interface\AddOns or
  // C:\Program Files \World of Warcraft\Interface\AddOns

  // macos
  // test drive exists
  /// Applications/World of Warcraft/

  // linux
  if (process.platform === 'linux') {
    const drivePaths = drives.reduce((ac, drive) => {
      if (drive.mountpoints.find(mountpoint => mountpoint.path === '/boot')) {
        return ac
      }
      if (drive.mountpoints.find(mountpoint => mountpoint.path.includes('SWAP') )) {
        return ac
      }
      if (drive.mountpoints[0] && drive.mountpoints[0].path) {
        ac.push(drive.mountpoints[0].path)
      }
      return ac
    }, [])

    // start with homedir
    // await detectAddonsPath(homedir())
    // then current drive
    // await detectAddonsPath('/', ['/run', '/proc', '/sys'])
    // then other drives
    await Promise.all(drivePaths.map((path) => detectAddonsPath(path)))
  }

  console.log(chalk.green('detected addon path'), detectedAddonPath)
}

detectLogic()