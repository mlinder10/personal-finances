"use server";

import {
  Transaction,
  RemovedTransaction,
  TransactionsSyncResponse,
} from "plaid";
import { plaid } from "./plaid";
import { PlaidError } from "./types";
import { db } from "@/db";
import { bankAccount, transaction, plaidItem } from "@/db/schemas/finances";
import { eq, inArray, sql } from "drizzle-orm";

/**
 * Fetches real-time account balances from Plaid for all connected items of a user
 * and updates local account balances in the database.
 */
export async function getAccountBalance(userId: string) {
  try {
    // 1. Get all connected items/accessTokens for the user
    const userItems = await db
      .select({
        itemId: plaidItem.itemId,
        accessToken: plaidItem.accessToken,
      })
      .from(plaidItem)
      .where(eq(plaidItem.userId, userId));

    if (userItems.length === 0) {
      return { success: true, data: [] } as const;
    }

    // 2. Fetch balances from Plaid per access_token concurrently
    const balanceResults = await Promise.all(
      userItems.map(async (item) => {
        try {
          const res = await plaid.accountsBalanceGet({
            access_token: item.accessToken,
          });
          return { success: true, accounts: res.data.accounts };
        } catch (err) {
          console.error(
            `Failed to fetch balances for item ${item.itemId}:`,
            err,
          );
          return { success: false, accounts: [] };
        }
      }),
    );

    // 3. Flatten accounts & update balances in DB
    const allAccounts = balanceResults.flatMap((r) => r.accounts);

    if (allAccounts.length > 0) {
      await Promise.all(
        allAccounts.map((acc) =>
          db
            .update(bankAccount)
            .set({
              currentBalanceInCents: acc.balances.current
                ? Math.round(acc.balances.current * 100)
                : null,
              availableBalanceInCents: acc.balances.available
                ? Math.round(acc.balances.available * 100)
                : null,
            })
            .where(eq(bankAccount.accountId, acc.account_id)),
        ),
      );
    }

    return { success: true, data: allAccounts } as const;
  } catch (e) {
    const error = e as PlaidError;
    console.error(
      "Failed to get account balance:",
      error.response?.data || error.message,
    );
    return { success: false, error: "Failed to get account balance" } as const;
  }
}

export async function syncTransactions(userId: string) {
  let items;
  try {
    items = await db
      .select()
      .from(plaidItem)
      .where(eq(plaidItem.userId, userId));
    if (items === null || items.length === 0) return { success: true } as const;
  } catch (e) {
    console.error(e);
    return { success: false, error: "Failed to get items" } as const;
  }

  await Promise.all(
    items.map(async (item) => {
      try {
        await updateTransactionHistory(
          userId,
          item.itemId,
          item.accessToken,
          item.cursor,
        );
      } catch (e) {
        console.error(e);
        return {
          success: false,
          error: "Failed to sync transactions",
        } as const;
      }
    }),
  );

  return { success: true } as const;
}

/**
 * Performs cursor-based sync for transactions given an access token and user ID.
 */
export async function updateTransactionHistory(
  userId: string,
  itemId: string,
  accessToken: string,
  initialCursor: string | null,
) {
  console.log("Syncing transactions...");
  let added: Transaction[] = [];
  let modified: Transaction[] = [];
  let removed: RemovedTransaction[] = [];
  let cursor = initialCursor;
  let hasMore = true;

  // 1. Paginate through Plaid transactionsSync
  while (hasMore) {
    try {
      const response = await plaid.transactionsSync({
        access_token: accessToken,
        cursor: cursor ?? undefined,
        count: 500,
      });

      const data: TransactionsSyncResponse = response.data;

      added = added.concat(data.added);
      modified = modified.concat(data.modified);
      removed = removed.concat(data.removed);

      cursor = data.next_cursor;
      hasMore = data.has_more;
    } catch (err) {
      const error = err as PlaidError;
      console.error(
        "Plaid Sync API Error:",
        error.response?.data || error.message,
      );
      return {
        success: false,
        error: "Failed to update transaction history",
      } as const;
    }
  }

  // 2. Persist additions, updates, deletions, and the new cursor atomically
  try {
    await Promise.all([
      upsertTransactions([...added, ...modified], userId),
      deleteTransactions(removed),
      db.update(plaidItem).set({ cursor }).where(eq(plaidItem.itemId, itemId)),
    ]);

    return { success: true } as const;
  } catch (e) {
    console.error("Database Sync Error:", e);
    return {
      success: false,
      error: "Failed to save synced transactions",
    } as const;
  }
}

/**
 * Handles both new and updated transactions cleanly using Drizzle's onConflictDoUpdate
 */
async function upsertTransactions(txs: Transaction[], userId: string) {
  if (txs.length === 0) return;

  const values = txs.map((t) => ({
    userId,
    accountId: t.account_id,
    amountInCents: Math.round(t.amount * 100),
    date: t.date,
    name: t.name,
    currencyCode: t.iso_currency_code,
    location: JSON.stringify(t.location),
    merchantName: t.merchant_name,
    paymentChannel: t.payment_channel,
    pending: t.pending,
    personalFinanceCategoryPrimary: t.personal_finance_category?.primary,
    personalFinanceCategoryDetailed: t.personal_finance_category?.detailed,
    personalFinanceCategoryIconUrl: t.personal_finance_category_icon_url,
    transactionId: t.transaction_id,
    website: t.website,
  }));

  return await db
    .insert(transaction)
    .values(values)
    .onConflictDoUpdate({
      target: transaction.transactionId,
      set: {
        amountInCents: sql`EXCLUDED.amount_in_cents`,
        pending: sql`EXCLUDED.pending`,
        merchantName: sql`EXCLUDED.merchant_name`,
        personalFinanceCategoryPrimary: sql`EXCLUDED.personal_finance_category_primary`,
        personalFinanceCategoryDetailed: sql`EXCLUDED.personal_finance_category_detailed`,
        personalFinanceCategoryIconUrl: sql`EXCLUDED.personal_finance_category_icon_url`,
      },
    });
}

/**
 * Deletes removed transactions safely with an empty-array guard
 */
async function deleteTransactions(txs: RemovedTransaction[]) {
  if (txs.length === 0) return;

  const ids = txs.map((r) => r.transaction_id);
  await db.delete(transaction).where(inArray(transaction.transactionId, ids));
}
