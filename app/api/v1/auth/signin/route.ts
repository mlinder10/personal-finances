import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const postBodySchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(1_024),
});

export async function POST(req: NextRequest) {
  const body = postBodySchema.safeParse(await req.json());
  if (!body.success) return new NextResponse("Bad request", { status: 400 });

  try {
    const res = await auth.api.signInEmail({
      body: {
        email: body.data.email.toLowerCase(),
        password: body.data.password,
      },
      headers: await headers(),
      returnHeaders: true,
    });

    return NextResponse.json(
      { success: true },
      { status: 200, headers: res.headers },
    );
  } catch (error) {
    console.error("Sign-in failed:", error);
    return new NextResponse("Unable to sign in", { status: 401 });
  }
}
