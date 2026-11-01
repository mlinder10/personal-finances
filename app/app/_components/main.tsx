import { ReactNode } from "react";

export default function Main({ children }: { children?: ReactNode }) {
  return <main className="min-w-0 flex-1 bg-muted/30">{children}</main>;
}
