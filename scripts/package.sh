#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

version=$(node -p "require('./manifest.json').version")
files=(manifest.json *.js *.html *.css fonts)

rm -rf dist
for target in chrome firefox; do
  mkdir -p "dist/$target/icons"
  cp -R "${files[@]}" "dist/$target/"
  cp icons/*.png icons/*.svg "dist/$target/icons/"
done

node -e '
const fs = require("fs");
const path = "dist/firefox/manifest.json";
const manifest = JSON.parse(fs.readFileSync(path, "utf8"));
manifest.background = { scripts: ["shared.js", "background.js"] };
manifest.browser_specific_settings = {
  gecko: {
    id: "focus@parsabordbar",
    strict_min_version: "140.0",
    data_collection_permissions: { required: ["none"] },
  },
};
fs.writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n");
'

(cd dist/chrome && zip -qr "../focus-chrome-$version.zip" .)
(cd dist/firefox && zip -qr "../focus-firefox-$version.zip" .)

ls -lh dist/*.zip
