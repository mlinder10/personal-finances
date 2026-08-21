"use client";

import { useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { createLinkToken, linkBankAccount } from "@/plaid/auth";
import { updateTransactionHistory } from "@/plaid/transaction";

type PlaidLinkButtonProps = {
  userId: string;
};

export default function PlaidLinkButton({ userId }: PlaidLinkButtonProps) {
  const [token, setToken] = useState<string | null>(null);
  const { open, ready } = usePlaidLink({
    token: token!,
    onSuccess,
  });

  // Handle successful bank login inside Plaid Link configuration
  async function onSuccess(publicToken: string | null) {
    if (!publicToken) return;
    // Fire our server action to send the token straight into our backend
    const tokenResult = await linkBankAccount(publicToken, userId);
    if (!tokenResult.success) return;
    const txResult = await updateTransactionHistory(
      userId,
      tokenResult.itemId,
      tokenResult.accessToken,
      null,
    );
    if (!txResult.success) return;
  }

  // Get the link token immediately on mount using our server action
  useEffect(() => {
    const initLink = async () => {
      const result = await createLinkToken(userId);
      if (result.success && result.linkToken) {
        setToken(result.linkToken);
      }
    };
    initLink();
  }, [userId]);

  return (
    <button
      onClick={() => open()}
      disabled={!ready}
      className="bg-blue-600 disabled:opacity-50 px-4 py-2 rounded text-white"
    >
      Connect Bank Account
    </button>
  );
}
