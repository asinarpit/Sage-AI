import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const documents = await prisma.document.findMany({
      where: {
        user: { clerkId: userId },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: { chunks: true },
        },
      },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error(error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
