#!/usr/bin/env node
/**
 * Step 2: join a measurement file with a reviewed field catalog and emit
 * a linearized (label, value, unit) dataset.
 *
 * The field catalog (produced/edited from catalog_builder.js output) is the
 * selection criterion: only entries with "include": true are extracted. Each
 * entry's "path" is resolved against the actual measurement file, so the
 * catalog and the file must share the same document shape (same ASM manifest).
 *
 * Usage:
 *   node dataset_extractor.js <asm_file.json> <field_catalog.json> [-o dataset.csv] [--expand-datacubes]
 */
"use strict";

const fs = require("fs");
const path = require("path");

function resolve(doc, entryPath) {
  let node = doc;
  for (const key of entryPath) {
    node = Array.isArray(node) ? node[Number(key)] : node[key];
  }
  return node;
}

function rowsForScalar(entry, doc) {
  const node = resolve(doc, entry.path);
  let value, unit;
  if (node !== null && typeof node === "object" && !Array.isArray(node)) {
    value = node.value;
    unit = node.unit !== undefined ? node.unit : null;
  } else {
    value = node;
    unit = null;
  }
  return [{ label: entry.label, value, unit, path: entry.path.join(".") }];
}

function rowsForDatacube(entry, doc) {
  // only handles the common 1-dimension spectral cube (e.g. wavelength -> absorbance)
  const node = resolve(doc, entry.path);
  const dims = node.data.dimensions;
  const measures = node.data.measures;
  const dimMeta = node["cube-structure"].dimensions || [];
  const measureMeta = node["cube-structure"].measures || [];
  const n = dims.length ? dims[0].length : 0;
  const rows = [];
  for (let i = 0; i < n; i++) {
    const dimLabel = dimMeta
      .map((meta, d) => `${meta.concept}=${dims[d][i]}${meta.unit || ""}`)
      .join(", ");
    measures.forEach((measure, m) => {
      rows.push({
        label: `${entry.label} - ${measureMeta[m].concept} @ ${dimLabel}`,
        value: measure[i],
        unit: measureMeta[m].unit !== undefined ? measureMeta[m].unit : null,
        path: entry.path.join("."),
      });
    });
  }
  return rows;
}

function extract(doc, catalog, expandDatacubes) {
  const rows = [];
  for (const entry of catalog) {
    if (!entry.include) continue;
    if (entry.type === "datacube") {
      if (expandDatacubes) rows.push(...rowsForDatacube(entry, doc));
      continue;
    }
    rows.push(...rowsForScalar(entry, doc));
  }
  return rows;
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function toCsv(rows) {
  const header = "label,value,unit,path";
  const lines = rows.map((r) => [r.label, r.value, r.unit, r.path].map(csvEscape).join(","));
  return [header, ...lines].join("\n") + "\n";
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    console.log(
      "Usage: node dataset_extractor.js <asm_file.json> <field_catalog.json> [-o dataset.csv] [--expand-datacubes]"
    );
    process.exit(args.length === 0 ? 1 : 0);
  }

  let asmFile = null;
  let catalogFile = null;
  let output = "dataset.csv";
  let expandDatacubes = false;
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-o" || args[i] === "--output") {
      output = args[++i];
    } else if (args[i] === "--expand-datacubes") {
      expandDatacubes = true;
    } else {
      positional.push(args[i]);
    }
  }
  [asmFile, catalogFile] = positional;
  if (!asmFile || !catalogFile) {
    console.error("Error: asm_file and catalog_file arguments are required");
    process.exit(1);
  }

  const doc = JSON.parse(fs.readFileSync(path.resolve(asmFile), "utf-8"));
  const catalog = JSON.parse(fs.readFileSync(path.resolve(catalogFile), "utf-8"));
  const rows = extract(doc, catalog, expandDatacubes);

  fs.writeFileSync(path.resolve(output), toCsv(rows), "utf-8");
  console.log(`Wrote ${rows.length} rows to ${output}`);
}

if (require.main === module) {
  main();
}

module.exports = { resolve, extract, toCsv };
