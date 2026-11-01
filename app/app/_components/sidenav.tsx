"use client";

import { cn } from "@/lib/utils";
import {
  Landmark,
  LayoutDashboard,
  ReceiptText,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ComponentType } from "react";

const items = [
  { label: "Overview", icon: LayoutDashboard, href: "/app" },
  { label: "Transactions", icon: ReceiptText, href: "/app/transactions" },
  { label: "Account", icon: UserRound, href: "/app/account" },
];

export default function Sidenav() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-sidebar px-3 py-5">
        <Link
          href="/app"
          className="mb-8 flex items-center gap-2 px-3 font-semibold tracking-tight"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Landmark className="size-4" />
          </span>
          Ledgerly
        </Link>
        <nav aria-label="Primary navigation">
          <ul className="space-y-1">
            {items.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                active={pathname === item.href}
              />
            ))}
          </ul>
        </nav>
        <p className="mt-auto px-3 text-muted-foreground text-xs">
          Your financial overview
        </p>
      </aside>
      <nav
        aria-label="Primary navigation"
        className="fixed inset-x-0 bottom-0 z-20 border-t bg-sidebar/95 px-2 py-2 backdrop-blur md:hidden"
      >
        <ul className="flex justify-around">
          {items.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              active={pathname === item.href}
              compact
            />
          ))}
        </ul>
      </nav>
    </>
  );
}

type NavItemProps = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
  active: boolean;
  compact?: boolean;
};
function NavItem({ label, icon: Icon, href, active, compact }: NavItemProps) {
  return (
    <li className={cn(compact && "flex-1")}>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
          active
            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          compact && "flex-col gap-1 px-2 py-1.5 text-xs",
        )}
      >
        <Icon className="size-4" />
        {label}
      </Link>
    </li>
  );
}
