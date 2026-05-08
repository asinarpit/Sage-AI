import { tool } from "ai";
import { z } from "zod";
import { supabase } from "@/lib/db/supabase";
import { prisma } from "@/lib/db/prisma";

export const summarizeDocumentTool = tool({
  description:
    "Summarize an entire document. Use this when the user asks to summarize, give an overview, or describe the contents of a specific document.",
  inputSchema: z.object({
    documentId: z
      .string()
      .describe("The ID of the document to summarize"),
  }),
  execute: async ({ documentId }) => {
    const { data: chunks, error } = await supabase
      .from("embeddings")
      .select("content")
      .eq("document_id", documentId)
      .order("id", { ascending: true });

    if (error || !chunks || chunks.length === 0) {
      return {
        success: false,
        error: "Could not retrieve document content",
      };
    }

    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { title: true, type: true },
    });

    const fullContent = chunks
      .map((c: any) => c.content)
      .join("\n\n");

    const truncated = fullContent.substring(0, 8000);

    return {
      success: true,
      title: doc?.title || "Unknown Document",
      type: doc?.type || "PDF",
      chunkCount: chunks.length,
      content: truncated,
      isTruncated: fullContent.length > 8000,
    };
  },
});

export const compareDocumentsTool = tool({
  description:
    "Compare two documents to find similarities and differences. Use this when the user wants to compare, contrast, or find differences between two documents.",
  inputSchema: z.object({
    documentId1: z.string().describe("The ID of the first document"),
    documentId2: z.string().describe("The ID of the second document"),
  }),
  execute: async ({ documentId1, documentId2 }) => {
    const [result1, result2] = await Promise.all([
      supabase
        .from("embeddings")
        .select("content")
        .eq("document_id", documentId1)
        .order("id", { ascending: true }),
      supabase
        .from("embeddings")
        .select("content")
        .eq("document_id", documentId2)
        .order("id", { ascending: true }),
    ]);

    const [doc1, doc2] = await Promise.all([
      prisma.document.findUnique({
        where: { id: documentId1 },
        select: { title: true, type: true },
      }),
      prisma.document.findUnique({
        where: { id: documentId2 },
        select: { title: true, type: true },
      }),
    ]);

    const content1 = (result1.data || [])
      .map((c: any) => c.content)
      .join("\n\n")
      .substring(0, 5000);

    const content2 = (result2.data || [])
      .map((c: any) => c.content)
      .join("\n\n")
      .substring(0, 5000);

    return {
      success: true,
      document1: {
        title: doc1?.title || "Document 1",
        type: doc1?.type || "PDF",
        content: content1,
        chunkCount: result1.data?.length || 0,
      },
      document2: {
        title: doc2?.title || "Document 2",
        type: doc2?.type || "PDF",
        content: content2,
        chunkCount: result2.data?.length || 0,
      },
    };
  },
});


export const extractInsightsTool = tool({
  description:
    "Extract key insights, themes, and takeaways from the selected documents. Use this when the user asks for insights, key points, important facts, or takeaways.",
  inputSchema: z.object({
    documentIds: z
      .array(z.string())
      .describe("Array of document IDs to extract insights from"),
  }),
  execute: async ({ documentIds }) => {
    // Fetch top chunks from each document
    const allChunks: { title: string; content: string }[] = [];

    for (const docId of documentIds) {
      const [doc, chunks] = await Promise.all([
        prisma.document.findUnique({
          where: { id: docId },
          select: { title: true },
        }),
        supabase
          .from("embeddings")
          .select("content")
          .eq("document_id", docId)
          .order("id", { ascending: true })
          .limit(5), // Top 5 chunks per document
      ]);

      for (const chunk of chunks.data || []) {
        allChunks.push({
          title: doc?.title || "Unknown",
          content: chunk.content,
        });
      }
    }

    // Format as labeled content
    const formattedContent = allChunks
      .map((c) => `[${c.title}]\n${c.content}`)
      .join("\n\n---\n\n")
      .substring(0, 10000);

    return {
      success: true,
      documentCount: documentIds.length,
      totalChunks: allChunks.length,
      content: formattedContent,
    };
  },
});

// Tool: Live Web Search via Serper
export const webSearchTool = tool({
  description:
    "Perform a live Google search to cross-check information, find recent news, or verify facts from the web. Use this when the user asks for current events or to verify data against the internet.",
  inputSchema: z.object({
    query: z.string().describe("The search query to look up on Google"),
  }),
  execute: async ({ query }) => {
    try {
      const response = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": process.env.SERPER_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: query, num: 5 }),
      });

      const data = await response.json();

      if (!data.organic) {
        return {
          success: false,
          error: "No search results found.",
        };
      }

      // Format the results for the LLM
      const results = data.organic.map((res: any) => ({
        title: res.title,
        link: res.link,
        snippet: res.snippet,
      }));

      return {
        success: true,
        query,
        results,
      };
    } catch (error) {
      console.error("Serper search failed:", error);
      return {
        success: false,
        error: "Failed to perform web search.",
      };
    }
  },
});
