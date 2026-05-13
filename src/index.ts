import fetch from "node-fetch";

import * as http from "http";
import fs from "fs";
import { computeSHA256, downloadFile } from "./download";

import { exec } from "child_process";

const LOCAL_VERSION_FILE = "version.json";
const APP_FILE = "example.exe";

type VersionInfo = {
  version: string;
  url: string;
};

function getLocalVersion(): string {
  if (!fs.existsSync(LOCAL_VERSION_FILE)) return "0.0.0";

  const data = fs.readFileSync(LOCAL_VERSION_FILE, "utf-8");
  return JSON.parse(data).version;
}


const options = {
  hostname: 'api.example.com',
  path: '/data',
  method: 'GET',
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
};


async function killApp() {
  return new Promise((resolve) => {
    exec("taskkill /IM example.exe /F", () => resolve(true));
  });
}

async function startApp() {
  exec(` "${APP_FILE}"`);
}

async function checkUpdate() {
  const now = new Date().toISOString();

  console.log( now + " Checking for updates...");

    const local = getLocalVersion();
  const remote = await new Promise<VersionInfo>((resolve, reject) => {
    exec("git pull", (err) => {
      if (err) return reject(err);
      const data = fs.readFileSync(LOCAL_VERSION_FILE, "utf-8");
      resolve(JSON.parse(data));
    });
  });


  console.log("Local version:", local);
  console.log("Remote version:", remote.version);

  if (remote.version !== local) {
    console.log("Update found!");

    await killApp();

    console.log("Downloading new version...");
    await downloadFile(remote.url, APP_FILE);
    
      console.log("\n🔐 Computing SHA-256 checksum...");
      const checksum = await computeSHA256(APP_FILE);
    
      const fileStat = fs.statSync(APP_FILE);
      const fileSizeKB = (fileStat.size / 1024).toFixed(2);
    
      console.log("\n──────────────────────────────────────────────────────────");
      console.log(`  File     : ${APP_FILE}`);
      console.log(`  Size     : ${fileSizeKB} KB`);
      console.log(`  SHA-256  : ${checksum}`);
      console.log("──────────────────────────────────────────────────────────\n");

    fs.writeFileSync(LOCAL_VERSION_FILE, JSON.stringify(remote, null, 2));

    console.log("Update installed.");
  } else {
    console.log("No update needed.");
  }

  await startApp();
}
 checkUpdate().catch(console.error)
setInterval(() => checkUpdate().catch(console.error), 30 * 1000);