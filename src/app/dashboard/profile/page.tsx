"use client";

import { useAuth } from "@/lib/auth/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          Profile
        </h1>
        <p className="text-muted-foreground text-base">
          Your account details from GET /auth/me.
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Email and display name. Edit/change password when the API supports
            it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <p className="text-muted-foreground text-sm">{user.email}</p>
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <p className="text-muted-foreground text-sm">{user.name ?? "—"}</p>
          </div>
          <p className="text-muted-foreground max-w-prose text-xs">
            Edit name and change password are not yet available (API does not
            expose PATCH profile or change-password endpoints).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
