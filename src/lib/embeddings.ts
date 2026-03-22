import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8000),
  });
  return response.data[0].embedding;
}

export function chunkText(text: string, maxTokens = 500, overlap = 50): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  const chunkSize = maxTokens * 4; // rough chars-per-token estimate
  const overlapSize = overlap * 4;

  let start = 0;
  while (start < words.length) {
    const chunk = words.slice(start, start + chunkSize).join(" ");
    if (chunk.trim().length > 0) {
      chunks.push(chunk);
    }
    start += chunkSize - overlapSize;
  }

  return chunks.length > 0 ? chunks : [text];
}
