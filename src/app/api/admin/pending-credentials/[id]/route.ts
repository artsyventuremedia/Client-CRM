import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requirePermission, ApiError, handleApiError } from "@/lib/api/guard";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession();

    const existing = await prisma.pendingCredential.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!session.user.isPlatformAdmin) {
      if (session.user.organizationId !== existing.organizationId) {
        throw new ApiError(403, "You can only access your own organization's data");
      }
      requirePermission(session, "users", "EDIT");
    }

    await prisma.pendingCredential.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
