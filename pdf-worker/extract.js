const fs = require("fs");
const pdfParse = require("pdf-parse");

async function extractPdf(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  console.log(data.text);
}

// Get file path from command line
const filePath = process.argv[2];

if (!filePath) {
  console.error("No file path provided");
  process.exit(1);
}

extractPdf(filePath).catch((err) => {
  console.error(err);
  process.exit(1);
});
