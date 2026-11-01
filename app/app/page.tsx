import { bankAccount, db, transaction } from "@/db";
import { auth } from "@/lib/auth";
import { cn, formatPriceInCents } from "@/lib/utils";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import {
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExpensePieChart, SyncAccountBalancesButton } from "./client";
import Body from "./_components/body";
import Header from "./_components/header";
import Main from "./_components/main";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(`${date}T00:00:00`),
  );
const formatCategory = (category: string | null) =>
  (category ?? "General")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return redirect("/signin");
  const userId = session.user.id;
  const now = new Date();
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(now);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  // Card payments and account transfers move money between accounts; the original
  // card purchase is the actual expense. Exclude those movements from cash-flow totals.
  const isActualCashFlow = sql`
    (${transaction.personalFinanceCategoryPrimary} IS NULL OR (
      ${transaction.personalFinanceCategoryPrimary} NOT LIKE '%TRANSFER%'
      AND ${transaction.personalFinanceCategoryPrimary} NOT LIKE '%LOAN_PAYMENT%'
    ))
    AND (${transaction.personalFinanceCategoryDetailed} IS NULL OR (
      ${transaction.personalFinanceCategoryDetailed} NOT LIKE '%CREDIT_CARD_PAYMENT%'
      AND ${transaction.personalFinanceCategoryDetailed} NOT LIKE '%ACCOUNT_TRANSFER%'
    ))
  `;

  const [accounts, monthTotalsResult, monthlyExpenses, recentTransactions] =
    await Promise.all([
      db.select().from(bankAccount).where(eq(bankAccount.userId, userId)),
      db
        .select({
          totalExpensesInCents: sql<number>`COALESCE(SUM(CASE WHEN ${transaction.amountInCents} > 0 AND ${isActualCashFlow} THEN ${transaction.amountInCents} ELSE 0 END), 0)`,
          totalIncomeInCents: sql<number>`COALESCE(SUM(CASE WHEN ${transaction.amountInCents} < 0 AND ${isActualCashFlow} THEN ABS(${transaction.amountInCents}) ELSE 0 END), 0)`,
        })
        .from(transaction)
        .where(
          and(
            eq(transaction.userId, userId),
            gte(transaction.date, startOfMonth),
          ),
        ),
      db
        .select({
          category: sql<string>`COALESCE(${transaction.personalFinanceCategoryPrimary}, 'Uncategorized')`,
          totalInCents: sql<number>`SUM(${transaction.amountInCents})`,
        })
        .from(transaction)
        .where(
          and(
            eq(transaction.userId, userId),
            gte(transaction.date, startOfMonth),
            sql`${transaction.amountInCents} > 0`,
            isActualCashFlow,
          ),
        )
        .groupBy(
          sql`COALESCE(${transaction.personalFinanceCategoryPrimary}, 'Uncategorized')`,
        )
        .orderBy(sql`SUM(${transaction.amountInCents}) DESC`),
      db
        .select()
        .from(transaction)
        .where(eq(transaction.userId, userId))
        .orderBy(desc(transaction.date))
        .limit(5),
    ]);

  const assetsInCents = accounts
    .filter((account) => account.type !== "credit" && account.type !== "loan")
    .reduce((sum, account) => sum + (account.currentBalanceInCents ?? 0), 0);
  const liabilitiesInCents = accounts
    .filter((account) => account.type === "credit" || account.type === "loan")
    .reduce((sum, account) => sum + (account.currentBalanceInCents ?? 0), 0);
  const netWorthInCents = assetsInCents - liabilitiesInCents;
  const monthTotals = monthTotalsResult[0];
  const incomeInCents = monthTotals?.totalIncomeInCents ?? 0;
  const expensesInCents = monthTotals?.totalExpensesInCents ?? 0;
  const savedInCents = incomeInCents - expensesInCents;
  const savingsRate =
    incomeInCents > 0 ? (savedInCents / incomeInCents) * 100 : 0;

  return (
    <Main>
      <Header
        title="Dashboard"
        description={`Financial overview · ${monthLabel}`}
      >
        <SyncAccountBalancesButton />
      </Header>
      <Body>
        <div className="space-y-6">
          <section className="grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader>
                <p className="font-medium text-muted-foreground text-sm">
                  Total net worth
                </p>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-4xl tracking-tight tabular-nums">
                  {formatPriceInCents(netWorthInCents)}
                </p>
                <p className="mt-2 text-muted-foreground text-sm">
                  Across {accounts.length} connected account
                  {accounts.length === 1 ? "" : "s"}
                </p>
                <dl className="mt-6 grid grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <dt className="text-muted-foreground text-xs">Assets</dt>
                    <dd className="mt-1 font-mono font-medium tabular-nums">
                      {formatPriceInCents(assetsInCents)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground text-xs">
                      Liabilities
                    </dt>
                    <dd className="mt-1 font-mono font-medium tabular-nums">
                      {formatPriceInCents(liabilitiesInCents)}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <p className="font-medium text-muted-foreground text-sm">
                  This month
                </p>
              </CardHeader>
              <CardContent>
                <p
                  className={cn(
                    "font-semibold text-3xl tracking-tight tabular-nums",
                    savedInCents < 0 && "text-destructive",
                  )}
                >
                  {savedInCents < 0 && "−"}
                  {formatPriceInCents(Math.abs(savedInCents))}
                </p>
                <p className="mt-1 text-muted-foreground text-sm">
                  saved · {savingsRate.toFixed(1)}% of income
                </p>
                <dl className="mt-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">Income</dt>
                    <dd className="font-mono tabular-nums text-emerald-600">
                      +{formatPriceInCents(incomeInCents)}
                    </dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">Spending</dt>
                    <dd className="font-mono tabular-nums">
                      −{formatPriceInCents(expensesInCents)}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </section>
          <section className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader>
                <h2 className="font-semibold">Spending by category</h2>
                <p className="text-muted-foreground text-sm">
                  Where your money went in {monthLabel}
                </p>
              </CardHeader>
              <CardContent>
                <ExpensePieChart data={monthlyExpenses} />
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <h2 className="font-semibold">Recent activity</h2>
                  <p className="text-muted-foreground text-sm">
                    Your latest transactions
                  </p>
                </div>
                <Link
                  href="/app/transactions"
                  className="text-primary text-sm hover:underline"
                >
                  View all
                </Link>
              </CardHeader>
              <CardContent>
                {recentTransactions.length === 0 ? (
                  <div className="py-10 text-center">
                    <ReceiptText className="mx-auto mb-3 size-5 text-muted-foreground" />
                    <p className="font-medium text-sm">No activity yet</p>
                    <p className="mt-1 text-muted-foreground text-xs">
                      Sync an account to see transactions.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y">
                    {recentTransactions.map((tx) => {
                      const expense = tx.amountInCents > 0;
                      const title =
                        tx.merchantName ||
                        tx.name ||
                        formatCategory(tx.personalFinanceCategoryPrimary);
                      return (
                        <li
                          key={tx.transactionId}
                          className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                        >
                          <span
                            className={cn(
                              "grid size-8 shrink-0 place-items-center rounded-full",
                              expense
                                ? "bg-muted"
                                : "bg-emerald-500/10 text-emerald-600",
                            )}
                          >
                            <>
                              {expense ? (
                                <ArrowUpRight className="size-4" />
                              ) : (
                                <ArrowDownRight className="size-4" />
                              )}
                            </>
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-sm">
                              {title}
                            </p>
                            <p className="mt-0.5 text-muted-foreground text-xs">
                              {formatDate(tx.date)}
                              {tx.pending ? " · Pending" : ""}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "font-mono text-sm tabular-nums",
                              !expense && "text-emerald-600",
                            )}
                          >
                            {expense ? "−" : "+"}
                            {formatPriceInCents(Math.abs(tx.amountInCents))}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <h2 className="font-semibold">Accounts</h2>
                <p className="text-muted-foreground text-sm">
                  Balances from your connected institutions
                </p>
              </div>
              <Link
                href="/app/account"
                className="text-primary text-sm hover:underline"
              >
                Manage connections
              </Link>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <div className="py-8 text-center">
                  <Landmark className="mx-auto mb-3 size-5 text-muted-foreground" />
                  <p className="font-medium text-sm">No accounts connected</p>
                  <Link
                    href="/app/account"
                    className="mt-2 inline-block text-primary text-sm hover:underline"
                  >
                    Connect an account
                  </Link>
                </div>
              ) : (
                <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {accounts.map((account) => {
                    const liability =
                      account.type === "credit" || account.type === "loan";
                    return (
                      <li
                        key={account.accountId}
                        className="rounded-lg border bg-muted/20 p-4"
                      >
                        <div className="flex justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {account.name}
                            </p>
                            <p className="mt-1 text-muted-foreground text-xs">
                              {account.subtype ?? account.type}
                              {account.mask ? ` · •••• ${account.mask}` : ""}
                            </p>
                          </div>
                          <WalletCards className="size-4 shrink-0 text-muted-foreground" />
                        </div>
                        <div className="mt-5 flex justify-between gap-3">
                          <div>
                            <p className="text-muted-foreground text-xs">
                              {liability ? "Owed" : "Current balance"}
                            </p>
                            <p className="mt-1 font-mono font-medium tabular-nums">
                              {formatPriceInCents(
                                account.currentBalanceInCents ?? 0,
                              )}
                            </p>
                          </div>
                          {!liability &&
                            account.availableBalanceInCents !== null && (
                              <div className="text-right">
                                <p className="text-muted-foreground text-xs">
                                  Available
                                </p>
                                <p className="mt-1 font-mono text-sm tabular-nums">
                                  {formatPriceInCents(
                                    account.availableBalanceInCents,
                                  )}
                                </p>
                              </div>
                            )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </Body>
    </Main>
  );
}
