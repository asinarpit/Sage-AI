import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  // Check authorization
  const { searchParams } = new URL(request.url);
  const authHeader = request.headers.get("authorization");
  const token = searchParams.get("token") || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : authHeader);

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && token !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Perform a lightweight query directly on the PostgreSQL database
    // to keep the Supabase database instance active and prevent pausing.
    const result = await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      success: true,
      message: "Database pinged successfully.",
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error: any) {
    console.error("Keep alive cron error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to keep database alive",
      },
      { status: 500 }
    );
  }
}
