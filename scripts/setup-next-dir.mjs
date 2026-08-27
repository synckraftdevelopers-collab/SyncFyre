import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const projectRoot = process.cwd();
const nextDir = path.join(projectRoot, ".next");
const projectNodeModules = path.join(projectRoot, "node_modules");

if (process.platform !== "win32") {
  process.exit(0);
}

const tempRoot = process.env.LOCALAPPDATA ?? os.tmpdir();
const externalProjectRoot = path.join(tempRoot, "SyncTyre", "project");
const targetDir = path.join(externalProjectRoot, ".next");
const targetNodeModules = path.join(externalProjectRoot, "node_modules");

fs.mkdirSync(externalProjectRoot, { recursive: true });
fs.mkdirSync(targetDir, { recursive: true });
ensureNodeModulesJunction();

try {
  const stat = fs.lstatSync(nextDir);

  if (stat.isSymbolicLink()) {
    const currentTarget = fs.readlinkSync(nextDir);
    const resolvedCurrent = path.resolve(projectRoot, currentTarget);

    if (resolvedCurrent === targetDir) {
      process.exit(0);
    }
  }

  fs.rmSync(nextDir, { recursive: true, force: true });
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code !== "ENOENT") {
    throw error;
  }
}

fs.symlinkSync(targetDir, nextDir, "junction");

function ensureNodeModulesJunction() {
  try {
    const stat = fs.lstatSync(targetNodeModules);

    if (stat.isSymbolicLink()) {
      const currentTarget = fs.readlinkSync(targetNodeModules);
      const resolvedCurrent = path.resolve(externalProjectRoot, currentTarget);

      if (resolvedCurrent === projectNodeModules) {
        return;
      }
    }

    fs.rmSync(targetNodeModules, { recursive: true, force: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code !== "ENOENT") {
      throw error;
    }
  }

  fs.symlinkSync(projectNodeModules, targetNodeModules, "junction");
}