import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError, ApiError } from "@/lib/api/guard";
import { updateVendorSchema } from "@/lib/validation/vendor";
import { recordAudit } from "@/lib/audit";

async function loadVendorOrThrow(id: string, organizationId: string) {
  const vendor = await prisma.vendor.findFirst({ where: { id, organizationId } });
  if (!vendor) throw new ApiError(404, "Vendor not found");
  return vendor;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "vendors", "VIEW");
    const { id } = await params;

    const vendor = await prisma.vendor.findFirst({
      where: { id, organizationId },
      include: { contacts: true },
    });
    if (!vendor) throw new ApiError(404, "Vendor not found");

    return NextResponse.json({ vendor });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "vendors", "EDIT");
    const { id } = await params;

    const existing = await loadVendorOrThrow(id, organizationId);

    const body = await request.json().catch(() => null);
    const parsed = updateVendorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const vendor = await prisma.vendor.update({
      where: { id },
      data: {
        ...(data.companyName !== undefined ? { companyName: data.companyName } : {}),
        ...(data.skills !== undefined
          ? {
              skills: data.skills
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            }
          : {}),
        ...(data.location !== undefined ? { location: data.location || null } : {}),
        ...(data.paymentTerms !== undefined ? { paymentTerms: data.paymentTerms || null } : {}),
        ...(data.gstNumber !== undefined ? { gstNumber: data.gstNumber || null } : {}),
        ...(data.panNumber !== undefined ? { panNumber: data.panNumber || null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "vendor.updated",
      entityType: "Vendor",
      entityId: vendor.id,
      previousValue: existing,
      newValue: vendor,
    });

    return NextResponse.json({ vendor });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "vendors", "DELETE");
    const { id } = await params;

    const existing = await loadVendorOrThrow(id, organizationId);
    await prisma.vendor.delete({ where: { id } });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "vendor.deleted",
      entityType: "Vendor",
      entityId: id,
      previousValue: existing,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
