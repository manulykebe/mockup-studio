#!/usr/bin/env node
/**
 * Step 2: join a measurement file with a reviewed field catalog and emit
 * a linearized scientific datum table.
 *
 * The field catalog (produced/edited from catalog_builder.js output) is the
 * selection criterion: only entries with "include": true are extracted. Each
 * entry's "path" is resolved against the actual measurement file, so the
 * catalog and the file must share the same document shape (same ASM manifest).
 *
 * Usage:
 *   node dataset_extractor.js <asm_file.json> <schema_field_catalog.json> [-o dataset.csv] [-j joined_catalog.json] [-t title] [--expand-datacubes]
 */
"use strict";

const fs = require("fs");
const path = require("path");

function resolve(doc, entryPath) {
  let node = doc;
  for (const key of entryPath) {
    if (node === null || node === undefined) return undefined;
    node = Array.isArray(node) ? node[Number(key)] : node[key];
  }
  return node;
}

function joinEntry(entry, doc) {
  const joined = { ...entry };
  const node = resolve(doc, entry.path);

  if (node === undefined || node === null) {
    joined.value = null;
    joined.include = false;
    return joined;
  }

  if (entry.type === "datacube") {
    const dimensions = node.data && node.data.dimensions;
    const structure = node["cube-structure"] || {};
    joined.dimensions = structure.dimensions || entry.dimensions || [];
    joined.measures = structure.measures || entry.measures || [];
    joined.n_points = dimensions && dimensions.length ? dimensions[0].length : 0;
    joined.value = null;
    return joined;
  }

  if (node !== null && typeof node === "object" && !Array.isArray(node)) {
    joined.value = node.value;
    joined.unit = node.unit !== undefined ? node.unit : null;
  } else {
    joined.value = node;
    joined.unit = null;
  }
  return joined;
}

function rowsForScalar(entry) {
  return [{
    label: entry.label,
    value: entry.value,
    unit: entry.unit !== undefined ? entry.unit : null,
    ontology: entry.ontology || null,
    xsd_type: entry.xsd_type || null,
  }];
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
        ontology: entry.ontology || null,
        xsd_type: "http://www.w3.org/2001/XMLSchema#double",
      });
    });
  }
  return rows;
}

function extract(doc, catalog, expandDatacubes) {
  const rows = [];
  for (const entry of catalog) {
    if (!entry.include) continue;
    const joined = joinEntry(entry, doc);
    if (joined.type === "datacube") {
      if (expandDatacubes) rows.push(...rowsForDatacube(entry, doc));
      continue;
    }
    rows.push(...rowsForScalar(joined));
  }
  return rows;
}

function joinCatalog(doc, catalog) {
  return catalog.map((entry) => joinEntry(entry, doc));
}

function serializeJoinedCatalog(catalog) {
  return catalog.map((entry) => ({
    ...entry,
    path: entry.path.slice(0, -1).join("|"),
  }));
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[";\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function datumColumns(row) {
  const columns = {
    double: null,
    string: null,
    boolean: null,
    dateTime: null,
  };
  if (row.xsd_type === "http://www.w3.org/2001/XMLSchema#string") {
    columns.string = row.value;
  } else if (row.xsd_type === "http://www.w3.org/2001/XMLSchema#boolean") {
    columns.boolean = row.value;
  } else if (row.xsd_type === "http://www.w3.org/2001/XMLSchema#dateTimeStamp") {
    columns.dateTime = row.value;
  } else if (typeof row.value === "number") {
    columns.double = row.value;
  }
  return columns;
}

function toCsv(rows, title) {
  const header = [
    "Title",
    "Datum Label",
    "Index",
    "Scalar Double Datum",
    "Scalar String Datum",
    "Scalar Boolean Datum",
    "Scalar DateTime Datum",
    "Unit",
    "Ontology",
  ];
  const lines = rows.map((row, index) => {
    const columns = datumColumns(row);
    return [
      title,
      row.label,
      index + 1,
      columns.double,
      columns.string,
      columns.boolean,
      columns.dateTime,
      row.unit,
      row.ontology,
    ].map(csvEscape).join(";");
  });
  return [header.join(";"), ...lines].join("\n") + "\n";
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    console.log(
      "Usage: node dataset_extractor.js <asm_file.json> <schema_field_catalog.json> [-o dataset.csv] [-j joined_catalog.json] [-t title] [--expand-datacubes]"
    );
    process.exit(args.length === 0 ? 1 : 0);
  }

  let asmFile = null;
  let catalogFile = null;
  let output = "dataset.csv";
  let joinedCatalogOutput = null;
  let title = null;
  let expandDatacubes = false;
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-o" || args[i] === "--output") {
      output = args[++i];
    } else if (args[i] === "-j" || args[i] === "--joined-catalog") {
      joinedCatalogOutput = args[++i];
    } else if (args[i] === "-t" || args[i] === "--title") {
      title = args[++i];
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
  title = title || doc["sample identifier"] || path.basename(asmFile, path.extname(asmFile));
  const joinedCatalog = joinCatalog(doc, catalog);
  const rows = extract(doc, joinedCatalog, expandDatacubes);

  fs.writeFileSync(path.resolve(output), toCsv(rows, title), "utf-8");
  if (joinedCatalogOutput) {
    const joinedPath = path.resolve(joinedCatalogOutput);
    fs.mkdirSync(path.dirname(joinedPath), { recursive: true });
    fs.writeFileSync(joinedPath, JSON.stringify(serializeJoinedCatalog(joinedCatalog), null, 2), "utf-8");
  }
  console.log(`Wrote ${rows.length} rows to ${output}`);
}

if (require.main === module) {
  main();
}

module.exports = { resolve, joinEntry, joinCatalog, serializeJoinedCatalog, extract, datumColumns, toCsv };
