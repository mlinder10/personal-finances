import { bankAccount, db, transaction } from "@/db";
import { auth } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const transactions = await db
    .select({
      transaction: transaction,
      accountName: bankAccount.name,
      accountMask: bankAccount.mask,
    })
    .from(transaction)
    .leftJoin(bankAccount, eq(transaction.accountId, bankAccount.accountId))
    .where(eq(bankAccount.userId, session.user.id))
    .orderBy(desc(transaction.date));

  return NextResponse.json(transactions);
}
