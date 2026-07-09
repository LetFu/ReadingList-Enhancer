#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
ROOT_DIR=$(CDPATH= cd "$SCRIPT_DIR/.." && pwd)

cd "$ROOT_DIR"

VERSION=$(python3 -c 'import json; print(json.load(open("manifest.json", encoding="utf-8"))["version"])')
PACKAGE_NAME="readinglist-enhancer-v${VERSION}.zip"
DIST_DIR="dist"
ZIP_PATH="${DIST_DIR}/${PACKAGE_NAME}"

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

zip -r -q "$ZIP_PATH" \
  manifest.json \
  background.js \
  sidepanel \
  icons \
  -x "*.DS_Store" "*/.DS_Store"

if command -v sha256sum >/dev/null 2>&1; then
  (cd "$DIST_DIR" && sha256sum "$PACKAGE_NAME" > "${PACKAGE_NAME}.sha256")
else
  (cd "$DIST_DIR" && shasum -a 256 "$PACKAGE_NAME" > "${PACKAGE_NAME}.sha256")
fi

printf "%s\n" "$ZIP_PATH"
