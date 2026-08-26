"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { useState } from "react";

export default function SigninForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSignin() {
    try {
      setIsLoading(true);
      await fetch("/api/v1/auth/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      window.location.replace("/app");
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 w-md">
        <h1 className="font-bold text-2xl">Sign In</h1>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
          />
        </div>
        <div className="space-y-2">
          <Button
            onClick={handleSignin}
            className="w-full"
            disabled={isLoading}
          >
            Sign In
          </Button>
          <Separator />
          <Link href="/signup">
            <Button variant="outline" className="w-full" disabled={isLoading}>
              Sign Up
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
