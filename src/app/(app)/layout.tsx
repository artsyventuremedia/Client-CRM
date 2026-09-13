import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgName = session.user.organizationId
    ? (await prisma.organization.findUnique({ where: { id: session.user.organizationId } }))?.name ?? "ClientOps"
    : "Platform Admin";

  return (
    <div className="flex min-h-screen">
      <Sidebar
        permissions={session.user.permissions}
        isPlatformAdmin={session.user.isPlatformAdmin}
        orgName={orgName}
      />
      <div className="flex flex-1 flex-col">
        <Topbar userName={session.user.name ?? ""} userEmail={session.user.email ?? ""} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
