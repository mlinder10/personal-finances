import { bankAccount, db, transaction } from "@/db";
import { auth } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import SyncAccountBalancesButton from "./client";
import { cn, formatPriceInCents } from "@/lib/utils";
import Header from "./_components/header";
import Main from "./_components/main";
import Body from "./_components/body";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return redirect("/signin");

  // Fetch bank accounts
  const accounts = await db
    .select()
    .from(bankAccount)
    .where(eq(bankAccount.userId, session.user.id));

  // Calculate total net worth across checking/savings vs credit/loans
  const netWorthInCents = accounts.reduce((total, account) => {
    const balance = account.currentBalanceInCents ?? 0;
    return account.type === "credit" || account.type === "loan"
      ? total - balance
      : total + balance;
  }, 0);

  // Fetch 10 MOST RECENT transactions sorted by date descending
  const recentTransactions = await db
    .select()
    .from(transaction)
    .where(eq(transaction.userId, session.user.id))
    .orderBy(desc(transaction.date))
    .limit(10);

  return (
    <Main>
      <Header title="Dashboard">
        <SyncAccountBalancesButton userId={session.user.id} />
      </Header>
      <Body>
        <ul className="gap-6 grid grid-cols-1 md:grid-cols-3">
          {/* Card 1: Total Net Worth */}
          <li>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="font-medium text-muted-foreground text-sm">
                  Net Worth
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-bold text-3xl">
                  {formatPriceInCents(netWorthInCents)}
                </p>
                <p className="mt-1 text-muted-foreground text-xs">
                  Across {accounts.length} connected account
                  {accounts.length === 1 ? "" : "s"}
                </p>
              </CardContent>
            </Card>
          </li>

          {/* Card 2: Linked Accounts */}
          <li>
            <Card className="flex flex-col h-full">
              <CardHeader>
                <CardTitle className="font-medium text-muted-foreground text-sm">
                  Connected Accounts
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                {accounts.length === 0 ? (
                  <p className="py-4 text-muted-foreground text-sm text-center">
                    No accounts linked yet.
                  </p>
                ) : (
                  <ul className="pr-1 divide-y max-h-48 overflow-y-auto">
                    {accounts.map((acc) => (
                      <li
                        key={acc.accountId}
                        className="py-2.5 first:pt-0 last:pb-0"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-sm leading-none">
                              {acc.name}
                            </p>
                            {acc.mask && (
                              <p className="mt-1 text-muted-foreground text-xs">
                                •••• {acc.mask}
                              </p>
                            )}
                          </div>
                          <p
                            className={cn(
                              "font-semibold text-sm",
                              acc.type === "credit" || acc.type === "loan"
                                ? "text-red-600"
                                : "text-green-600",
                            )}
                          >
                            {formatPriceInCents(acc.currentBalanceInCents ?? 0)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </li>

          {/* Card 3: Recent Transactions */}
          <li>
            <Card className="flex flex-col h-full">
              <CardHeader>
                <CardTitle className="font-medium text-muted-foreground text-sm">
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                {recentTransactions.length === 0 ? (
                  <p className="py-4 text-muted-foreground text-sm text-center">
                    No transactions recorded yet.
                  </p>
                ) : (
                  <ul className="pr-1 divide-y max-h-48 overflow-y-auto">
                    {recentTransactions.map((tx) => {
                      // Plaid: positive amount = spending/outflow, negative = income/inflow
                      const isExpense = tx.amountInCents > 0;
                      const title =
                        tx.merchantName ||
                        tx.personalFinanceCategoryPrimary ||
                        "Transaction";

                      return (
                        <li
                          key={tx.transactionId}
                          className="py-2.5 first:pt-0 last:pb-0"
                        >
                          <div className="flex justify-between items-center text-sm">
                            <div className="max-w-35 truncate">
                              <p className="font-medium truncate">{title}</p>
                              <p className="text-muted-foreground text-xs">
                                {tx.date}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "font-mono font-medium",
                                isExpense
                                  ? "text-foreground"
                                  : "text-green-600",
                              )}
                            >
                              {isExpense ? "-" : "+"}
                              {formatPriceInCents(Math.abs(tx.amountInCents))}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </li>
        </ul>
      </Body>
    </Main>
  );
}
