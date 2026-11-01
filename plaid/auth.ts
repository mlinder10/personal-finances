"use server";

import { Products, CountryCode, LinkTokenCreateRequest } from "plaid";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { plaid } from "./plaid";
import { PlaidError } from "./types";
import { bankAccount, plaidItem, db } from "@/db";
import { syncTransactionsForItem } from "./transaction";

async function getAuthenticatedUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export async function createLinkToken() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Unauthorized" } as const;

  try {
    const request: LinkTokenCreateRequest = {
      user: { client_user_id: userId },
      client_name: "Finance Tracking",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: "en",
    };

    const res = await plaid.linkTokenCreate(request);
    return { success: true, linkToken: res.data.link_token } as const;
  } catch (e) {
    const error = e as PlaidError;
    console.error("Link Token Error:", error.response?.data || error.message);
    return { success: false, error: "Failed to create link token" } as const;
  }
}

export async function linkBankAccount(publicToken: string) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { success: false, error: "Unauthorized" } as const;
  if (!publicToken || publicToken.length > 1_000) {
    return { success: false, error: "Invalid public token" } as const;
  }

  try {
    const exchangeRes = await plaid.itemPublicTokenExchange({
      public_token: publicToken,
    });
    const { access_token: accessToken, item_id: itemId } = exchangeRes.data;

    const accountsRes = await plaid.accountsGet({ access_token: accessToken });
    const accounts = accountsRes.data.accounts;
    if (accounts.length === 0) {
      return {
        success: false,
        error: "No accounts found for this institution",
      } as const;
    }

    await db.transaction(async (tx) => {
      await tx
        .insert(plaidItem)
        .values({ itemId, userId, accessToken })
        .onConflictDoUpdate({
          target: plaidItem.itemId,
          set: { userId, accessToken, cursor: null },
        });

      await tx
        .insert(bankAccount)
        .values(
          accounts.map((account) => ({
            accountId: account.account_id,
            itemId,
            userId,
            name: account.name,
            mask: account.mask,
            type: account.type,
            subtype: account.subtype,
          })),
        )
        .onConflictDoUpdate({
          target: bankAccount.accountId,
          set: { name: bankAccount.name },
        });
    });

    const syncResult = await syncTransactionsForItem(itemId);
    if (!syncResult.success) {
      return {
        success: false,
        error: "Account connected, but the initial transaction sync failed.",
      } as const;
    }

    return { success: true } as const;
  } catch (e) {
    const error = e as PlaidError;
    console.error(
      "Token Exchange Error:",
      error.response?.data || error.message,
    );
    return { success: false, error: "Failed to connect account" } as const;
  }
}
