"use server";

import { Products, CountryCode, LinkTokenCreateRequest } from "plaid";
import { plaid } from "./plaid";
import { PlaidError } from "./types";
import { bankAccount, plaidItem, db } from "@/db";

export async function createLinkToken(userId: string) {
  try {
    const request: LinkTokenCreateRequest = {
      user: {
        client_user_id: userId,
      },
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

export async function linkBankAccount(publicToken: string, userId: string) {
  try {
    // 1. Exchange public_token for access_token and item_id
    const exchangeRes = await plaid.itemPublicTokenExchange({
      public_token: publicToken,
    });
    const { access_token: accessToken, item_id: itemId } = exchangeRes.data;

    // 2. Retrieve linked accounts for this item
    const accountsRes = await plaid.accountsGet({
      access_token: accessToken,
    });

    const accounts = accountsRes.data.accounts;
    if (!accounts || accounts.length === 0) {
      return {
        success: false,
        error: "No accounts found for this institution",
      } as const;
    }

    // 3. Persist Item & Accounts in a single transaction
    await db.transaction(async (tx) => {
      // Upsert the Plaid Item connection
      await tx
        .insert(plaidItem)
        .values({
          itemId,
          userId,
          accessToken,
        })
        .onConflictDoUpdate({
          target: plaidItem.itemId,
          set: { accessToken }, // Update access_token in case of re-auth
        });

      // Upsert accounts linked to this item
      await tx
        .insert(bankAccount)
        .values(
          accounts.map((a) => ({
            accountId: a.account_id,
            itemId,
            userId,
            name: a.name,
            mask: a.mask,
            type: a.type,
            subtype: a.subtype,
          })),
        )
        .onConflictDoUpdate({
          target: bankAccount.accountId,
          set: { name: bankAccount.name },
        });
    });

    return { success: true, itemId, accessToken } as const;
  } catch (e) {
    const error = e as PlaidError;
    console.error(
      "Token Exchange Error:",
      error.response?.data || error.message,
    );
    return {
      success: false,
      error: "Failed to exchange public token",
    } as const;
  }
}
