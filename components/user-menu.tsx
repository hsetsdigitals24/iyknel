"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") return <div className="h-8 w-20" aria-hidden />;

  if (!session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/register">Register business</Link>
        </Button>
      </div>
    );
  }

  const isAdmin = session.user.role === "ADMIN";
  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost" size="sm">
        <Link href={isAdmin ? "/admin" : "/dashboard"}>
          {isAdmin ? "Back office" : "Dashboard"}
        </Link>
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        Sign out
      </Button>
    </div>
  );
}
