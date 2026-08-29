# AGENTS

## Release Flow

When preparing a release for this plugin:

1. Replace `CHANGELOG.md` with the entries for the current release line only.
   For patch releases, keep all entries on the same `major.minor` number together.
   Example: `0.5.2` should include `0.5.2`, `0.5.1`, and `0.5.0`.
   When starting a new minor release such as `0.6.0`, do not carry forward the `0.5.x` entries.
2. Bump `package.json`, `manifest.json`, and `versions.json`.
   You can use `npm run version -- <version>` for this repo.
3. Run `npm test` and `npm run build`.
4. Complete the required Obsidian release test below.
5. Commit all release changes together.
6. Push the branch to `origin`.
7. Create an annotated git tag that matches the release version, for example `0.4.1`.
8. Push the new tag to `origin`.

## Required Obsidian Release Test

Use Computer Use to test the exact versioned build before you create the release commit or tag.

1. Install the local build in the test vault and reload Obsidian so the plugin manifest shows the new version.
2. Use a representative note, a text selection, and a folder that contains Markdown notes.
3. Confirm that the native Print window opens from each entry point:
   - Ribbon: **Print note**.
   - Command palette: **Print: Current note**.
   - Command palette: **Print: Selection**.
   - Command palette: **Print: All notes in current folder**.
   - File context menu: **Print note**.
   - Folder context menu: **Print all notes in folder**.
   - Editor context menu: **Print note**.
   - Editor context menu: **Print selection**.
4. Cancel each Print window. Do not start a real print job.
5. For the representative regression note, use the **PDF** menu in the Print window to save the output to the Downloads folder. Open the saved PDF and inspect every page for layout, clipping, blank-page, and pagination problems.
6. Confirm that Obsidian has no new plugin console errors and no remaining `.obsidian-print-frame` elements.

## Notes

- Keep `CHANGELOG.md` limited to the current release line only.
- Keep changelog list items short and to the point.
- Keep release tags in the `x.y.z` format used by the existing history.
- Do not create the tag until the changelog and version files are updated.
- If the repo already contains unrelated user changes, do not revert them; release only after confirming the intended scope.
