/**
 * Extract "title|identifier" for each member and return a single string
 * with entries separated by ", ".
 *
 * Usage (Node):
 *   node extract.js path/to/response.json.txt
 *
 * Usage (Browser):
 *   const result = extractTitleIdList(payload);
 *   console.log(result);
 */

function extractTitleIdList(payload) {
  if (!payload || !Array.isArray(payload.member)) return '';

  return payload.member
    .map(m => {
      const title = (typeof m.title === 'string') ? m.title : (m.title ?? '');
      const id = (typeof m.identifier === 'string') ? m.identifier : (m.identifier ?? '');
      // ensure both values are trimmed and keep them even if one is empty
      return `${title.trim()}|${id.trim()}`;
    })
    .filter(entry => entry !== '|' && entry !== '|') // drop entries where both missing
    .join(', ');
}

/* ------------------------
   Node.js example (reads file)
   ------------------------ */
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  const fs = require('fs');
  const path = require('path');

  const filePath = process.argv[2] || path.join(__dirname, 'response.json.txt');

  try {
    const raw = fs.readFileSync(filePath, 'utf8');

    // Try direct parse first; if it fails, attempt to extract the first JSON object from file.
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      // fallback: grab the largest {...} block (simple approach)
      const match = raw.match(/\{[\s\S]*\}/m);
      if (!match) throw new Error('No JSON object found in file');
      data = JSON.parse(match[0]);
    }

    const result = extractTitleIdList(data);
    console.log(result);
  } catch (err) {
    console.error('Failed to read/parse file:', err.message);
    process.exit(1);
  }
}

/* ------------------------
   Browser usage example:
   ------------------------
   // assume `payload` is the parsed JSON object
   const listString = extractTitleIdList(payload);
   console.log(listString);
*/
