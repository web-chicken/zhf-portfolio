#!/usr/bin/env node
/**
 * Reads projects-data.js and writes a project-data.json ({slug, name}) into
 * each project's folder. The folder is taken from the project's image paths.
 * Existing project-data.json files are left alone unless you pass --force.
 *
 * Usage:
 *   node generate-project-json.js                 # create missing files
 *   node generate-project-json.js --dry-run       # just show what would happen
 *   node generate-project-json.js --force         # overwrite existing files too
 *   node generate-project-json.js path/to/projects-data.js
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const FORCE = args.includes("--force");
const SRC = args.find((a) => !a.startsWith("--")) || "projects-data.js";

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(SRC, "utf8"), sandbox);
const categories = sandbox.window.PROJECTS;
if (!Array.isArray(categories)) {
  console.error("window.PROJECTS not found in " + SRC);
  process.exit(1);
}

let created = 0, skipped = 0, problems = 0;

for (const category of categories) {
  for (const project of category.projects) {
    if (!project.images || project.images.length === 0) {
      console.warn(`WARN: "${project.name}" has no images; can't tell which folder it lives in`);
      problems++;
      continue;
    }

    // Folder = directory of the images (paths are relative to the site root).
    const dirs = new Set(project.images.map((p) => path.posix.dirname(p)));
    if (dirs.size > 1) {
      console.warn(`WARN: "${project.name}" spans multiple folders (${[...dirs].join(" | ")}); skipped`);
      problems++;
      continue;
    }
    const dir = path.normalize([...dirs][0]);
    const target = path.join(dir, "project-data.json");

    if (!fs.existsSync(dir)) {
      console.warn(`WARN: folder not found: ${dir}`);
      problems++;
      continue;
    }
    if (fs.existsSync(target) && !FORCE) {
      skipped++;
      continue;
    }

    const json = JSON.stringify({ slug: project.slug, name: project.name }, null, 2) + "\n";
    console.log(`${DRY ? "[dry-run] would write" : "writing"} ${target}`);
    if (!DRY) fs.writeFileSync(target, json);
    created++;
  }
}

console.log(`\nDone. ${DRY ? "Would create" : "Created"}: ${created}, already existed: ${skipped}, problems: ${problems}`);
