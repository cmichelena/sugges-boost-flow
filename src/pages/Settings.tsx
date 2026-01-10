import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, User, Globe, Settings as SettingsIcon, Building2, Sun, Moon, Monitor, UserX, ExternalLink } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AvatarUpload } from "@/components/AvatarUpload";
import { NotificationSettings } from "@/components/NotificationSettings";

const languages = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
];

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadProfile();
  }, [user, navigate]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setDisplayName(data.display_name || "");
    } catch (error: any) {
      console.error("Error loading profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user!.id);

      if (error) throw error;
      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleResetData = async () => {
    setResetting(true);
    try {
      const { error } = await supabase.functions.invoke('reset-user-data');
      if (error) throw error;
      
      toast.success("Your data has been reset. Your account remains active.");
      setDisplayName("");
      loadProfile();
    } catch (error: any) {
      console.error("Error resetting account data:", error);
      toast.error("Failed to reset account data. Please try again.");
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-user-account');
      if (error) throw error;
      
      await supabase.auth.signOut();
      toast.success("Account deletion request submitted. Your data will be removed.");
      navigate("/");
    } catch (error: any) {
      console.error("Error requesting account deletion:", error);
      toast.error("Failed to request account deletion. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    toast.success(`Language changed to ${languages.find(l => l.code === code)?.name}`);
  };

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="font-bold mb-6 flex items-center gap-3">
          <SettingsIcon className="w-8 h-8" />
          {t("common.settings")}
        </h1>

        {/* Profile Settings */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            {t("settings.profile")}
          </h2>
          
          <div className="mb-6">
            <Label className="mb-2 block">Profile Photo</Label>
            <AvatarUpload
              userId={user!.id}
              currentAvatarUrl={profile?.avatar_url || null}
              displayName={displayName}
              onAvatarChange={(newUrl) => setProfile(prev => prev ? { ...prev, avatar_url: newUrl } : null)}
            />
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed
              </p>
            </div>

            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
              />
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                t("common.save")
              )}
            </Button>
          </form>
        </Card>

        {/* Language Settings */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            {t("settings.language")}
          </h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="language">Select Language</Label>
              <Select value={currentLanguage.code} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue>
                    <span className="flex items-center gap-2">
                      <span>{currentLanguage.flag}</span>
                      <span>{currentLanguage.name}</span>
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <span className="flex items-center gap-2">
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Appearance Settings */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Sun className="w-5 h-5" />
            {t("settings.appearance")}
          </h2>
          
          <div className="space-y-4">
            <div>
              <Label>Theme</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                  className="flex items-center gap-2"
                >
                  <Sun className="w-4 h-4" />
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                  className="flex items-center gap-2"
                >
                  <Moon className="w-4 h-4" />
                  Dark
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("system")}
                  className="flex items-center gap-2"
                >
                  <Monitor className="w-4 h-4" />
                  System
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                System follows your device preference
              </p>
            </div>
          </div>
        </Card>

        {/* Notification Settings */}
        <div className="mb-6">
          <NotificationSettings />
        </div>

        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {t("settings.organization")}
          </h2>
          
          <p className="text-sm text-muted-foreground mb-4">
            Manage your organization settings, team members, and categories.
          </p>
          
          <Button variant="outline" onClick={() => navigate("/organization")}>
            Go to Organization Settings
          </Button>
        </Card>

        {/* Account Settings */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <UserX className="w-5 h-5" />
            Account
          </h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Privacy Policy</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Learn how we handle your data and protect your privacy.
              </p>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a
                  href="https://www.vector56.com/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  View Privacy Policy
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>

            <div>
              <h3 className="font-medium mb-2">Contact Us</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Have questions or need support? Get in touch with our team.
              </p>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a
                  href="https://www.vector56.com/contact"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  Contact
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-2 text-orange-600 dark:text-orange-400">Reset Account Data</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Delete all your suggestions, comments, reactions, and profile data while keeping your account active. This is like starting fresh.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" className="bg-orange-600 text-white hover:bg-orange-700">
                    Reset My Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset all your data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all your suggestions, comments, reactions, and profile information.
                      Your account will remain active and you can continue using the platform with a fresh start.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetData}
                      disabled={resetting}
                      className="bg-orange-600 text-white hover:bg-orange-700"
                    >
                      {resetting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        "Yes, reset my data"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-2 text-destructive">Delete Account</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    Request Account Deletion
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your account
                      and remove all your data from our servers, including your suggestions,
                      comments, and profile information.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Yes, delete my account"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Settings;