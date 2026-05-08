import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { chunkText } from "@/lib/rag/chunk";
import { generateEmbedding } from "@/lib/ai/embedding";
import { supabase } from "@/lib/db/supabase";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { title, content } = await req.json();

    if (!title || !content) {
      return new NextResponse("Title and content required", { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      return new NextResponse("User not found", { status: 404 });
    }

    const document = await prisma.document.create({
      data: {
        title,
        type: "NOTE",
        source: "Manual Note",
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

    // Embeddings
    const embeddingsToInsert = await Promise.all(
      chunks.map(async (chunk) => {
        const embedding = await generateEmbedding(chunk);
        return {
          content: chunk,
          embedding,
          document_id: document.id,
        };
      })
    );

    await supabase.from("embeddings").insert(embeddingsToInsert);

    return NextResponse.json({ success: true, documentId: document.id });
  } catch (error) {
    console.error(error);
    return new NextResponse("Note creation failed", { status: 500 });
  }
}
