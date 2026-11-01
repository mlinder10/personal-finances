import { bankAccount, db } from "@/db";
import { auth } from "@/lib/auth";
import { formatPriceInCents } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { Building2, CircleUserRound, ShieldCheck } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import PlaidLinkButton from "./client";
import Body from "../_components/body";
import Header from "../_components/header";
import Main from "../_components/main";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default async function AccountPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return redirect("/signin");
  const accounts = await db
    .select()
    .from(bankAccount)
    .where(eq(bankAccount.userId, session.user.id));
  const initials = session.user.name
    .split(" ")
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Main>
      <Header
        title="Account"
        description="Profile and connected institutions"
      />
      <Body>
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardContent className="pt-2">
                <div className="flex items-center gap-4">
                  <div className="grid size-12 place-items-center rounded-full bg-primary font-semibold text-primary-foreground">
                    {initials || <CircleUserRound className="size-5" />}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-lg">
                      {session.user.name}
                    </h2>
                    <p className="truncate text-muted-foreground text-sm">
                      {session.user.email}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  <h2 className="font-semibold">Secure connection</h2>
                </div>
                <p className="text-muted-foreground text-sm">
                  Connect an institution to import balances and transactions.
                </p>
              </CardHeader>
              <CardContent>
                <PlaidLinkButton />
              </CardContent>
            </Card>
          </div>
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">Connected accounts</h2>
                  <p className="mt-1 text-muted-foreground text-sm">
                    {accounts.length} account{accounts.length === 1 ? "" : "s"}{" "}
                    linked to your profile
                  </p>
                </div>
                <Building2 className="size-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <div className="py-12 text-center">
                  <Building2 className="mx-auto mb-3 size-6 text-muted-foreground" />
                  <p className="font-medium">Connect your first account</p>
                  <p className="mx-auto mt-1 max-w-sm text-muted-foreground text-sm">
                    Use the secure connection panel to see account balances and
                    transaction activity here.
                  </p>
                </div>
              ) : (
                <ul className="divide-y">
                  {accounts.map((account) => (
                    <li
                      key={account.accountId}
                      className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{account.name}</p>
                        <p className="mt-1 text-muted-foreground text-xs">
                          {account.subtype ?? account.type}
                          {account.mask ? ` · •••• ${account.mask}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-medium tabular-nums">
                          {formatPriceInCents(
                            account.currentBalanceInCents ?? 0,
                          )}
                        </p>
                        {account.availableBalanceInCents !== null && (
                          <p className="mt-1 text-muted-foreground text-xs">
                            {formatPriceInCents(
                              account.availableBalanceInCents,
                            )}{" "}
                            available
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </Body>
    </Main>
  );
}
