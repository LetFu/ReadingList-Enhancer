# Release

This project ships a Chrome Web Store-ready ZIP through GitHub Releases. Chrome Web Store upload is manual for now.

## Local Checks

Run the same checks as CI:

```sh
python3 -m json.tool manifest.json
node --check background.js
node --check sidepanel/data.js
node --check sidepanel/panel.js
node tests/data.test.js
sh -n scripts/package-extension.sh
scripts/package-extension.sh
unzip -l dist/*.zip
```

The ZIP must contain `manifest.json` at the root. It must not contain `.git/`, `.github/`, `README.md`, `PRIVACY.md`, or this file.

## GitHub Release

1. Update `manifest.json` version.
2. Commit the change.
3. Tag the commit with the exact manifest version:

   ```sh
   git tag v0.1.1
   git push origin main
   git push origin v0.1.1
   ```

4. GitHub Actions creates a release with:
   - `readinglist-enhancer-v<version>.zip`
   - `readinglist-enhancer-v<version>.zip.sha256`

The release workflow fails if the tag does not equal `v${manifest.version}`. Release notes are generated from local Git history with `git-cliff`; remote metadata lookup is disabled so private repository API permissions do not affect changelog generation.

`manifest.json` includes a generated `key` so local unpacked installs use the stable extension ID `nianajlkiccjcfbegngpmhpinggjkbef` across directories. The private key is local-only at `.local/readinglist-enhancer.pem` and must not be committed. If publishing to an existing Chrome Web Store item with a different public key, replace the manifest `key` with the Developer Dashboard public key before release.

If a tag release fails because the workflow itself was broken, fix `main` and rerun the release for the existing tag:

```sh
gh workflow run Release --ref main -f tag=v0.1.0
```

## Changelog

Use scoped Conventional Commits so `git-cliff` can group changes:

```text
feat(sidepanel): add reading filters
fix(background): handle duplicate URLs
docs(release): update release steps
ci(release): package extension on tag
```

To update the committed changelog locally, install `git-cliff` and run:

```sh
git cliff -o CHANGELOG.md
```

Release notes use the same `cliff.toml` config in GitHub Actions.

## Chrome Web Store

1. Download the ZIP from the GitHub Release.
2. Open the Chrome Developer Dashboard.
3. Upload the ZIP.
4. For the first release, complete Store Listing, Privacy, Distribution, and Test Instructions if needed.
5. Submit for review.

For updates, increment `manifest.json` version before packaging. Chrome Web Store rejects packages whose manifest version is not higher than the currently uploaded version.

## Not Automated Yet

Chrome Web Store API publishing is intentionally not wired in. It requires Google OAuth setup and repository secrets:

- `CHROME_CLIENT_ID`
- `CHROME_CLIENT_SECRET`
- `CHROME_REFRESH_TOKEN`
- `CHROME_PUBLISHER_ID`
- `CHROME_EXTENSION_ID`

Add that only when manual upload becomes the bottleneck.
