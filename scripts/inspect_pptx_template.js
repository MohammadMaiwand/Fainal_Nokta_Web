const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const pptxPath = process.argv[2];

function decodeXml(text) {
  return String(text)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function main() {
  const zip = await JSZip.loadAsync(fs.readFileSync(pptxPath));
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/slide(\d+)/)[1]) - Number(b.match(/slide(\d+)/)[1]));

  for (const name of slideNames) {
    const xml = await zip.file(name).async('string');
    const text = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)]
      .map((match) => decodeXml(match[1]))
      .filter(Boolean);
    console.log(`\n--- ${path.basename(name)} ---`);
    console.log(text.join('\n'));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
