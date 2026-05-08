import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { fetchUrlContent } from "@/lib/rag/url";
import { chunkText } from "@/lib/rag/chunk";
import { generateEmbedding } from "@/lib/ai/embedding";
import { supabase } from "@/lib/db/supabase";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { url } = await req.json();

    if (!url) {
      return new NextResponse("URL is required", { status: 400 });
    }

    const content = await fetchUrlContent(url);

    // Create user if not exists
    const dbUser = await prisma.user.upsert({
      where: { clerkId: userId },
      update: { email: user.emailAddresses[0]?.emailAddress },
      create: {
        clerkId: userId,
        email: user.emailAddresses[0]?.emailAddress,
      },
    });

    const document = await prisma.document.create({
      data: {
        title: url,
        type: "URL",
        source: url,
        userId: dbUser.id,
      },
    });

    const chunks = chunkText(content);

    await prisma.chunk.createMany({
      data: chunks.map((chunk) => ({
        content: chunk,
        documentId: document.id,
      })),
    });

    // Generate and store embeddings in Supabase
    const batchSize = 10;
    const embeddingsToInsert = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchPromises = batch.map(async (chunk) => {
        try {
          const embedding = await generateEmbedding(chunk);
          return {
            content: chunk,
            embedding,
            document_id: document.id,
          };
        } catch (e) {
          console.error("Embedding failed for chunk:", e);
          return null;
        }
      });

      const resolvedBatch = (await Promise.all(batchPromises)).filter(Boolean);
      embeddingsToInsert.push(...resolvedBatch);

      if (i + batchSize < chunks.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (embeddingsToInsert.length > 0) {
      const { error: supabaseError } = await supabase
        .from("embeddings")
        .insert(embeddingsToInsert);

      if (supabaseError) {
        console.error("Supabase Error:", supabaseError);
        throw new Error("Failed to store embeddings");
      }
    }

    return NextResponse.json({
      success: true,
      documentId: document.id,
      url: url,
      chunks: chunks.length,
    });

  } catch (error) {
    console.error(error);
    return new NextResponse("Ingestion failed", { status: 500 });
  }
}