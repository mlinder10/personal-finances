import { integer, sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { sql } from "drizzle-orm";

export const plaidItem = sqliteTable(
  "plaid_item",
  {
    itemId: text("item_id").notNull().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token").notNull(),
    cursor: text("cursor"),
  },
  (table) => [index("plaid_item_user_id_idx").on(table.userId)],
);

export const bankAccount = sqliteTable(
  "bank_account",
  {
    accountId: text("account_id").notNull().primaryKey(),
    currentBalanceInCents: integer("current_balance_in_cents"),
    availableBalanceInCents: integer("available_balance_in_cents"),
    itemId: text("item_id")
      .notNull()
      .references(() => plaidItem.itemId, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    mask: text("mask"),
    type: text("type").notNull(),
    subtype: text("subtype"),
    lastUpdated: text("last_updated")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index("bank_account_user_id_idx").on(table.userId),
    index("bank_account_item_id_idx").on(table.itemId),
  ],
);

export const transaction = sqliteTable(
  "transaction",
  {
    transactionId: text("transaction_id").notNull().primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => bankAccount.accountId, { onDelete: "cascade" }),
    // Denormalized for direct user queries
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name"),
    amountInCents: integer("amount_in_cents").notNull(),
    date: text("date").notNull(), // ISO "YYYY-MM-DD"
    currencyCode: text("currency_code").default("USD"),
    location: text("location"), // Made nullable (Plaid location data is frequently missing)
    merchantName: text("merchant_name"),
    paymentChannel: text("payment_channel").notNull(),
    pending: integer("pending", { mode: "boolean" }).notNull(),
    personalFinanceCategoryPrimary: text("personal_finance_category_primary"),
    personalFinanceCategoryDetailed: text("personal_finance_category_detailed"),
    personalFinanceCategoryIconUrl: text("personal_finance_category_icon_url"),
    website: text("website"),
  },
  (table) => [
    index("transaction_user_id_idx").on(table.userId),
    index("transaction_account_id_idx").on(table.accountId),
    // Composite index for fast timeline/dashboard pagination queries
    index("transaction_user_date_idx").on(table.userId, table.date),
  ],
);
