"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getAccountBalance } from "@/plaid/transaction";
import { RefreshCcw } from "lucide-react";
import { useState } from "react";

type SyncAccountBalancesButtonProps = {
  userId: string;
};

export default function SyncAccountBalancesButton({
  userId,
}: SyncAccountBalancesButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSync() {
    setIsLoading(true);
    await getAccountBalance(userId);
    setIsLoading(false);
    window.location.reload();
  }

  return (
    <Button disabled={isLoading} onClick={handleSync}>
      <span>{isLoading ? "Syncing..." : "Sync"}</span>
      <RefreshCcw className={cn(isLoading && "animate-spin")} />
    </Button>
  );
}
