export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";


const execFileAsync = promisify(execFile);

// SUPABASE CLIENT - Use service role key for uploads
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

//GROQ
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: "https://api.groq.com/openai/v1",
});

// -----------------------------
// TEXT CLEANING HELPERS
// -----------------------------

function findRepeatedLines(lines: string[], threshold = 5): Set<string> {
  const frequency = new Map<string, number>();

  for (const line of lines) {
    const cleaned = line.trim();
    if (cleaned.length < 5) continue;
    frequency.set(cleaned, (frequency.get(cleaned) || 0) + 1);
  }

  return new Set(
    [...frequency.entries()]
      .filter(([_, count]) => count >= threshold)
      .map(([line]) => line)
  );
}

const JUNK_PATTERNS: RegExp[] = [
  /^page\s*\d+/i,
  /\b\w+\.(pdf|qxd|doc|ps)\b/i,
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,
  /\b\d{1,2}:\d{2}\s*(AM|PM)\b/i,
  /\b(endpapers|proof|draft|print|press)\b/i,
];

function isMostlyText(line: string): boolean {
  const letters = (line.match(/[a-zA-Z]/g) || []).length;
  const total = line.length;
  if (total === 0) return false;
  return letters / total > 0.6;
}

function cleanExtractedText(rawText: string): string {
  const lines = rawText.replace(/\r\n/g, "\n").split("\n");
  const repeatedLines = findRepeatedLines(lines);

  const cleanedLines = lines.filter(line => {
    const trimmed = line.trim();
    if (!trimmed) return false;

    // remove repeated headers/footers
    if (repeatedLines.has(trimmed)) return false;

    // remove known junk patterns
    for (const pattern of JUNK_PATTERNS) {
      if (pattern.test(trimmed)) return false;
    }

    // remove symbol-heavy / table-like lines
    if (!isMostlyText(trimmed)) return false;

    // remove very short meaningless lines
    if (trimmed.length < 20) return false;

    return true;
  });

  return cleanedLines.join("\n\n");
}
// -----------------------------
// TEXT CHUNKING HELPER
// -----------------------------

function chunkText(
  text: string,
  maxChars = 3000
): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];

  let currentChunk = "";

  for (const para of paragraphs) {
    // If a single paragraph is too large, skip it (rare)
    if (para.length > maxChars) {
      continue;
    }

    // If adding this paragraph exceeds limit → start new chunk
    if ((currentChunk + para).length > maxChars) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = para + "\n\n";
    } else {
      currentChunk += para + "\n\n";
    }
  }

  // Push remaining text
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
async function generateMcqsFromChunk(
  chunk: string,
  mcqCount: number
) {
const systemPrompt = `
You are an expert educational content creator.

STRICT RULES:
- Output MUST be valid JSON
- Output MUST start with '{' and end with '}'
- Do NOT include text before or after JSON
- Do NOT include markdown
- Do NOT include explanations outside JSON
- Use ONLY the given text
- Do NOT add external knowledge
- Do NOT guess missing information
- Each MCQ must have exactly 4 options (A–D)
- Only ONE option must be correct
- Avoid "All of the above" and "None of the above"

IMPORTANT:
- Try to generate ${mcqCount} MCQs
- If not possible, generate fewer (but NOT zero)
`;



  const userPrompt = `
Text:
"""
${chunk}
"""

Output JSON schema:
{
  "mcqs": [
    {
      "question": "string",
      "options": {
        "A": "string",
        "B": "string",
        "C": "string",
        "D": "string"
      },
      "correctAnswer": "A | B | C | D",
      "difficulty": "easy | medium | hard",
      "sourceSentence": "string"
    }
  ]
}
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0.3,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
    function safeJsonParse(text: string) {
  try {
    // Extract first JSON object found
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

 const raw = completion.choices[0].message.content || "";
 console.log("RAW MODEL OUTPUT:\n", raw);

const parsed = safeJsonParse(raw);

if (!parsed || !Array.isArray(parsed.mcqs)) {
  console.warn("Skipping chunk due to invalid JSON");
  return { mcqs: [] };
}


return parsed;

}
function reduceChunksSymmetrically(
  chunks: string[],
  targetCount: number
): string[] {
  let start = 0;
  let end = chunks.length - 1;

  const keep = [...chunks];

  while (keep.length > targetCount) {
    if ((keep.length - targetCount) % 2 === 1) {
      // remove from start
      keep.splice(start, 1);
    } else {
      // remove from end
      keep.splice(end, 1);
    }
    end = keep.length - 1;
  }

  return keep;
}

import PDFDocument from "pdfkit";


async function generateMcqPdf(
  mcqs: any[],
  outputPath: string
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      font: "Roboto.ttf",
    });

    doc.registerFont(
      "Roboto",
      "fonts/Roboto.ttf"
    );

    doc.font("Roboto");

    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", async () => {
      try {
        const pdfBuffer = Buffer.concat(chunks);
        const fileName = `mcq-${Date.now()}.pdf`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from("mcq-pdfs")
          .upload(fileName, pdfBuffer, {
            contentType: "application/pdf",
            upsert: false,
          });

        if (error) {
          console.error("Supabase upload error:", error);
          reject(error);
          return;
        }

        // create signed URL valid for 60 seconds
        const { data: signedData, error: signedErr } = await supabase.storage
          .from("mcq-pdfs")
          .createSignedUrl(fileName, 60);

        if (signedErr) {
          console.error("Signed URL error:", signedErr);
          reject(signedErr);
          return;
        }

        resolve(signedData.signedUrl);
      } catch (err) {
        reject(err);
      }
    });

    doc.on("error", reject);

    // Title
    doc
      .fontSize(18)
      .text("MCQ Generator", { align: "center" })
      .moveDown(2);

    mcqs.forEach((mcq, index) => {
      doc
        .fontSize(12)
        .text(`Q${index + 1}. ${mcq.question}`)
        .moveDown(0.5);

      const options = mcq.options;
      doc.text(`A. ${options.A}`);
      doc.text(`B. ${options.B}`);
      doc.text(`C. ${options.C}`);
      doc.text(`D. ${options.D}`);

      doc.moveDown();
    });

    doc.end();
  });
}



export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const requestedMcqs = Number(formData.get("mcqCount") || 10);
    const pdfBlob = formData.get("pdf");

    

    if (!pdfBlob || !(pdfBlob instanceof Blob)) {
      return NextResponse.json(
        { success: false, message: "Invalid PDF upload" },
        { status: 400 }
      );
    }

    // 1️⃣ Save PDF to temp file
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const tempFilePath = join(
      process.cwd(),
      "tmp-upload.pdf"
    );

    await writeFile(tempFilePath, buffer);

    // 2️⃣ Call PDF worker
    const { stdout } = await execFileAsync(
      "node",
      ["pdf-worker/extract.js", tempFilePath],
      { maxBuffer: 10 * 1024 * 1024 } // 10MB
    );

    // 3️⃣ stdout = extracted text
    const extractedText = stdout.trim();
const cleanedText = cleanExtractedText(extractedText);
let chunks = chunkText(cleanedText);

if (requestedMcqs < chunks.length) {
  chunks = reduceChunksSymmetrically(
    chunks,
    requestedMcqs
  );

    // 🔍 DEBUG: save full extracted text to file
    await writeFile(
  "debug-chunks.json",
  JSON.stringify(chunks, null, 2),
  "utf-8"
);




}

  // 4️⃣ Generate MCQs for each chunk

const mcqsPerChunk = Math.ceil(
  requestedMcqs / chunks.length
);

let allMcqs: any[] = [];

for (let i = 0; i < chunks.length; i++) {
  if (allMcqs.length >= requestedMcqs) break;

  try {
    const result = await generateMcqsFromChunk(
      chunks[i],
      mcqsPerChunk
    );

    if (result?.mcqs?.length) {
      allMcqs.push(...result.mcqs);
    }
  } catch (err) {
    console.error(`Chunk ${i + 1} failed`, err);
  }
  
}
// Trim to requested MCQ count
allMcqs = allMcqs.slice(0, requestedMcqs);

const pdfUrl = await generateMcqPdf(allMcqs, "");

return NextResponse.json({
  success: true,
  totalMcqs: allMcqs.length,
  downloadUrl: pdfUrl,
});



  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "PDF processing failed" },
      { status: 500 }
    );
  }
}
