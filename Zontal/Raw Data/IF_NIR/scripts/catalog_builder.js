#!/usr/bin/env node
/**
 * Step 1: discover every label/value/unit candidate in an Allotrope ASM JSON file.
 *
 * Walks the document recursively and emits a "field catalog" JSON listing every
 * leaf found, in three shapes:
 *   - "quantity": a {"value": ..., "unit": ...} object -> label/value/unit triple.
 *   - "scalar":   a plain string/number/bool leaf -> label/value, unit=null.
 *   - "datacube": an Allotrope data cube (has "cube-structure" + "data") -> not
 *                 expanded by default (thousands of points), just described.
 *
 * Each entry carries an "include" flag (true for scalars/quantities, false for
 * datacubes) that is meant to be reviewed/edited by hand before running
 * dataset_extractor.js. This catalog is the "configuration" that step 2 joins
 * against the raw measurement file.
 *
 * Usage:
 *   node catalog_builder.js <asm_file.json> [-o field_catalog.json]
 */
"use strict";

const fs = require("fs");
const path = require("path");

// top-level metadata keys that describe the schema itself, not a measurement
const SKIP_KEYS = new Set(["$asm.manifest"]);

function isPlainObject(node) {
  return typeof node === "object" && node !== null && !Array.isArray(node);
}

function isQuantity(node) {
  if (!isPlainObject(node) || !("value" in node)) return false;
  const keys = Object.keys(node);
  return keys.every((k) => k === "value" || k === "unit");
}

function isDatacube(node) {
  return isPlainObject(node) && "cube-structure" in node && "data" in node;
}

function walk(node, currentPath, entries) {
  if (isPlainObject(node)) {
    if (isDatacube(node)) {
      const structure = node["cube-structure"];
      const dims = (node.data && node.data.dimensions) || [];
      entries.push({
        path: currentPath,
        label: currentPath.length ? currentPath[currentPath.length - 1] : "root",
        type: "datacube",
        dimensions: structure.dimensions || [],
        measures: structure.measures || [],
        n_points: dims.length ? dims[0].length : null,
        include: false,
      });
      return;
    }
    if (isQuantity(node)) {
      entries.push({
        path: currentPath,
        label: currentPath.length ? currentPath[currentPath.length - 1] : "root",
        type: "quantity",
        value: node.value,
        unit: node.unit !== undefined ? node.unit : null,
        include: true,
      });
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      if (SKIP_KEYS.has(key) || key.startsWith("@")) continue;
      if (isPlainObject(value) || Array.isArray(value)) {
        walk(value, currentPath.concat([key]), entries);
      } else {
        entries.push({
          path: currentPath.concat([key]),
          label: key,
          type: "scalar",
          value,
          unit: null,
          include: true,
        });
      }
    }
  } else if (Array.isArray(node)) {
    node.forEach((item, i) => walk(item, currentPath.concat([String(i)]), entries));
  }
}

function buildCatalog(asmPath) {
  const doc = JSON.parse(fs.readFileSync(asmPath, "utf-8"));
  const entries = [];
  walk(doc, [], entries);
  return entries;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    console.log("Usage: node catalog_builder.js <asm_file.json> [-o field_catalog.json]");
    process.exit(args.length === 0 ? 1 : 0);
  }

  let asmFile = null;
  let output = "field_catalog.json";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-o" || args[i] === "--output") {
      output = args[++i];
    } else if (!asmFile) {
      asmFile = args[i];
    }
  }
  if (!asmFile) {
    console.error("Error: asm_file argument is required");
    process.exit(1);
  }

  const entries = buildCatalog(path.resolve(asmFile));
  fs.writeFileSync(path.resolve(output), JSON.stringify(entries, null, 2), "utf-8");
  console.log(`Wrote ${entries.length} candidate fields to ${output}`);
}

if (require.main === module) {
  main();
}

module.exports = { buildCatalog, walk, isQuantity, isDatacube };
