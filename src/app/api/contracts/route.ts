import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, requirePermission, handleApiError } from "@/lib/api/guard";
import { createContractSchema } from "@/lib/validation/contract";
import { recordAudit } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "contracts", "VIEW");

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "20")));

    const where = {
      organizationId,
      ...(search
        ? {
            OR: [
              { contractNumber: { contains: search, mode: "insensitive" as const } },
              { client: { name: { contains: search, mode: "insensitive" as const } } },
              { client: { companyName: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        include: { client: { select: { id: true, name: true, companyName: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.contract.count({ where }),
    ]);

    return NextResponse.json({ contracts, total, page, pageSize });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    requirePermission(session, "contracts", "CREATE");

    const body = await request.json().catch(() => null);
    const parsed = createContractSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const count = await prisma.contract.count({ where: { organizationId } });
    const contractNumber = `CON-${String(count + 1).padStart(4, "0")}`;

    const contract = await prisma.contract.create({
      data: {
        organizationId,
        contractNumber,
        clientId: parsed.data.clientId,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate ?? null,
        contractValue: parsed.data.contractValue,
        paymentTerms: parsed.data.paymentTerms || null,
        renewalTerms: parsed.data.renewalTerms || null,
        slaTerms: parsed.data.slaTerms || null,
      },
    });

    await recordAudit({
      organizationId,
      userId: session.user.id,
      action: "contract.created",
      entityType: "Contract",
      entityId: contract.id,
      newValue: contract,
    });

    return NextResponse.json({ contract }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
