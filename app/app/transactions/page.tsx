import { bankAccount, db, transaction } from "@/db";
import { auth } from "@/lib/auth";
import { cn, formatPriceInCents } from "@/lib/utils";
import { and, desc, eq, inArray } from "drizzle-orm";
import { ArrowDownLeft, ArrowUpRight, ReceiptText } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AccountSelector,
  ExportTransactionsButton,
  SyncTransactionsButton,
} from "./client";
import Body from "../_components/body";
import Header from "../_components/header";
import Main from "../_components/main";
import { Card, CardContent } from "@/components/ui/card";

type PageParams = { searchParams: Promise<{ accounts?: string }> };
const formatCategory = (category: string | null) =>
  (category ?? "General")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));

function isInternalTransfer(tx: typeof transaction.$inferSelect) {
  const category = `${tx.personalFinanceCategoryPrimary ?? ""} ${tx.personalFinanceCategoryDetailed ?? ""}`;
  return /TRANSFER|LOAN_PAYMENT|CREDIT_CARD_PAYMENT|ACCOUNT_TRANSFER/.test(
    category,
  );
}

export default async function TransactionPage({ searchParams }: PageParams) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return redirect("/signin");
  const selectedAccountIds =
    (await searchParams).accounts?.split(",").filter(Boolean) ?? [];
  const userAccounts = await db
    .select({
      accountId: bankAccount.accountId,
      name: bankAccount.name,
      mask: bankAccount.mask,
    })
    .from(bankAccount)
    .where(eq(bankAccount.userId, session.user.id));
  const queryConditions = [eq(transaction.userId, session.user.id)];
  if (selectedAccountIds.length)
    queryConditions.push(inArray(transaction.accountId, selectedAccountIds));
  const transactions = await db
    .select({
      transaction,
      accountName: bankAccount.name,
      accountMask: bankAccount.mask,
    })
    .from(transaction)
    .leftJoin(bankAccount, eq(transaction.accountId, bankAccount.accountId))
    .where(and(...queryConditions))
    .orderBy(desc(transaction.date));
  // Transfers and card payments remain visible in the ledger, but are excluded
  // from the summary because they are not new spending or income.
  const cashFlowTransactions = transactions.filter(
    ({ transaction: tx }) => !isInternalTransfer(tx),
  );
  const totalSpent = cashFlowTransactions
    .filter(({ transaction: tx }) => tx.amountInCents > 0)
    .reduce((sum, { transaction: tx }) => sum + tx.amountInCents, 0);
  const totalIncome = cashFlowTransactions
    .filter(({ transaction: tx }) => tx.amountInCents < 0)
    .reduce((sum, { transaction: tx }) => sum + Math.abs(tx.amountInCents), 0);

  return (
    <Main>
      <Header
        title="Transactions"
        description={
          selectedAccountIds.length
            ? `${selectedAccountIds.length} account filter${selectedAccountIds.length === 1 ? "" : "s"} applied`
            : "All connected account activity"
        }
      >
        <AccountSelector accounts={userAccounts} />
        <SyncTransactionsButton />
        <ExportTransactionsButton
          transactions={transactions.map(({ transaction: tx }) => tx)}
        />
      </Header>
      <Body>
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-3">
            <Metric label="Transactions" value={String(transactions.length)} />
            <Metric
              label="Spending (excl. transfers)"
              value={`−${formatPriceInCents(totalSpent)}`}
            />
            <Metric
              label="Income (excl. transfers)"
              value={`+${formatPriceInCents(totalIncome)}`}
              positive
            />
          </section>
          <Card>
            <CardContent className="pt-2">
              {transactions.length === 0 ? (
                <div className="py-14 text-center">
                  <ReceiptText className="mx-auto mb-3 size-6 text-muted-foreground" />
                  <p className="font-medium">No transactions found</p>
                  <p className="mx-auto mt-1 max-w-sm text-muted-foreground text-sm">
                    {userAccounts.length === 0
                      ? "Connect an account to start importing activity."
                      : "Try another account filter or sync your transactions."}
                  </p>
                  {userAccounts.length === 0 && (
                    <Link
                      href="/app/account"
                      className="mt-3 inline-block text-primary text-sm hover:underline"
                    >
                      Connect an account
                    </Link>
                  )}
                </div>
              ) : (
                <ul className="divide-y">
                  {transactions.map(
                    ({ transaction: tx, accountName, accountMask }) => {
                      const expense = tx.amountInCents > 0;
                      const transfer = isInternalTransfer(tx);
                      const title =
                        tx.merchantName ||
                        tx.name ||
                        formatCategory(tx.personalFinanceCategoryPrimary);
                      return (
                        <li
                          key={tx.transactionId}
                          className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"
                        >
                          <span
                            className={cn(
                              "grid size-9 shrink-0 place-items-center rounded-full",
                              expense
                                ? "bg-muted text-muted-foreground"
                                : "bg-emerald-500/10 text-emerald-600",
                            )}
                          >
                            <>
                              {expense ? (
                                <ArrowUpRight className="size-4" />
                              ) : (
                                <ArrowDownLeft className="size-4" />
                              )}
                            </>
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-medium">{title}</p>
                              {transfer && (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
                                  Transfer
                                </span>
                              )}
                              {tx.pending && (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
                                  Pending
                                </span>
                              )}
                            </div>
                            <p className="mt-1 truncate text-muted-foreground text-xs">
                              {formatCategory(
                                tx.personalFinanceCategoryPrimary,
                              )}{" "}
                              · {accountName ?? "Unknown account"}
                              {accountMask
                                ? ` · •••• ${accountMask}`
                                : ""} ·{" "}
                              <time dateTime={tx.date}>
                                {formatDate(tx.date)}
                              </time>
                            </p>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 font-mono font-medium tabular-nums",
                              !expense && "text-emerald-600",
                              tx.pending && "opacity-70",
                            )}
                          >
                            {expense ? "−" : "+"}
                            {formatPriceInCents(Math.abs(tx.amountInCents))}
                          </span>
                        </li>
                      );
                    },
                  )}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </Body>
    </Main>
  );
}
function Metric({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <p className="text-muted-foreground text-xs">
        For current results · {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono font-semibold text-lg tabular-nums",
          positive && "text-emerald-600",
        )}
      >
        {value}
      </p>
    </div>
  );
}
