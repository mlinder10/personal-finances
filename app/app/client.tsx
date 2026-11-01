"use client";

import { Button } from "@/components/ui/button";
import { cn, formatPriceInCents } from "@/lib/utils";
import { getAccountBalance } from "@/plaid/transaction";
import { RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Cell,
  Label,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];
type CategoryData = { category: string; totalInCents: number };
const formatCategory = (category: string) =>
  category
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export function ExpensePieChart({ data }: { data: CategoryData[] }) {
  const totalInCents = data.reduce(
    (total, item) => total + item.totalInCents,
    0,
  );
  const visibleData =
    data.length > 5
      ? [
          ...data.slice(0, 5),
          {
            category: "Other",
            totalInCents: data
              .slice(5)
              .reduce((sum, item) => sum + item.totalInCents, 0),
          },
        ]
      : data;
  if (!data.length)
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
        <p className="font-medium">No spending recorded yet</p>
        <p className="text-muted-foreground text-sm">
          Expenses from this month will appear here.
        </p>
      </div>
    );

  return (
    <figure className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(16rem,1.1fr)] lg:items-center">
      <div
        className="h-64"
        aria-label={`Spending breakdown totaling ${formatPriceInCents(totalInCents)}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={visibleData}
              dataKey="totalInCents"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={72}
              outerRadius={98}
              paddingAngle={2}
              stroke="none"
            >
              {visibleData.map((item, index) => (
                <Cell
                  key={item.category}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (!viewBox || !("cx" in viewBox)) return null;
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        className="fill-foreground text-xl font-semibold"
                      >
                        {formatPriceInCents(totalInCents)}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        dy="1.6em"
                        className="fill-muted-foreground text-xs"
                      >
                        spent this month
                      </tspan>
                    </text>
                  );
                }}
              />
            </Pie>
            <Tooltip
              formatter={(value) => formatPriceInCents(value as number)}
              contentStyle={{
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
                borderRadius: "0.75rem",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <figcaption>
        <p className="mb-3 text-muted-foreground text-sm">
          Top spending categories
        </p>
        <ul className="space-y-3">
          {visibleData.map((entry, index) => {
            const share = totalInCents
              ? (entry.totalInCents / totalInCents) * 100
              : 0;
            return (
              <li
                key={entry.category}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="truncate font-medium text-sm">
                    {formatCategory(entry.category)}
                  </span>
                </div>
                <span className="shrink-0 text-right font-mono text-sm tabular-nums">
                  <span>{formatPriceInCents(entry.totalInCents)}</span>
                  <span className="ml-2 text-muted-foreground text-xs">
                    {share.toFixed(0)}%
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </figcaption>
    </figure>
  );
}

export function SyncAccountBalancesButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function handleSync() {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAccountBalance();
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch {
      setError("Unable to sync balances. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <div className="space-y-1">
      <Button disabled={isLoading} onClick={handleSync}>
        <RefreshCcw className={cn(isLoading && "animate-spin")} />
        <span>{isLoading ? "Syncing..." : "Sync balances"}</span>
      </Button>
      {error && (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
