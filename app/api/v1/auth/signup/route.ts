import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const postBodySchema = z.object({
  name: z.string(),
  email: z.string(),
  password: z.string(),
});

export async function POST(req: NextRequest) {
  const body = postBodySchema.safeParse(await req.json());
  if (!body.success) {
    console.error(body.error);
    return new NextResponse("Bad request", { status: 400 });
  }

  try {
    const res = await auth.api.signUpEmail({
      body: {
        name: body.data.name,
        email: body.data.email,
        password: body.data.password,
      },
      headers: await headers(),
      returnHeaders: true,
    });

    return NextResponse.json(res.response.token, {
      status: 200,
      headers: res.headers,
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
