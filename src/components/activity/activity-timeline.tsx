import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac/check";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ENTITY_RESOURCE } from "@/lib/api/entity-registry";
import { ActivityFeedClient, type ActivityItem } from "@/components/activity/activity-feed-client";
import { describeAction } from "@/lib/activity";

export async function ActivityTimeline({ entityType, entityId }: { entityType: string; entityId: string }) {
  const session = await auth();
  const organizationId = session?.user.organizationId;
  if (!session?.user || !organizationId) return null;

  const resource = ENTITY_RESOURCE[entityType];
  const canComment = resource
    ? session.user.isPlatformAdmin ||
      can(session.user.permissions, resource, "CREATE") ||
      can(session.user.permissions, resource, "EDIT")
    : false;

  const [auditLogs, comments] = await Promise.all([
    prisma.auditLog.findMany({
      where: { organizationId, entityType, entityId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.comment.findMany({
      where: { organizationId, entityType, entityId },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const items: ActivityItem[] = [
    ...auditLogs.map((log) => ({
      id: `audit-${log.id}`,
      kind: "audit" as const,
      text: describeAction(log.action),
      authorName: log.user?.name ?? "System",
      createdAt: log.createdAt.toISOString(),
      canDelete: false,
    })),
    ...comments.map((c) => ({
      id: c.id,
      kind: "comment" as const,
      text: `commented: "${c.content}"`,
      authorName: c.author.name,
      createdAt: c.createdAt.toISOString(),
      canDelete: c.authorId === session.user.id || session.user.isPlatformAdmin,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ActivityFeedClient entityType={entityType} entityId={entityId} items={items} canComment={canComment} />
      </CardContent>
    </Card>
  );
}
