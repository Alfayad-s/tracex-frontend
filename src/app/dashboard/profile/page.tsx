"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { ApiErrorPayload } from "@/lib/api/client";
import type { User } from "@/lib/api/types";

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const [nameValue, setNameValue] = useState(user?.name ?? "");
  const [nameSaving, setNameSaving] = useState(false);
  const [currencyValue, setCurrencyValue] = useState(user?.currency ?? "");
  const [webhookValue, setWebhookValue] = useState(user?.webhookUrl ?? "");
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setNameValue(user.name ?? "");
      setCurrencyValue(user.currency ?? "");
      setWebhookValue(user.webhookUrl ?? "");
    }
  }, [user]);

  if (!user) return null;

  const handleSaveName = async () => {
    const trimmed = nameValue.trim();
    setNameSaving(true);
    try {
      const res = await api.patch<{ success: boolean; user: User }>(
        endpoints.auth.me,
        { name: trimmed || null }
      );
      if (res?.user) {
        updateUser(res.user);
        toast.success("Name updated");
      }
    } catch (err) {
      const e = err as ApiErrorPayload;
      toast.error(e?.message ?? "Failed to update name");
    } finally {
      setNameSaving(false);
    }
  };

  const handleSavePrefs = async () => {
    setPrefsSaving(true);
    try {
      const res = await api.patch<{ success: boolean; user: User }>(
        endpoints.auth.me,
        {
          currency: currencyValue.trim().slice(0, 10) || null,
          webhookUrl: webhookValue.trim().slice(0, 500) || null,
        }
      );
      if (res?.user) {
        updateUser(res.user);
        toast.success("Preferences updated");
      }
    } catch (err) {
      const e = err as ApiErrorPayload;
      toast.error(e?.message ?? "Failed to update preferences");
    } finally {
      setPrefsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setPasswordSaving(true);
    try {
      await api.post(endpoints.auth.changePassword, {
        currentPassword,
        newPassword,
      });
      toast.success("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const e = err as ApiErrorPayload;
      toast.error(e?.message ?? "Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Email and display name. You can update your name and change your
            password below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Email</Label>
            <p className="text-muted-foreground text-sm">{user.email}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-name">Name</Label>
            <div className="flex gap-2">
              <Input
                id="profile-name"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                placeholder="Display name"
                maxLength={255}
                className="max-w-xs"
              />
              <Button
                onClick={handleSaveName}
                disabled={nameSaving || nameValue === (user.name ?? "")}
              >
                {nameSaving ? "Saving…" : "Save"}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Leave empty to clear your display name. Max 255 characters.
            </p>
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium">Preferences</h3>
            <div className="space-y-2">
              <Label htmlFor="profile-currency">Currency (display only)</Label>
              <Input
                id="profile-currency"
                value={currencyValue}
                onChange={(e) => setCurrencyValue(e.target.value)}
                placeholder="e.g. INR, USD"
                maxLength={10}
                className="max-w-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-webhook">
                Webhook URL (notifications)
              </Label>
              <Input
                id="profile-webhook"
                type="url"
                value={webhookValue}
                onChange={(e) => setWebhookValue(e.target.value)}
                placeholder="https://..."
                maxLength={500}
                className="max-w-md"
              />
              <p className="text-muted-foreground text-xs">
                Optional. Called when recurring expenses are run. Max 500 chars.
              </p>
            </div>
            <Button
              onClick={handleSavePrefs}
              disabled={
                prefsSaving ||
                (currencyValue === (user.currency ?? "") &&
                  webhookValue === (user.webhookUrl ?? ""))
              }
            >
              {prefsSaving ? "Saving…" : "Save preferences"}
            </Button>
          </div>

          <form
            onSubmit={handleChangePassword}
            className="space-y-4 border-t pt-4"
          >
            <h3 className="font-medium">Change password</h3>
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="Current password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder="At least 6 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm new password"
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              disabled={
                passwordSaving ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
            >
              {passwordSaving ? "Changing…" : "Change password"}
            </Button>
          </form>

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
