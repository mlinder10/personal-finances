import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Sidenav from "./_components/sidenav";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return redirect("/signin");

  return (
    <div className="flex min-h-screen">
      <Sidenav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
