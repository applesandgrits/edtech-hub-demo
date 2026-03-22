import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateSummary(title: string, abstract: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a research summarizer for education technology evidence. Write a 2-3 sentence plain-language summary suitable for policymakers and practitioners. Focus on key findings and practical implications.",
      },
      {
        role: "user",
        content: `Title: ${title}\n\nAbstract: ${abstract}`,
      },
    ],
    max_tokens: 200,
  });
  return response.choices[0].message.content ?? "";
}

export async function chatWithContext(
  query: string,
  contextChunks: string[],
  documentTitle: string
): Promise<ReadableStream> {
  const context = contextChunks.join("\n\n---\n\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    stream: true,
    messages: [
      {
        role: "system",
        content: `You are a research assistant helping users understand evidence from the EdTech Hub Evidence Library. Answer questions based on the provided document context. Be specific, cite relevant details from the text, and note when information is not available in the provided context.\n\nDocument: "${documentTitle}"`,
      },
      {
        role: "user",
        content: `Context from the document:\n\n${context}\n\n---\n\nQuestion: ${query}`,
      },
    ],
    max_tokens: 1000,
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of response) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) {
          controller.enqueue(encoder.encode(text));
        }
      }
      controller.close();
    },
  });
}

export async function chatAcrossDocuments(
  query: string,
  contextChunks: { text: string; title: string; docId: string }[]
): Promise<ReadableStream> {
  const context = contextChunks
    .map((c) => `[From "${c.title}" (${c.docId})]\n${c.text}`)
    .join("\n\n---\n\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    stream: true,
    messages: [
      {
        role: "system",
        content:
          "You are a research assistant for the EdTech Hub Evidence Library. Answer questions by synthesizing evidence across multiple documents. Cite which documents support each point. Be specific and evidence-based.",
      },
      {
        role: "user",
        content: `Evidence from multiple documents:\n\n${context}\n\n---\n\nQuestion: ${query}`,
      },
    ],
    max_tokens: 1500,
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of response) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) {
          controller.enqueue(encoder.encode(text));
        }
      }
      controller.close();
    },
  });
}
