import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Sidenav from "./_components/sidenav";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = auth.api.getSession({ headers: await headers() });
  if (!session) return redirect("/signin");

  return (
    <div className="flex h-full">
      <Sidenav />
      <div className="flex-4 h-full">{children}</div>
    </div>
  );
}
