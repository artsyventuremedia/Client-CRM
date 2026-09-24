import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api/guard";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
        take: limit,
      }),
      prisma.notification.count({ where: { userId: session.user.id, readAt: null } }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    if (searchParams.get("markAllRead") !== "true") {
      return NextResponse.json({ error: "Unsupported operation" }, { status: 400 });
    }

    await prisma.notification.updateMany({
      where: { userId: session.user.id, readAt: null },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
