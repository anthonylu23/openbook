const fs = require("fs");
const path = require("path");

const src = path.resolve(__dirname, "../src/prompt/systemprompt.txt");
const destDir = path.resolve(__dirname, "../dist/prompt");
const dest = path.join(destDir, "systemprompt.txt");

if (!fs.existsSync(src)) {
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
