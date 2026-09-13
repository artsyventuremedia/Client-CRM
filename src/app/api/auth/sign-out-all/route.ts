import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api/guard";
import { recordAudit } from "@/lib/audit";

export async function POST() {
  try {
    const session = await requireSession();

    await prisma.user.update({
      where: { id: session.user.id },
      data: { tokenVersion: { increment: 1 } },
    });

    await recordAudit({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "user.signed_out_all_devices",
      entityType: "User",
      entityId: session.user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
