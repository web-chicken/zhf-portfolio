#!/usr/bin/env node
/**
 * Walks ./images recursively. Every directory containing a project-data.json
 * is a project; the images sitting beside it are that project's images.
 * The top-level folder under images/ is the category.
 *
 * Usage (from your site root):  node build-projects-data.js
 * Optional:                     node build-projects-data.js <imagesDir> <outFile>
 */
const fs = require("fs");
const path = require("path");

const IMAGES_DIR = process.argv[2] || "images";
const OUT_FILE = process.argv[3] || "projects-data.js";
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif)$/i;

// Categories appear in this order; any others follow alphabetically.
const CATEGORY_ORDER = [
  "Wood",
  "Steel",
  "Stone",
  "Finishing",
  "Roofing and Waterproofing",
  "Sculpture",
  "Custom Automotive",
];

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const toPosix = (p) => p.split(path.sep).join("/");

const categories = new Map(); // folder name -> { slug, name, projects[] }

function getCategory(folder) {
  if (!categories.has(folder)) {
    categories.set(folder, { slug: slugify(folder), name: folder, projects: [] });
  }
  return categories.get(folder);
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const jsonEntry = entries.find((e) => e.isFile() && e.name === "project-data.json");
  const images = entries
    .filter((e) => e.isFile() && IMAGE_EXT.test(e.name))
    .map((e) => e.name)
    .sort(collator.compare);

  const rel = path.relative(IMAGES_DIR, dir);
  const parts = rel ? rel.split(path.sep) : [];

  if (jsonEntry && parts.length > 0) {
    const meta = JSON.parse(fs.readFileSync(path.join(dir, jsonEntry.name), "utf8"));
    const category = getCategory(parts[0]);
    const folderName = parts[parts.length - 1];
    const slug = meta.slug || `${category.slug}-${slugify(folderName)}`;
    const name = meta.name || folderName;
    if (!meta.slug || !meta.name) {
      console.warn(`WARN: ${dir}/project-data.json is missing slug or name; used fallback`);
    }
    category.projects.push({
      slug,
      name,
      images: images.map((f) => toPosix(path.join(path.basename(IMAGES_DIR), rel, f))),
    });
  } else if (images.length > 0 && parts.length > 0) {
    console.warn(`WARN: ${dir} has ${images.length} image(s) but no project-data.json (skipped)`);
  }

  for (const e of entries) {
    if (e.isDirectory()) walk(path.join(dir, e.name));
  }
}

if (!fs.existsSync(IMAGES_DIR)) {
  console.error(`Images directory not found: ${IMAGES_DIR}`);
  process.exit(1);
}
walk(IMAGES_DIR);

const rank = (name) => {
  const i = CATEGORY_ORDER.indexOf(name);
  return i === -1 ? Infinity : i;
};
const result = [...categories.values()]
  .sort((a, b) => rank(a.name) - rank(b.name) || collator.compare(a.name, b.name))
  .map((c) => ({
    ...c,
    projects: c.projects.sort((a, b) => collator.compare(a.name, b.name)),
  }));

fs.writeFileSync(OUT_FILE, `window.PROJECTS = ${JSON.stringify(result, null, 2)};\n`);
const n = result.reduce((sum, c) => sum + c.projects.length, 0);
console.log(`Wrote ${OUT_FILE}: ${result.length} categories, ${n} projects`);
