import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { extractTextFromPDF } from "@/lib/rag/pdf";
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

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new NextResponse("No file uploaded", { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract text
    const text = await extractTextFromPDF(buffer);

    const document = await prisma.document.create({
      data: {
        title: file.name,
        type: "PDF",
        source: file.name,
        user: {
          connectOrCreate: {
            where: { clerkId: userId },
            create: {
              clerkId: userId,
              email: user.emailAddresses[0]?.emailAddress,
            },
          },
        },
      },
    });

    // Chunk text
    const chunks = chunkText(text);

    const createdChunks = await prisma.chunk.createMany({
      data: chunks.map((chunk) => ({
        content: chunk,
        documentId: document.id,
      })),
    });

    // embedding generation
    const batchSize = 10;
    const embeddingsToInsert = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchPromises = batch.map(async (chunk) => {
        const embedding = await generateEmbedding(chunk);
        return {
          content: chunk,
          embedding,
          document_id: document.id,
        };
      });

      const resolvedBatch = await Promise.all(batchPromises);
      embeddingsToInsert.push(...resolvedBatch);

      if (i + batchSize < chunks.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    const { error: supabaseError } = await supabase
      .from("embeddings")
      .insert(embeddingsToInsert);

    if (supabaseError) {
      console.error("Supabase Error:", supabaseError);
      throw new Error("Failed to store embeddings");
    }

    return NextResponse.json({
      success: true,
      documentId: document.id,
      url: file.name,
      chunks: chunks.length,
    });

  } catch (error) {
    console.error(error);
    return new NextResponse("Upload failed", { status: 500 });
  }
}