import { bankAccount, db } from "@/db";
import { auth } from "@/lib/auth";
import { getAccountBalance } from "@/plaid/transaction";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const accounts = await db
    .select()
    .from(bankAccount)
    .where(eq(bankAccount.userId, session.user.id));

  return NextResponse.json(accounts);
}

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const result = await getAccountBalance();
  if (!result.success) return new NextResponse(result.error, { status: 502 });

  const accounts = await db
    .select()
    .from(bankAccount)
    .where(eq(bankAccount.userId, session.user.id));

  return NextResponse.json(accounts);
}
