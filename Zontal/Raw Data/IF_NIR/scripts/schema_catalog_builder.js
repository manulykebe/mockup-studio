#!/usr/bin/env node
/**
 * Build a field catalog directly from an Allotrope ASM JSON Schema (e.g. ftir.schema)
 * instead of from an actual measurement file.
 *
 * Produces the same catalog shape as catalog_builder.js (path/label/type/value/unit/include),
 * but since the schema describes the *shape* of the data rather than actual measurements,
 * every "value" is null - there is nothing to assign yet. Units are still known where the
 * schema pins them via a "$defs/<unit>" $ref (quantity datum) or via a datacube's
 * cube-structure constants.
 *
 * Recognized "$asm.pattern" values:
 *   - "aggregate datum": a container -> recurse into its "properties".
 *   - "quantity datum":  a {value, unit} leaf -> unit taken from the units.schema $ref.
 *   - "value datum":     a plain scalar leaf -> unit is always null.
 *   - "datacube":        an Allotrope data cube -> described (dimensions/measures), not expanded.
 *
 * Usage:
 *   node schema_catalog_builder.js <schema_file.schema> [-o in/catalog/schema_field_catalog.json]
 */
"use strict";

const fs = require("fs");
const path = require("path");

// JSON-Pointer token decoding: '~1' -> '/', '~0' -> '~' (order matters)
function decodePointerToken(token) {
  return token.replace(/~1/g, "/").replace(/~0/g, "~");
}

function unitFromRef(ref) {
  const match = /units\.schema#\/\$defs\/([^/]+)$/.exec(ref || "");
  return match ? decodePointerToken(match[1]) : null;
}

function extractUnit(node) {
  const allOf = Array.isArray(node.allOf) ? node.allOf : [];
  for (const clause of allOf) {
    if (clause && typeof clause.$ref === "string") {
      const unit = unitFromRef(clause.$ref);
      if (unit) return unit;
    }
  }
  return null;
}

function extractConceptUnit(propNode) {
  if (!propNode || !propNode.properties) return null;
  const concept = propNode.properties.concept && propNode.properties.concept.const;
  const unit = propNode.properties.unit && propNode.properties.unit.const;
  return { concept: concept || null, unit: unit || null };
}

function extractDatacubeMeta(node) {
  const allOf = Array.isArray(node.allOf) ? node.allOf : [];
  const structureHolder = allOf.find((c) => c && c.properties && c.properties["cube-structure"]);
  const structure = structureHolder ? structureHolder.properties["cube-structure"].properties || {} : {};

  const dimPrefixItems = (structure.dimensions && structure.dimensions.prefixItems) || [];
  const dimensions = dimPrefixItems.map(extractConceptUnit).filter(Boolean);

  const measureVariants =
    (structure.measures && structure.measures.contains && structure.measures.contains.oneOf) || [];
  const measures = measureVariants.map(extractConceptUnit).filter(Boolean);

  return { dimensions, measures };
}

function walk(node, currentPath, entries) {
  if (!node || typeof node !== "object") return;
  const label = currentPath.length ? currentPath[currentPath.length - 1] : "root";
  const pattern = node["$asm.pattern"];

  if (pattern === "aggregate datum") {
    for (const [key, child] of Object.entries(node.properties || {})) {
      walk(child, currentPath.concat([key]), entries);
    }
    return;
  }

  if (pattern === "quantity datum") {
    entries.push({
      path: currentPath,
      label,
      type: "quantity",
      value: null,
      unit: extractUnit(node),
      property_class: node["$asm.property-class"] || null,
      xsd_type: node["$asm.type"] || null,
      include: true,
    });
    return;
  }

  if (pattern === "value datum") {
    entries.push({
      path: currentPath,
      label,
      type: "scalar",
      value: null,
      unit: null,
      property_class: node["$asm.property-class"] || null,
      xsd_type: node["$asm.type"] || null,
      include: true,
    });
    return;
  }

  if (pattern === "datacube") {
    const meta = extractDatacubeMeta(node);
    entries.push({
      path: currentPath,
      label,
      type: "datacube",
      dimensions: meta.dimensions,
      measures: meta.measures,
      n_points: null,
      property_class: node["$asm.property-class"] || null,
      xsd_type: node["$asm.type"] || null,
      include: false,
    });
    return;
  }

  // no recognized pattern: plain container (e.g. schema root) -> keep recursing
  if (node.properties) {
    for (const [key, child] of Object.entries(node.properties)) {
      walk(child, currentPath.concat([key]), entries);
    }
  }
}

function buildCatalog(schemaPath) {
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
  const entries = [];
  walk(schema, [], entries);
  return entries;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    console.log("Usage: node schema_catalog_builder.js <schema_file.schema> [-o in/catalog/schema_field_catalog.json]");
    process.exit(args.length === 0 ? 1 : 0);
  }

  let schemaFile = null;
  let output = "in/catalog/schema_field_catalog.json";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-o" || args[i] === "--output") {
      output = args[++i];
    } else if (!schemaFile) {
      schemaFile = args[i];
    }
  }
  if (!schemaFile) {
    console.error("Error: schema_file argument is required");
    process.exit(1);
  }

  const entries = buildCatalog(path.resolve(schemaFile));
  const outputPath = path.resolve(output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(entries, null, 2), "utf-8");
  console.log(`Wrote ${entries.length} candidate fields to ${output}`);
}

if (require.main === module) {
  main();
}

module.exports = { buildCatalog, walk, extractUnit, extractDatacubeMeta };
