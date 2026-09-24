import { prisma } from "@/lib/prisma";

export async function notify(params: {
  organizationId: string;
  userId: string;
  event: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  // Never notify a user about their own action, and never let a notification failure break the calling request.
  try {
    await prisma.notification.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        channel: "IN_APP",
        event: params.event,
        title: params.title,
        body: params.body,
        data: params.data === undefined ? undefined : JSON.parse(JSON.stringify(params.data)),
        sentAt: new Date(),
      },
    });
  } catch (error) {
    console.error("notify() failed", error);
  }
}
