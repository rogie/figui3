---
name: publish
description: Publish a FigUI3 release to GitHub and npm when the user explicitly asks to publish or release the package. Handles versioning, changelog, verification, generated dist files, commit, push, and npm publication.
---

# Publish FigUI3

Use this workflow only when the user explicitly asks to publish or release the package. A request to commit, push, build, or prepare a release does not by itself authorize `npm publish`.

## Preflight

- Inspect the branch, working tree, diff, recent commits, configured remote, current package version, and latest published npm version.
- Release only the intended repository changes. Stop and ask if unrelated changes make the release contents ambiguous.
- Confirm GitHub and npm authentication before doing release work that depends on them.
- Do not overwrite an existing npm version. If a publish attempt has an uncertain result, query npm for that exact version before retrying.

## Version policy

- Patch: bug fixes and small backward-compatible additions or refinements, including icons, tokens, enum options, examples, styles, and minor component capabilities.
- Minor: substantial new public features, such as a new component, major API surface, or significant workflow.
- Major: breaking changes.
- Default to patch when choosing between patch and minor. Ask the user when the change may be breaking or when the intended release contents are unclear.

## Release workflow

1. Update the version in `package.json` and package lockfiles that record the root package version. Do not create a Git tag unless the user asks for one or an established repository release convention requires it.
2. Add a new version section at the top of `CHANGELOG.md`. Summarize all changes included since the previous published version using the existing `Added`, `Changed`, and `Fixed` headings; omit empty headings.
3. Run `npm test`, then `npm run build`. Stop on any failure. Ensure generated files under `dist/` are current and included in the release commit when changed.
4. Run `npm pack --dry-run` and inspect the package name, version, and included files. Stop if required runtime or distribution files are absent or unintended files are included.
5. Review the final diff and `git diff --check`. Stage only release files and commit them as `v{version}: {short summary}`.
6. Push the release commit to the configured GitHub remote and current branch. Do not continue to npm if the push fails.
7. Run `npm publish --access public`.
8. Verify the exact version through npm and report the version, commit hash, branch, and package URL.

Keep changelog entries concise and descriptive. Never bypass failing tests, builds, authentication checks, package inspection, or registry verification without explicit user direction.
