"use client";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { transaction } from "@/db";
import { cn } from "@/lib/utils";
import { syncTransactions } from "@/plaid/transaction";
import { InferSelectModel } from "drizzle-orm";
import { Download, RefreshCcw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export interface AccountOption {
  accountId: string;
  name: string;
  mask: string | null;
}

type AccountSelectorProps = {
  accounts: AccountOption[];
};

export function AccountSelector({ accounts }: AccountSelectorProps) {
  const anchor = useComboboxAnchor();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read initial selected IDs from URL query params (e.g. ?accounts=acc1,acc2)
  const initialSelectedIds = searchParams.get("accounts")
    ? searchParams.get("accounts")!.split(",")
    : [];

  // Lookup map to quickly find account display details from an accountId
  const accountMap = new Map(accounts.map((acc) => [acc.accountId, acc]));

  function onSelect(selectedIds: string[]) {
    const params = new URLSearchParams(searchParams.toString());

    if (selectedIds.length === 0) {
      params.delete("accounts");
    } else {
      params.set("accounts", selectedIds.join(","));
    }

    const query = params.toString();
    const target = query ? `/app/transactions?${query}` : "/app/transactions";

    router.replace(target);
  }

  return (
    <Combobox
      multiple
      autoHighlight
      items={accounts.map((account) => account.accountId)}
      defaultValue={initialSelectedIds}
      onValueChange={onSelect}
    >
      <ComboboxChips ref={anchor} className="w-full max-w-xs">
        <ComboboxValue>
          {(selectedIds: string[]) => (
            <>
              {selectedIds.map((id: string) => {
                const account = accountMap.get(id);
                const label = account
                  ? `${account.name}${account.mask ? ` (••• ${account.mask})` : ""}`
                  : id;

                return <ComboboxChip key={id}>{label}</ComboboxChip>;
              })}
              <ComboboxChipsInput placeholder="Filter accounts..." />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>No accounts found.</ComboboxEmpty>
        <ComboboxList>
          {(accountId: string) => {
            const account = accountMap.get(accountId);
            if (!account) return null;

            return (
              <ComboboxItem key={account.accountId} value={account.accountId}>
                <div className="flex justify-between items-center w-full">
                  <span>{account.name}</span>
                  {account.mask && (
                    <span className="ml-2 text-muted-foreground text-xs">
                      •••• {account.mask}
                    </span>
                  )}
                </div>
              </ComboboxItem>
            );
          }}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

type SyncTransactionsButtonProps = {
  userId: string;
};

export function SyncTransactionsButton({
  userId,
}: SyncTransactionsButtonProps) {
  const [isLoading, setLoading] = useState(false);

  async function handleSync() {
    setLoading(true);
    await syncTransactions(userId);
    setLoading(false);
    window.location.reload();
  }

  return (
    <Button disabled={isLoading} onClick={handleSync}>
      <span>{isLoading ? "Syncing..." : "Sync"}</span>
      <RefreshCcw className={cn(isLoading && "animate-spin")} />
    </Button>
  );
}

type ExportTransactionsButtonProps = {
  transactions: InferSelectModel<typeof transaction>[];
};

export function ExportTransactionsButton({
  transactions,
}: ExportTransactionsButtonProps) {
  function handleExport() {
    let csv = "Name,Date,Amount\n";
    for (const tx of transactions) {
      csv += `${tx.name || tx.merchantName || tx.personalFinanceCategoryPrimary},${tx.date},${tx.amountInCents / 100}\n`;
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "transactions.csv";
    link.click();
  }

  return (
    <Button onClick={handleExport}>
      <span>Export</span>
      <Download />
    </Button>
  );
}
