"use client";

import { useAuth } from "@/lib/auth/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LogOut } from "lucide-react";

export default function ProfilePage() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6">
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
          <Button
            variant="destructive"
            className="mt-4 gap-2"
            onClick={logout}
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
