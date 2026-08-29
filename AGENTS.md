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
4. Complete the conditional Obsidian release test below when its trigger applies.
5. Commit all release changes together.
6. Push the branch to `origin`.
7. Create an annotated git tag that matches the release version, for example `0.4.1`.
8. Push the new tag to `origin`.

## Conditional Obsidian Release Test

Use Computer Use only when the release changes code that starts, opens, or cleans up the Print window, or changes an entry point that invokes that flow. Do not use Computer Use automatically for styling, generated-content, type, lint, documentation, dependency, or version-only changes. For those changes, rely on the automated tests and build unless the user explicitly requests an app test.

When the trigger applies:

1. Install the exact versioned build in the test vault and reload Obsidian.
2. Confirm that each affected entry point opens its expected Print window or mobile print flow.
3. Cancel each Print window. Do not start a real print job.
4. Confirm that the tested flow adds no plugin console error and leaves no `.obsidian-print-frame` element.

## Notes

- Keep `CHANGELOG.md` limited to the current release line only.
- Keep changelog list items short and to the point.
- Keep release tags in the `x.y.z` format used by the existing history.
- Do not create the tag until the changelog and version files are updated.
- If the repo already contains unrelated user changes, do not revert them; release only after confirming the intended scope.
