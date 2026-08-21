import { DollarSign, LayoutDashboard, User } from "lucide-react";
import Link from "next/link";
import { ComponentType } from "react";

export default function Sidenav() {
  return (
    <nav className="flex-1 bg-sidebar p-4 border-r">
      <ul>
        <NavItem label="Dashboard" icon={LayoutDashboard} href="/app" />
        <NavItem
          label="Transactions"
          icon={DollarSign}
          href="/app/transactions"
        />
        <NavItem label="Account" icon={User} href="/app/account" />
      </ul>
    </nav>
  );
}

type NavItemProps = {
  label: string;
  icon: ComponentType<{ size?: number }>;
  href: string;
};

function NavItem({ label, icon: Icon, href }: NavItemProps) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-2 hover:bg-secondary p-2 rounded-md"
      >
        <Icon size={16} />
        {label}
      </Link>
    </li>
  );
}
