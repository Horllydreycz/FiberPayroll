"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import { authenticate } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(authenticate, undefined);
  // Controlled so the email survives a failed submit (only the password clears).
  const [email, setEmail] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex justify-center">
          <Logo />
        </Link>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>
              Log in to your Fiber Payroll workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" /> {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />} Log in
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              No account?{" "}
              <Link
                href="/register"
                className="font-medium text-primary hover:underline"
              >
                Create one
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
