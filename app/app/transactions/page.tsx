import { bankAccount, db, transaction } from "@/db";
import { auth } from "@/lib/auth";
import { cn, formatPriceInCents } from "@/lib/utils";
import { eq, and, inArray, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  AccountSelector,
  ExportTransactionsButton,
  SyncTransactionsButton,
} from "./client";
import Header from "../_components/header";
import Main from "../_components/main";
import Body from "../_components/body";

type PageParams = {
  searchParams: Promise<{
    accounts?: string;
  }>;
};

export default async function TransactionPage({ searchParams }: PageParams) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return redirect("/signin");

  // Parse account IDs from query params (e.g., ?accounts=acc_1,acc_2)
  const accountsParam = (await searchParams).accounts;
  const selectedAccountIds = accountsParam ? accountsParam.split(",") : [];

  // 1. Fetch available accounts for the filter dropdown
  const userAccounts = await db
    .select({
      accountId: bankAccount.accountId,
      name: bankAccount.name,
      mask: bankAccount.mask,
    })
    .from(bankAccount)
    .where(eq(bankAccount.userId, session.user.id));

  // 2. Build database query conditions
  const queryConditions = [eq(transaction.userId, session.user.id)];

  if (selectedAccountIds.length > 0) {
    queryConditions.push(inArray(transaction.accountId, selectedAccountIds));
  }

  // 3. Query transactions directly filtered & ordered by DB
  const transactions = await db
    .select({
      transaction: transaction,
      accountName: bankAccount.name,
      accountMask: bankAccount.mask,
    })
    .from(transaction)
    .leftJoin(bankAccount, eq(transaction.accountId, bankAccount.accountId))
    .where(and(...queryConditions))
    .orderBy(desc(transaction.date));

  return (
    <Main>
      <Header title="Transactions">
        <div className="flex items-center gap-2">
          <AccountSelector accounts={userAccounts} />
          <SyncTransactionsButton userId={session.user.id} />
          <ExportTransactionsButton
            transactions={transactions.map((tx) => tx.transaction)}
          />
        </div>
      </Header>

      <Body>
        <div className="bg-card shadow-sm border rounded-md text-card-foreground">
          {transactions.length === 0 ? (
            <div className="p-8 text-muted-foreground text-sm text-center">
              No transactions found for the selected criteria.
            </div>
          ) : (
            <ul className="divide-y">
              {transactions.map(
                ({ transaction: tx, accountName, accountMask }) => {
                  // Plaid: positive amount = spending/outflow, negative = income/inflow
                  const isExpense = tx.amountInCents > 0;
                  const title =
                    tx.name ||
                    tx.merchantName ||
                    tx.personalFinanceCategoryPrimary ||
                    "Transaction";

                  return (
                    <li
                      key={tx.transactionId}
                      className="flex justify-between items-center hover:bg-muted/50 p-4 transition-colors"
                    >
                      {/* Left: Merchant / Category & Account */}
                      <div className="flex-1 pr-4">
                        <p className="font-medium text-sm truncate leading-none">
                          {title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-muted-foreground text-xs">
                          <span>{accountName || "Unknown Account"}</span>
                          {accountMask && <span>••• {accountMask}</span>}
                          <span>•</span>
                          <span>{tx.date}</span>
                        </div>
                      </div>

                      {/* Middle: Primary Category Tag */}
                      <div className="hidden md:block w-48 text-muted-foreground text-xs truncate">
                        {tx.personalFinanceCategoryPrimary ?? "General"}
                      </div>

                      {/* Right: Price */}
                      <div
                        className={cn(
                          "w-28 font-mono font-medium text-sm text-right",
                          isExpense ? "text-foreground" : "text-green-600",
                        )}
                      >
                        {isExpense ? "-" : "+"}
                        {formatPriceInCents(Math.abs(tx.amountInCents))}
                      </div>
                    </li>
                  );
                },
              )}
            </ul>
          )}
        </div>
      </Body>
    </Main>
  );
}
