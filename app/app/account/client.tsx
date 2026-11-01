"use client";

import { Button } from "@/components/ui/button";
import { createLinkToken, linkBankAccount } from "@/plaid/auth";
import { Link2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";

type Status = { tone: "error" | "success"; message: string } | null;
export default function PlaidLinkButton() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const { open, ready } = usePlaidLink({ token: token ?? "", onSuccess });
  async function onSuccess(publicToken: string | null) {
    if (!publicToken) return;
    setIsConnecting(true);
    setStatus(null);
    try {
      const result = await linkBankAccount(publicToken);
      if (!result.success) {
        setStatus({ tone: "error", message: result.error });
        return;
      }
      setStatus({
        tone: "success",
        message: "Account connected and transactions synced.",
      });
      router.refresh();
    } catch {
      setStatus({
        tone: "error",
        message: "Unable to connect this account. Please try again.",
      });
    } finally {
      setIsConnecting(false);
    }
  }
  useEffect(() => {
    async function initLink() {
      const result = await createLinkToken();
      if (result.success) setToken(result.linkToken);
      else setStatus({ tone: "error", message: result.error });
    }
    void initLink();
  }, []);
  return (
    <div className="space-y-3">
      <Button
        onClick={() => open()}
        disabled={!ready || isConnecting}
        className="w-full sm:w-auto"
      >
        {isConnecting || !ready ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <Link2 />
        )}
        {isConnecting
          ? "Connecting..."
          : !ready
            ? "Preparing secure connection..."
            : "Connect account"}
      </Button>
      {status && (
        <p
          role={status.tone === "error" ? "alert" : "status"}
          className={
            status.tone === "error"
              ? "rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-destructive text-sm"
              : "rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-700 text-sm"
          }
        >
          {status.message}
        </p>
      )}
    </div>
  );
}
