import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, handleApiError } from "@/lib/api/guard";
import { can } from "@/lib/rbac/check";

const LIMIT = 5;

export async function GET(request: Request) {
  try {
    const { session, organizationId } = await requireOrgSession();
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    if (q.length < 2) return NextResponse.json({ results: [] });

    const allowed = (resource: Parameters<typeof can>[1]) =>
      session.user.isPlatformAdmin || can(session.user.permissions, resource, "VIEW");

    const [leads, clients, quotations, invoices, tickets, projects] = await Promise.all([
      allowed("leads")
        ? prisma.lead.findMany({
            where: { organizationId, OR: [{ name: { contains: q, mode: "insensitive" } }, { company: { contains: q, mode: "insensitive" } }] },
            select: { id: true, name: true, company: true },
            take: LIMIT,
          })
        : [],
      allowed("clients")
        ? prisma.client.findMany({
            where: { organizationId, OR: [{ name: { contains: q, mode: "insensitive" } }, { companyName: { contains: q, mode: "insensitive" } }] },
            select: { id: true, name: true, companyName: true },
            take: LIMIT,
          })
        : [],
      allowed("quotations")
        ? prisma.quotation.findMany({
            where: { organizationId, quotationNumber: { contains: q, mode: "insensitive" } },
            select: { id: true, quotationNumber: true },
            take: LIMIT,
          })
        : [],
      allowed("invoices")
        ? prisma.invoice.findMany({
            where: { organizationId, invoiceNumber: { contains: q, mode: "insensitive" } },
            select: { id: true, invoiceNumber: true },
            take: LIMIT,
          })
        : [],
      allowed("tickets")
        ? prisma.ticket.findMany({
            where: { organizationId, OR: [{ subject: { contains: q, mode: "insensitive" } }, { ticketNumber: { contains: q, mode: "insensitive" } }] },
            select: { id: true, subject: true, ticketNumber: true },
            take: LIMIT,
          })
        : [],
      allowed("projects")
        ? prisma.project.findMany({
            where: { organizationId, name: { contains: q, mode: "insensitive" } },
            select: { id: true, name: true },
            take: LIMIT,
          })
        : [],
    ]);

    const results = [
      ...leads.map((l) => ({ type: "Lead", id: l.id, label: l.name, sublabel: l.company, href: `/leads/${l.id}` })),
      ...clients.map((c) => ({ type: "Client", id: c.id, label: c.companyName ?? c.name, sublabel: c.name, href: `/clients/${c.id}` })),
      ...quotations.map((qt) => ({ type: "Quotation", id: qt.id, label: qt.quotationNumber, sublabel: null, href: `/quotations/${qt.id}` })),
      ...invoices.map((i) => ({ type: "Invoice", id: i.id, label: i.invoiceNumber, sublabel: null, href: `/invoices/${i.id}` })),
      ...tickets.map((t) => ({ type: "Ticket", id: t.id, label: t.subject, sublabel: t.ticketNumber, href: `/tickets/${t.id}` })),
      ...projects.map((p) => ({ type: "Project", id: p.id, label: p.name, sublabel: null, href: `/projects/${p.id}` })),
    ];

    return NextResponse.json({ results });
  } catch (error) {
    return handleApiError(error);
  }
}
