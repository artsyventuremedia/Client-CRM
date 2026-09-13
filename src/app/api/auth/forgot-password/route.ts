import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { generateToken } from "@/lib/tokens";
import { emailProvider } from "@/lib/providers/email";
import { rateLimit, clientIp } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const limit = rateLimit(`forgot-password:${clientIp(request)}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Separate per-email limit so an attacker can't flood one victim's inbox
  // with reset emails by rotating source IPs.
  const emailLimit = rateLimit(`forgot-password-email:${parsed.data.email.toLowerCase()}`, 3, 15 * 60 * 1000);
  if (!emailLimit.allowed) {
    return NextResponse.json({ message: "If that email exists, a reset link has been sent." });
  }

  const user = await prisma.user.findFirst({
    where: { email: parsed.data.email.toLowerCase() },
  });

  if (user) {
    const { raw, hash } = generateToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/reset-password?token=${raw}`;
    await emailProvider.send({
      to: user.email,
      subject: "Reset your password",
      body: `Click the link to reset your password (valid for 1 hour): ${resetUrl}`,
    });
  }

  // Always return a generic success response to avoid leaking account existence.
  return NextResponse.json({ message: "If that email exists, a reset link has been sent." });
}
