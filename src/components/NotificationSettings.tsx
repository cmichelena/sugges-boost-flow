import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Bell, Mail, Smartphone, BellRing } from "lucide-react";
import { useTranslation } from "react-i18next";

interface NotificationPreferences {
  id: string;
  user_id: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
}

export const NotificationSettings = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences(data);
      } else {
        // Create default preferences if they don't exist
        const { data: newPrefs, error: insertError } = await supabase
          .from("notification_preferences")
          .insert({
            user_id: user!.id,
            in_app_enabled: true,
            email_enabled: true,
            push_enabled: false,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setPreferences(newPrefs);
      }
    } catch (error: any) {
      console.error("Error loading notification preferences:", error);
      toast.error(t("settings.notificationLoadError"));
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return;

    setSaving(true);
    const previousValue = preferences[key];

    // Optimistic update
    setPreferences({ ...preferences, [key]: value });

    type PrefUpdate = Partial<
      Pick<NotificationPreferences, "in_app_enabled" | "email_enabled" | "push_enabled">
    > & { updated_at: string };

    const payload: PrefUpdate = {
      [key]: value,
      updated_at: new Date().toISOString(),
    } as PrefUpdate;

    try {
      const { error } = await supabase
        .from("notification_preferences")
        .update(payload)
        .eq("user_id", user!.id);

      if (error) throw error;
      toast.success(t("settings.notificationUpdateSuccess"));
    } catch (error: any) {
      console.error("Error updating notification preference:", error);
      // Revert on error
      setPreferences({ ...preferences, [key]: previousValue });
      toast.error(t("settings.notificationUpdateError"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Bell className="w-5 h-5" />
        {t("settings.notifications")}
      </h2>

      <p className="text-sm text-muted-foreground mb-6">
        {t("settings.notificationsDescription")}
      </p>

      <div className="space-y-6">
        {/* In-App Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BellRing className="w-5 h-5 text-primary" />
            </div>
            <div>
              <Label htmlFor="in-app" className="text-base font-medium">
                {t("settings.inAppNotifications")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("settings.inAppDescription")}
              </p>
            </div>
          </div>
          <Switch
            id="in-app"
            checked={preferences?.in_app_enabled ?? true}
            onCheckedChange={(checked) => updatePreference("in_app_enabled", checked)}
            disabled={saving}
          />
        </div>

        {/* Email Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <Label htmlFor="email" className="text-base font-medium">
                {t("settings.emailNotifications")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("settings.emailDescription")}
              </p>
            </div>
          </div>
          <Switch
            id="email"
            checked={preferences?.email_enabled ?? true}
            onCheckedChange={(checked) => updatePreference("email_enabled", checked)}
            disabled={saving}
          />
        </div>

        {/* Push/Device Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <Label htmlFor="push" className="text-base font-medium">
                {t("settings.pushNotifications")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("settings.pushDescription")}
              </p>
            </div>
          </div>
          <Switch
            id="push"
            checked={preferences?.push_enabled ?? false}
            onCheckedChange={(checked) => updatePreference("push_enabled", checked)}
            disabled={saving}
          />
        </div>
      </div>
    </Card>
  );
};
