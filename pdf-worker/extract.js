const pdfParse = require("pdf-parse");

async function extractPdf(bufferData) {
  const data = await pdfParse(bufferData);
  return data.text;
}

// Get base64 encoded PDF from stdin
let inputData = "";

process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => {
  inputData += chunk;
});

process.stdin.on("end", async () => {
  try {
    // Decode base64 to buffer
    const buffer = Buffer.from(inputData.trim(), "base64");
    const text = await extractPdf(buffer);
    console.log(text);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
});
