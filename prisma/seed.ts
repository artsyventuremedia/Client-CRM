import { PrismaClient, SystemRole } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_ROLE_MATRIX } from "../src/lib/rbac/matrix";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Password@123";

async function seedGlobalRoles() {
  const roles: Record<string, string> = {};
  for (const systemRole of Object.keys(DEFAULT_ROLE_MATRIX) as SystemRole[]) {
    let role = await prisma.role.findFirst({
      where: { organizationId: null, name: systemRole },
    });
    if (!role) {
      role = await prisma.role.create({
        data: {
          name: systemRole,
          systemRole,
          isSystem: true,
          organizationId: null,
        },
      });
    }
    roles[systemRole] = role.id;

    const grants = DEFAULT_ROLE_MATRIX[systemRole];
    for (const [resource, permissions] of Object.entries(grants)) {
      for (const permission of permissions ?? []) {
        await prisma.rolePermission.upsert({
          where: { roleId_resource_permission: { roleId: role.id, resource, permission } },
          update: {},
          create: { roleId: role.id, resource, permission },
        });
      }
    }
  }
  return roles;
}

async function seedPlans() {
  const plans = [
    { tier: "FREE" as const, name: "Free", priceMonthly: 0, priceAnnual: 0, maxUsers: 3, maxClients: 10 },
    { tier: "STARTER" as const, name: "Starter", priceMonthly: 1999, priceAnnual: 19999, maxUsers: 10, maxClients: 100 },
    { tier: "PROFESSIONAL" as const, name: "Professional", priceMonthly: 4999, priceAnnual: 49999, maxUsers: 30, maxClients: 500 },
    { tier: "BUSINESS" as const, name: "Business", priceMonthly: 9999, priceAnnual: 99999, maxUsers: 100, maxClients: 2000 },
    { tier: "ENTERPRISE" as const, name: "Enterprise", priceMonthly: 24999, priceAnnual: 249999, maxUsers: 1000, maxClients: 100000 },
  ];
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { tier: plan.tier },
      update: {},
      create: { ...plan, features: {} },
    });
  }
  return prisma.plan.findUniqueOrThrow({ where: { tier: "PROFESSIONAL" } });
}

async function main() {
  console.log("Seeding global RBAC roles...");
  const roles = await seedGlobalRoles();

  console.log("Seeding SaaS plans...");
  const professionalPlan = await seedPlans();

  console.log("Seeding platform super admin...");
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { organizationId: null, email: "superadmin@clientops.dev" },
  });
  if (!existingSuperAdmin) {
    await prisma.user.create({
      data: {
        email: "superadmin@clientops.dev",
        name: "Platform Super Admin",
        passwordHash,
        isPlatformAdmin: true,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        organizationId: null,
      },
    });
  }

  console.log("Seeding demo organization...");
  const org = await prisma.organization.upsert({
    where: { slug: "acme-services" },
    update: {},
    create: {
      name: "Acme Services Pvt Ltd",
      slug: "acme-services",
      gstNumber: "27AAAPL1234C1Z5",
      panNumber: "AAAPL1234C",
      currency: "INR",
      invoicePrefix: "ACME-INV",
      quotationPrefix: "ACME-QUO",
    },
  });

  await prisma.subscription.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      planId: professionalPlan.id,
      status: "ACTIVE",
      billingCycle: "ANNUAL",
      renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  const demoUsers: Array<{ email: string; name: string; role: SystemRole }> = [
    { email: "owner@acme.dev", name: "Olivia Owner", role: "ORG_OWNER" },
    { email: "admin@acme.dev", name: "Amit Admin", role: "ADMIN" },
    { email: "salesmanager@acme.dev", name: "Sana Sales Manager", role: "SALES_MANAGER" },
    { email: "salesexec@acme.dev", name: "Ravi Sales Exec", role: "SALES_EXECUTIVE" },
    { email: "accountmanager@acme.dev", name: "Ana Account Manager", role: "ACCOUNT_MANAGER" },
    { email: "pm@acme.dev", name: "Priya PM", role: "PROJECT_MANAGER" },
    { email: "employee@acme.dev", name: "Emma Employee", role: "EMPLOYEE" },
    { email: "finance@acme.dev", name: "Faisal Finance", role: "FINANCE_MANAGER" },
    { email: "support@acme.dev", name: "Sam Support", role: "SUPPORT_AGENT" },
    { email: "vendor@acme.dev", name: "Vikram Vendor", role: "VENDOR" },
    { email: "client@acme.dev", name: "Chris Client", role: "CLIENT" },
  ];

  const userIds: Record<SystemRole, string> = {} as Record<SystemRole, string>;
  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { organizationId_email: { organizationId: org.id, email: u.email } },
      update: {},
      create: {
        organizationId: org.id,
        email: u.email,
        name: u.name,
        passwordHash,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
    });
    userIds[u.role] = user.id;
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: roles[u.role] } },
      update: {},
      create: { userId: user.id, roleId: roles[u.role] },
    });
  }

  console.log("Seeding service catalog...");
  const category = await prisma.serviceCategory.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "Digital Services" } },
    update: {},
    create: { organizationId: org.id, name: "Digital Services", description: "Web, marketing and cloud services" },
  });

  const services = await Promise.all(
    [
      { name: "Website Development", pricingModel: "PROJECT_BASED" as const, oneTimePrice: 150000 },
      { name: "SEO Retainer", pricingModel: "RETAINER" as const, monthlyPrice: 25000 },
      { name: "Cloud Hosting AMC", pricingModel: "SUBSCRIPTION" as const, annualPrice: 60000 },
    ].map((s) =>
      prisma.service.create({
        data: { organizationId: org.id, categoryId: category.id, ...s, taxRatePercent: 18 },
      }),
    ),
  );

  console.log("Seeding leads...");
  const lead = await prisma.lead.create({
    data: {
      organizationId: org.id,
      name: "Rahul Mehta",
      company: "Mehta Textiles",
      email: "rahul@mehtatextiles.in",
      phone: "+91-9876543210",
      source: "Website",
      requirement: "Need a new e-commerce website and SEO",
      estimatedValue: 200000,
      assignedToId: userIds.SALES_EXECUTIVE,
      priority: "HIGH",
      status: "QUALIFIED",
      nextFollowupAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.leadFollowup.create({
    data: {
      leadId: lead.id,
      ownerId: userIds.SALES_EXECUTIVE,
      type: "CALL",
      purpose: "Discuss requirements in detail",
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      status: "PENDING",
    },
  });

  console.log("Seeding client...");
  const client = await prisma.client.create({
    data: {
      organizationId: org.id,
      name: "Sunrise Retail Pvt Ltd",
      companyName: "Sunrise Retail Pvt Ltd",
      category: "BUSINESS",
      industry: "Retail",
      gstNumber: "29AACCS1234B1Z8",
      salesOwnerId: userIds.SALES_MANAGER,
      accountManagerId: userIds.ACCOUNT_MANAGER,
      status: "ACTIVE",
      tags: ["priority", "ecommerce"],
      contacts: {
        create: {
          userId: userIds.CLIENT,
          name: "Chris Client",
          email: "client@acme.dev",
          designation: "Operations Head",
          isPrimary: true,
        },
      },
      addresses: {
        create: {
          type: "BILLING",
          line1: "12 MG Road",
          city: "Bengaluru",
          state: "Karnataka",
          country: "India",
          postalCode: "560001",
        },
      },
    },
  });

  console.log("Seeding quotation...");
  const quotation = await prisma.quotation.create({
    data: {
      organizationId: org.id,
      quotationNumber: "ACME-QUO-0001",
      clientId: client.id,
      salespersonId: userIds.SALES_MANAGER,
      status: "APPROVED",
      expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      subtotal: 150000,
      taxTotal: 27000,
      grandTotal: 177000,
      terms: "50% advance, 50% on delivery",
      respondedAt: new Date(),
      items: {
        create: {
          serviceId: services[0].id,
          description: "Website Development - E-commerce",
          quantity: 1,
          unitPrice: 150000,
          taxPercent: 18,
          lineTotal: 177000,
        },
      },
    },
  });

  console.log("Seeding contract & service order...");
  const contract = await prisma.contract.create({
    data: {
      organizationId: org.id,
      contractNumber: "ACME-CON-0001",
      clientId: client.id,
      quotationId: quotation.id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      contractValue: 177000,
      status: "ACTIVE",
    },
  });

  const serviceOrder = await prisma.serviceOrder.create({
    data: {
      organizationId: org.id,
      clientId: client.id,
      serviceId: services[0].id,
      contractId: contract.id,
      price: 150000,
      taxPercent: 18,
      billingCycle: "ONE_TIME",
      startDate: new Date(),
      status: "ACTIVE",
      accountManagerId: userIds.ACCOUNT_MANAGER,
    },
  });

  console.log("Seeding project & tasks...");
  const project = await prisma.project.create({
    data: {
      organizationId: org.id,
      clientId: client.id,
      serviceOrderId: serviceOrder.id,
      name: "Sunrise Retail E-commerce Website",
      managerId: userIds.PROJECT_MANAGER,
      startDate: new Date(),
      targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      budget: 150000,
      status: "IN_PROGRESS",
      members: { create: [{ userId: userIds.EMPLOYEE, role: "Developer" }] },
      milestones: {
        create: [
          { name: "Design Approval", dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
          { name: "Development Complete", dueDate: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000) },
        ],
      },
    },
  });

  await prisma.task.create({
    data: {
      organizationId: org.id,
      clientId: client.id,
      projectId: project.id,
      title: "Design homepage mockups",
      assigneeId: userIds.EMPLOYEE,
      createdById: userIds.PROJECT_MANAGER,
      priority: "HIGH",
      status: "IN_PROGRESS",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("Seeding invoice & payment...");
  const invoice = await prisma.invoice.create({
    data: {
      organizationId: org.id,
      invoiceNumber: "ACME-INV-0001",
      clientId: client.id,
      status: "PARTIALLY_PAID",
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      subtotal: 150000,
      taxTotal: 27000,
      grandTotal: 177000,
      amountPaid: 88500,
      items: {
        create: {
          description: "Website Development - Advance (50%)",
          quantity: 1,
          unitPrice: 75000,
          taxPercent: 18,
          lineTotal: 88500,
        },
      },
    },
  });

  await prisma.payment.create({
    data: {
      organizationId: org.id,
      clientId: client.id,
      invoiceId: invoice.id,
      amount: 88500,
      method: "BANK_TRANSFER",
      status: "SUCCESS",
      transactionId: "TXN-DEMO-0001",
      paidAt: new Date(),
    },
  });

  console.log("Seeding ticket & appointment...");
  await prisma.ticket.create({
    data: {
      organizationId: org.id,
      ticketNumber: "ACME-TCK-0001",
      clientId: client.id,
      subject: "Homepage banner not loading on mobile",
      description: "The hero banner image does not render on iOS Safari.",
      priority: "MEDIUM",
      status: "OPEN",
      assigneeId: userIds.SUPPORT_AGENT,
    },
  });

  await prisma.appointment.create({
    data: {
      organizationId: org.id,
      clientId: client.id,
      organizerId: userIds.ACCOUNT_MANAGER,
      title: "Project kickoff meeting",
      type: "ONLINE",
      status: "SCHEDULED",
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      meetingUrl: "https://meet.example.com/kickoff",
    },
  });

  console.log("Seed complete.");
  console.log(`Demo login password for all seeded users: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
