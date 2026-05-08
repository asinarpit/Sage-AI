import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { documentId } = await req.json();

  const chat = await prisma.chat.create({
    data: {
      user: { connect: { clerkId: userId } },
      document: { connect: { id: documentId } },
    },
  });

  return NextResponse.json({ chatId: chat.id });
}