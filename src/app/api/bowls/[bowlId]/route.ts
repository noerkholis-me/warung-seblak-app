import prisma from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bowlId: string }> },
) {
  const { bowlId } = await params;

  const bowl = await prisma.bowl.findUnique({
    where: { id: bowlId },
  });

  if (!bowl) {
    return NextResponse.json(
      { error: "Wadah tidak ditemukan" },
      { status: 404 },
    );
  }

  return NextResponse.json(bowl);
}
