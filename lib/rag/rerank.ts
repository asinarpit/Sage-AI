import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";

interface Chunk {
  id?: string;
  content: string;
  document_id: string;
  similarity?: number;
  keyword_score?: number;
  search_type?: string;
  [key: string]: any;
}

export const rerankChunks = async (
  query: string,
  chunks: Chunk[],
  topK: number = 5
): Promise<Chunk[]> => {
  if (chunks.length === 0) return [];
  if (chunks.length <= topK) return chunks;

  const chunkSummaries = chunks.map((chunk, index) => ({
    index,
    preview: (chunk.content || "").substring(0, 300),
  }));

  try {
    const result = await generateText({
      model: google("gemini-2.5-flash"),
      output: Output.object({
        schema: z.object({
          rankings: z.array(
            z.object({
              index: z.number().describe("The chunk index from the list"),
              relevance: z
                .number()
                .min(0)
                .max(10)
                .describe("Relevance score 0-10, where 10 is most relevant"),
            })
          ),
        }),
      }),
      prompt: `You are a relevance scoring system. Given a user query and a list of text chunks, score each chunk's relevance to the query on a scale of 0-10.

User Query: "${query}"

Text Chunks:
${chunkSummaries
  .map((c) => `[Chunk ${c.index}]: ${c.preview}`)
  .join("\n\n")}

Score each chunk's relevance. A score of 10 means the chunk directly answers the query. A score of 0 means it's completely irrelevant. Return ALL chunk indices with their scores.`,
    });

    const rankings = result.output?.rankings;
    if (!rankings || rankings.length === 0) {
      return chunks.slice(0, topK);
    }

    const sorted = rankings
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, topK);

    const reranked = sorted
      .map((r) => {
        const chunk = chunks[r.index];
        if (!chunk) return null;
        return {
          ...chunk,
          rerank_score: r.relevance,
        };
      })
      .filter(Boolean) as Chunk[];

    return reranked;
  } catch (error) {
    console.error("Re-ranking failed, using original order:", error);
    return chunks.slice(0, topK);
  }
};
