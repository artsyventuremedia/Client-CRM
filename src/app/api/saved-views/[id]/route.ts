import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, handleApiError } from "@/lib/api/guard";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session, organizationId } = await requireOrgSession();

    const existing = await prisma.savedView.findFirst({ where: { id, userId: session.user.id, organizationId } });
    if (!existing) return NextResponse.json({ error: "Saved view not found" }, { status: 404 });

    await prisma.savedView.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
