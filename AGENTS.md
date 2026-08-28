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
4. Install the local build in the test vault, reload the plugin in Obsidian, and test the main print flow on a representative note.
5. Commit all release changes together.
6. Push the branch to `origin`.
7. Create an annotated git tag that matches the release version, for example `0.4.1`.
8. Push the new tag to `origin`.

## Notes

- Keep `CHANGELOG.md` limited to the current release line only.
- Keep changelog list items short and to the point.
- Keep release tags in the `x.y.z` format used by the existing history.
- Do not create the tag until the changelog and version files are updated.
- If the repo already contains unrelated user changes, do not revert them; release only after confirming the intended scope.
