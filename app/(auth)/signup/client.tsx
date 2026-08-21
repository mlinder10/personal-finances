"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { useState } from "react";

export default function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSignup() {
    try {
      const res = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.text();
      console.log(data);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 w-md">
        <h1 className="font-bold text-2xl">Sign Up</h1>
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
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
          <Button onClick={handleSignup} className="w-full">
            Sign Up
          </Button>
          <Separator />
          <Link href="/signin">
            <Button variant="outline" className="w-full">
              Sign In
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
