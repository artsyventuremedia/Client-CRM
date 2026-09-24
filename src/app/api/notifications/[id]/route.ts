import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api/guard";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession();

    const notification = await prisma.notification.findFirst({ where: { id, userId: session.user.id } });
    if (!notification) return NextResponse.json({ error: "Notification not found" }, { status: 404 });

    const updated = await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
    return NextResponse.json({ notification: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
