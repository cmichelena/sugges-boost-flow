import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePWA } from "@/hooks/usePWA";
import { Download, Smartphone, Check, Share, Plus, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Install() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isInstallable, isInstalled, promptInstall, isIOS, isAndroid } = usePWA();

  useEffect(() => {
    if (isInstalled) {
      // Redirect to dashboard after a short delay if already installed
      const timer = setTimeout(() => navigate("/dashboard"), 2000);
      return () => clearTimeout(timer);
    }
  }, [isInstalled, navigate]);

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      navigate("/dashboard");
    }
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">App Installed!</CardTitle>
            <CardDescription>
              Suggistit has been added to your home screen. Redirecting to the app...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Install Suggistit</CardTitle>
          <CardDescription>
            Get the full app experience with quick access from your home screen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Quick Access</p>
                <p className="text-xs text-muted-foreground">Launch instantly from your home screen</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Works Offline</p>
                <p className="text-xs text-muted-foreground">Browse suggestions even without internet</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Full Screen Experience</p>
                <p className="text-xs text-muted-foreground">No browser bars for an immersive experience</p>
              </div>
            </div>
          </div>

          {/* Install Instructions */}
          {isInstallable ? (
            <Button onClick={handleInstall} className="w-full" size="lg">
              <Download className="mr-2 h-5 w-5" />
              Install App
            </Button>
          ) : isIOS ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                To install on iPhone/iPad:
              </p>
              <div className="space-y-3 bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Tap the</span>
                    <Share className="h-4 w-4" />
                    <span className="text-sm">Share button</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</div>
                  <span className="text-sm">Scroll down and tap "Add to Home Screen"</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</div>
                  <span className="text-sm">Tap "Add" in the top right</span>
                </div>
              </div>
            </div>
          ) : isAndroid ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                To install on Android:
              </p>
              <div className="space-y-3 bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</div>
                  <span className="text-sm">Tap the browser menu (⋮)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Tap "Add to Home screen"</span>
                    <Plus className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</div>
                  <span className="text-sm">Tap "Add" to confirm</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              <p>Open this page on your mobile device to install the app</p>
            </div>
          )}

          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => navigate("/dashboard")}
          >
            Continue in Browser
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
