import { auth } from "@/lib/auth";
import PlaidLinkButton from "./client";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Main from "../_components/main";
import Header from "../_components/header";
import Body from "../_components/body";

export default async function AccountPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return redirect("/signin");

  return (
    <Main>
      <Header title="Account" />
      <Body>
        <p className="mb-2 font-bold text-2xl">
          Welcome back, {session.user.name}
        </p>
        <p className="mb-6 text-gray-600">
          Connect your banking records seamlessly through our secure pipeline.
        </p>

        <PlaidLinkButton userId={session.user.id} />
      </Body>
    </Main>
  );
}
