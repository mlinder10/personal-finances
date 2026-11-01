import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const postBodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(1_024),
});

export async function POST(req: NextRequest) {
  const body = postBodySchema.safeParse(await req.json());
  if (!body.success) return new NextResponse("Bad request", { status: 400 });

  try {
    const res = await auth.api.signUpEmail({
      body: {
        name: body.data.name,
        email: body.data.email.toLowerCase(),
        password: body.data.password,
      },
      headers: await headers(),
      returnHeaders: true,
    });

    return NextResponse.json(
      { success: true },
      { status: 201, headers: res.headers },
    );
  } catch (error) {
    console.error("Sign-up failed:", error);
    return new NextResponse("Unable to create account", { status: 400 });
  }
}
