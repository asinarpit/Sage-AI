import { google } from "@ai-sdk/google";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { searchSimilarChunks } from "@/lib/rag/search";
import { buildSystemPrompt } from "@/lib/rag/prompt";
import { ratelimit } from "@/lib/redis/rate-limit";
import { NextResponse } from "next/server";
import {
  summarizeDocumentTool,
  compareDocumentsTool,
  extractInsightsTool,
  webSearchTool,
} from "@/lib/ai/tools";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Rate limit
    const ip = req.headers.get("x-forwarded-for") || "anonymous";
    const { success } = await ratelimit.limit(ip);

    if (!success) {
      return new NextResponse("Too many requests", { status: 429 });
    }

    const { messages, documentIds, chatId } = await req.json();

    if (!messages || !documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return new NextResponse("messages & documentIds (non-empty array) required", {
        status: 400,
      });
    }

    const lastUserMessage = [...messages]
      .reverse()
      .find((m: any) => m.role === "user");

    if (!lastUserMessage) {
      return new NextResponse("No user message found", { status: 400 });
    }

    const userQuery =
      typeof lastUserMessage.content === "string"
        ? lastUserMessage.content
        : lastUserMessage.parts
            ?.filter((p: any) => p.type === "text")
            .map((p: any) => p.text)
            .join(" ") || "";

    
    const documents = await prisma.document.findMany({
      where: {
        id: { in: documentIds },
        user: { clerkId: userId },
      },
      select: { id: true, title: true, type: true, source: true },
    });

    if (documents.length === 0) {
      return new NextResponse("No valid documents found", { status: 404 });
    }

    //hybrid search
    const chunks = await searchSimilarChunks(userQuery, documentIds);

    const sources = chunks.map((c: any, index: number) => {
      const doc = documents.find((d) => d.id === c.document_id);
      return {
        id: `source-${index}`,
        title: doc?.title || "Unknown Source",
        type: doc?.type || "PDF",
        sourceUrl: doc?.source || "",
        snippet: c.content?.substring(0, 200) || "",
      };
    });

    const context = chunks
      .map((c: any) => {
        const doc = documents.find((d) => d.id === c.document_id);
        const sourceName = doc ? doc.title : "Unknown Source";
        return `[Source: ${sourceName}]\n${c.content}`;
      })
      .join("\n\n---\n\n");

    const docList = documents
      .map((d) => `- "${d.title}" (ID: ${d.id}, Type: ${d.type})`)
      .join("\n");

    const systemPrompt = buildSystemPrompt(context, docList);

    const result = streamText({
      model: google("gemini-2.5-flash"),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools: {
        summarizeDocument: summarizeDocumentTool,
        compareDocuments: compareDocumentsTool,
        extractInsights: extractInsightsTool,
        webSearch: webSearchTool,
      },
      stopWhen: stepCountIs(3),
      onFinish: async ({ text }) => {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { clerkId: userId },
          });

          if (dbUser) {
            await prisma.chat.upsert({
              where: { id: chatId || "new" },
              create: {
                id: chatId || undefined,
                userId: dbUser.id,
                documentId: documentIds[0],
                messages: {
                  create: [
                    { role: "USER", content: userQuery },
                    { role: "ASSISTANT", content: text },
                  ],
                },
              },
              update: {
                messages: {
                  create: [
                    { role: "USER", content: userQuery },
                    { role: "ASSISTANT", content: text },
                  ],
                },
              },
            });
          }
        } catch (err) {
          console.error("Failed to persist chat:", err);
        }
      },
    });

    return result.toUIMessageStreamResponse({
      messageMetadata: ({ part }) => {
        if (part.type === "start") {
          return { sources };
        }
        return undefined;
      },
    });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    
    // Check for specific API errors (Google Gemini 429 / Quota)
    if (error.status === 429 || error.message?.includes("429") || error.message?.toLowerCase().includes("quota")) {
      return new NextResponse("API Quota or Rate Limit reached. Please try again later.", { status: 429 });
    }

    return new NextResponse(error.message || "Chat failed", { status: 500 });
  }
}