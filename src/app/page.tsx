import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FEATURES = [
  {
    title: "Leads to Clients",
    description: "Track prospects through a full pipeline and convert them into clients with one click, date-stamped for reporting.",
  },
  {
    title: "Quotations, Contracts & Invoicing",
    description: "Generate quotations, turn them into contracts, and bill clients — with line items, taxes, and payment tracking built in.",
  },
  {
    title: "Projects & Tasks",
    description: "Run delivery work with projects, milestones, and assignable tasks tied back to the client and contract that funded them.",
  },
  {
    title: "Support Tickets",
    description: "A shared ticketing queue your team and your clients can both see, comment on, and resolve together.",
  },
  {
    title: "Client Portal",
    description: "Give clients their own scoped login to view invoices, approve quotations, track tickets, and see project status — nothing more.",
  },
  {
    title: "Kickoff Docs & Content Sheets",
    description: "Share a structured project brief once a deal closes, and run monthly content calendars your clients can contribute to directly.",
  },
  {
    title: "Automations & Notifications",
    description: "Auto-assign new leads round-robin, notify the right person the moment something needs attention, and keep everyone in the loop.",
  },
  {
    title: "Role-Based Access",
    description: "Company owners, employees, and clients each see exactly what they should — enforced down to every page and API call.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">ClientOps</span>
          <Link href="/login">
            <Button variant="outline">Sign In</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-6 py-24 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            One operating system for running your service business
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            ClientOps brings leads, clients, quotations, contracts, projects, invoicing, and support into a single
            place — with a dedicated portal so your clients stay in the loop without ever emailing you for a status
            update.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/login">
              <Button size="lg">Sign In to Your Workspace</Button>
            </Link>
            <a href="mailto:hello@clientops.dev?subject=ClientOps%20access%20request">
              <Button size="lg" variant="outline">
                Request Access
              </Button>
            </a>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            New organizations are provisioned by your ClientOps administrator — there&apos;s no public sign-up.
          </p>
        </section>

        <section className="border-t border-slate-100 bg-slate-50 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-2xl font-semibold text-slate-900">Everything your team and your clients need</h2>
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature) => (
                <Card key={feature.title}>
                  <CardHeader>
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-slate-600">{feature.description}</CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="text-2xl font-semibold text-slate-900">Already have an account?</h2>
          <p className="mt-3 text-slate-600">Sign in to pick up right where you left off.</p>
          <div className="mt-6">
            <Link href="/login">
              <Button size="lg">Sign In</Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 py-6">
        <div className="mx-auto max-w-6xl px-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} ClientOps. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
