import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, ApiError, handleApiError } from "@/lib/api/guard";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session, organizationId } = await requireOrgSession();

    const comment = await prisma.comment.findFirst({ where: { id, organizationId } });
    if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    if (comment.authorId !== session.user.id && !session.user.isPlatformAdmin) {
      throw new ApiError(403, "You can only delete your own comments");
    }

    await prisma.comment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
