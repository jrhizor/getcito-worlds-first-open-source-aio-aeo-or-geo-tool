#!/usr/bin/env node

/**
 * Cut a single GitHub Release for the current release-train version.
 *
 * Every workspace package shares one version (changesets `fixed: [["**"]]`), so
 * instead of one release per package we publish a single `v<version>` release
 * for the whole product. Run by the Release workflow as the changesets `publish`
 * step: it fires only once the "Version Packages" PR is merged (no pending
 * changesets), so `packages/lib` already holds the freshly-bumped version.
 *
 * Release notes: the section for this version in packages/lib/CHANGELOG.md is
 * used as the body when it holds real changeset entries (so the features you
 * describe in `pnpm changeset` show up on the release). If that section is empty
 * or only internal dep bumps, we fall back to GitHub's auto-generated notes
 * (merged PR / commit titles since the previous tag).
 *
 * Idempotent: skips if a release for the current version already exists, so the
 * re-runs the changesets action triggers on ordinary pushes are harmless.
 *
 * Requires `gh` and a GITHUB_TOKEN with `contents: write` (both provided by the
 * GitHub Actions runner). `gh release create` also creates the git tag.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(
  readFileSync(join(rootDir, "packages/lib/package.json"), "utf8"),
).version;
const tag = `v${version}`;

function releaseExists(t) {
  try {
    execFileSync("gh", ["release", "view", t], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Pull the `## <version>` block out of the CHANGELOG (everything up to the next
// `## ` heading). Returns null when the section is missing or has no real entry
// (a bullet that isn't just an internal `@workspace/*` dependency bump).
function changelogSection(v) {
  let text;
  try {
    text = readFileSync(join(rootDir, "packages/lib/CHANGELOG.md"), "utf8");
  } catch {
    return null;
  }
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l.trim() === `## ${v}`);
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) {
      end = i;
      break;
    }
  }
  const body = lines.slice(start + 1, end).join("\n").trim();
  const hasRealEntry = body
    .split("\n")
    .some((l) => /^-\s+/.test(l.trim()) && !/@workspace\//.test(l));
  return hasRealEntry ? body : null;
}

if (releaseExists(tag)) {
  console.log(`Release ${tag} already exists; nothing to publish.`);
  process.exit(0);
}

const args = ["release", "create", tag, "--title", tag];
if (process.env.GITHUB_SHA) args.push("--target", process.env.GITHUB_SHA);

const notes = changelogSection(version);
if (notes) {
  const notesFile = join(rootDir, ".release-notes.md");
  writeFileSync(notesFile, notes);
  args.push("--notes-file", notesFile);
} else {
  args.push("--generate-notes");
}

execFileSync("gh", args, { stdio: "inherit" });
console.log(`Published GitHub Release ${tag}.`);
