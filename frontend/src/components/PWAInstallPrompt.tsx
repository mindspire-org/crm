import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Download, Share2, PlusSquare, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const STORAGE_KEY = "pwa_install_prompt";
const DISMISS_DURATION_DAYS = 7;

interface PromptState {
  dismissedAt?: string;
  dismissCount?: number;
  installed?: boolean;
}

function getPromptState(): PromptState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setPromptState(state: PromptState) {
  try {
    const current = getPromptState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...state }));
  } catch {
    // Ignore storage errors (private mode, etc.)
  }
}

function isPromptDismissed(): boolean {
  const state = getPromptState();
  if (state.installed) return true;
  if (!state.dismissedAt) return false;

  const dismissedDate = new Date(state.dismissedAt);
  const now = new Date();
  const diffDays = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);

  // Show again after DISMISS_DURATION_DAYS or if dismissed more than 2 times
  const dismissCount = state.dismissCount || 0;
  return diffDays < DISMISS_DURATION_DAYS && dismissCount < 3;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isSmallScreen = typeof window !== "undefined" && window.innerWidth < 1024;
  return isMobileUA || isSmallScreen;
}

function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const hasCheckedRef = useRef(false);
  const eventRef = useRef<BeforeInstallPromptEvent | null>(null);

  // Capture install event immediately if available
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: Event) => {
      e.preventDefault();
      eventRef.current = e as BeforeInstallPromptEvent;
      setInstallEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Check if event was already captured globally
    const win = window as any;
    if (win.deferredInstallPrompt) {
      eventRef.current = win.deferredInstallPrompt;
      setInstallEvent(win.deferredInstallPrompt);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  // Main prompt logic
  useEffect(() => {
    if (typeof window === "undefined" || hasCheckedRef.current) return;

    // Don't show if standalone or dismissed
    if (isStandalone()) {
      hasCheckedRef.current = true;
      setPromptState({ installed: true });
      return;
    }

    if (isPromptDismissed()) {
      hasCheckedRef.current = true;
      return;
    }

    // If event is already there, we can proceed
    const win = window as any;
    if (win.deferredInstallPrompt || eventRef.current) {
      const evt = win.deferredInstallPrompt || eventRef.current;
      setInstallEvent(evt);
      setShowPrompt(true);
      hasCheckedRef.current = true;
      return;
    }

    // Only show on mobile if no event yet
    if (!isMobileDevice()) return;
    
    hasCheckedRef.current = true;
    const ios = isIOSDevice();
    setIsIOS(ios);

    // For Android/Chrome with install event available
    if (!ios && (eventRef.current || win.deferredInstallPrompt)) {
      const evt = eventRef.current || win.deferredInstallPrompt;
      setInstallEvent(evt);
      setShowPrompt(true);
      return;
    }

    // For iOS or browsers without install event, show after user engagement
    const timer = setTimeout(() => {
      // Only show if user has spent some time on the site (30 seconds)
      setShowPrompt(true);
    }, ios ? 5000 : 8000); // Longer delay for non-iOS to wait for event

    return () => clearTimeout(timer);
  }, []);

  const handleInstall = useCallback(async () => {
    const win = window as any;
    const evt = installEvent || eventRef.current || win.deferredInstallPrompt;
    if (!evt) return;

    setIsLoading(true);
    try {
      await evt.prompt();
      const result = await evt.userChoice;
      if (result.outcome === "accepted") {
        setPromptState({ installed: true });
        setShowPrompt(false);
      }
    } catch (err) {
      console.error("PWA install error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [installEvent]);

  const handleDismiss = useCallback(() => {
    const state = getPromptState();
    setPromptState({
      dismissedAt: new Date().toISOString(),
      dismissCount: (state.dismissCount || 0) + 1,
    });
    setShowPrompt(false);
  }, []);

  const handleMaybeLater = useCallback(() => {
    setPromptState({ dismissedAt: new Date().toISOString() });
    setShowPrompt(false);
  }, []);

  // Listen for app installed event
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = () => {
      setPromptState({ installed: true });
      setShowPrompt(false);
    };

    window.addEventListener("appinstalled", handler);
    return () => window.removeEventListener("appinstalled", handler);
  }, []);

  if (!showPrompt) return null;

  const showInstallButton = !isIOS && (installEvent || eventRef.current);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
    >
      <Card className="w-full max-w-sm relative animate-in zoom-in-95 fade-in duration-200 shadow-2xl">
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
          aria-label="Close install prompt"
        >
          <X className="h-4 w-4" />
        </button>

        <CardHeader className="text-center pb-3 pt-6">
          <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
            {isIOS ? (
              <Smartphone className="h-7 w-7 text-primary" />
            ) : (
              <Download className="h-7 w-7 text-primary" />
            )}
          </div>
          <CardTitle id="pwa-install-title" className="text-lg font-semibold">
            Install HealthSpire
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            Get faster access and a better experience with our mobile app
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pb-6">
          {isIOS ? (
            <div className="space-y-3 text-sm bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground font-medium text-xs uppercase tracking-wide">
                Install on iOS
              </p>
              <ol className="space-y-2.5 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold mt-0.5">
                    1
                  </span>
                  <span className="leading-relaxed">
                    Tap the{" "}
                    <Share2 className="inline h-3.5 w-3.5 mx-0.5 text-primary" />{" "}
                    <strong>Share</strong> button in Safari
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold mt-0.5">
                    2
                  </span>
                  <span className="leading-relaxed">
                    Scroll down and tap{" "}
                    <PlusSquare className="inline h-3.5 w-3.5 mx-0.5 text-primary" />{" "}
                    <strong>Add to Home Screen</strong>
                  </span>
                </li>
              </ol>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="leading-relaxed">
                Install HealthSpire for quick access from your home screen, offline
                support, and native app-like experience.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            {showInstallButton && (
              <Button
                size="sm"
                className="w-full font-black uppercase tracking-widest text-[11px] h-12 bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-3 border-b-4 border-indigo-800"
                onClick={handleInstall}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    INITIALIZING...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    INSTALL NOW
                  </>
                )}
              </Button>
            )}

            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-muted-foreground hover:text-foreground whitespace-nowrap"
                onClick={handleDismiss}
              >
                Don&apos;t ask again
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 whitespace-nowrap"
                onClick={handleMaybeLater}
              >
                Maybe later
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
