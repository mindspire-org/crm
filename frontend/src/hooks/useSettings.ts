import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE } from "@/lib/api/base";
import { getAuthHeaders } from "@/lib/api/auth";

export type Settings = {
  general: {
    companyName: string;
    logoUrl: string;
    primaryColor: string;
    accentColor?: string;
    secondaryColor?: string;
    faviconUrl?: string;
    timezone: string;
    dateFormat: string;
    domain?: string;
    companyEmail?: string;
    companyPhone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    brandingEnabled?: boolean;
    loginMessage?: string;
    fontFamily?: string;
    darkMode?: boolean;
    compactMode?: boolean;
  };
  localization: {
    language: string;
    currency: string;
    baseCurrency?: string;
    currencies?: Array<{ code: string; symbol?: string; rate: number }>;
    numberFormat: string;
    timezone: string;
    firstDayOfWeek?: number; // 0-6
    weekStartsOnMonday?: boolean;
    decimalSeparator?: string;
    thousandSeparator?: string;
    locale?: string;
  };
  email: {
    smtpHost: string;
    smtpPort: number | "";
    smtpUser: string;
    smtpPass: string;
    fromName: string;
    fromEmail: string;
    secure: boolean; // TLS/SSL
    replyTo?: string;
    defaultSignature?: string;
    rateLimitPerMinute?: number | "";
    testRecipient?: string;
  };
  emailTemplates: Record<string, { subject: string; body: string }>;
  modules: Record<string, boolean>;
  leftMenu: Record<string, boolean>;
  leftMenuOptions?: {
    compact?: boolean;
    showBadges?: boolean;
    collapsibleGroups?: boolean;
  };
  notifications: {
    email: boolean;
    inApp: boolean;
    sms: boolean;
    testEmail?: string;
    desktop?: boolean;
    dailyDigest?: boolean;
    sound?: boolean;
    digestHour?: number;
  };
  integration: {
    slackWebhookUrl?: string;
    zapierHookUrl?: string;
    stripePublishableKey?: string;
    googleCalendarClientId?: string;
    googleCalendarApiKey?: string;
    microsoftAppId?: string;
    twilioSid?: string;
    twilioToken?: string;
    twilioFromPhone?: string;
  };
  cron: {
    lastRunAt?: string;
    enabled?: boolean;
    schedule?: string; // cron expression
  };
  documents: {
    invoiceTerms: string;
    estimateTerms: string;
  };
  system?: {
    maintenanceMode?: boolean;
    debugMode?: boolean;
    autoBackup?: boolean;
    sessionTimeout?: number;
    maxUploadSize?: number;
    backupRetention?: number;
    maintenanceMessage?: string;
  };
  meta: {
    version: string;
    updatedAt: string;
  };
  hr?: {
    standardStartTime: string;
    standardEndTime: string;
    lateThresholdMinutes: number;
    absentThresholdHours: number;
    deductionLateAmount: number;
    deductionAbsentAmount: number;
    hiringMinExperience: string;
    hiringMinEducation: string;
    hiringAgeLimit?: string;
  };
};

const DEFAULTS: Settings = {
  general: {
    companyName: "HealthSpire",
    logoUrl: "/HealthSpire%20logo.png",
    primaryColor: "#2563eb",
    accentColor: "#0891b2",
    secondaryColor: "#0ea5e9",
    faviconUrl: "/favicon.ico",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    dateFormat: "yyyy-MM-dd",
    domain: "https://healthspire.org/",
    companyEmail: "info@healthspire.org",
    companyPhone: "+92 329 6273720",
    addressLine1: "Approach Road, People's Colony",
    addressLine2: "",
    city: "Gujranwala",
    state: "",
    zip: "",
    country: "Pakistan",
    brandingEnabled: true,
    loginMessage: "Welcome to HealthSpire CRM",
    fontFamily: "Inter",
    darkMode: false,
    compactMode: false,
  },
  hr: {
    standardStartTime: "09:00",
    standardEndTime: "18:00",
    lateThresholdMinutes: 15,
    absentThresholdHours: 4,
    deductionLateAmount: 500,
    deductionAbsentAmount: 2000,
    hiringMinExperience: "2 years",
    hiringMinEducation: "Bachelor's",
    hiringAgeLimit: "18-45",
  },
  localization: {
    language: "en",
    currency: "PKR",
    baseCurrency: "PKR",
    currencies: [
      { code: "PKR", symbol: "PKR", rate: 1 },
      { code: "USD", symbol: "USD", rate: 280 },
      { code: "AED", symbol: "AED", rate: 76 },
    ],
    numberFormat: "1,234.56",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    firstDayOfWeek: 1,
    weekStartsOnMonday: true,
    decimalSeparator: ".",
    thousandSeparator: ",",
    locale: "en-US",
  },
  email: {
    smtpHost: "",
    smtpPort: "",
    smtpUser: "",
    smtpPass: "",
    fromName: "HealthSpire",
    fromEmail: "noreply@example.com",
    secure: true,
    replyTo: "support@example.com",
    defaultSignature: "Regards,\nHealthSpire Team",
    rateLimitPerMinute: 60,
    testRecipient: "",
  },
  emailTemplates: {
    welcome: { subject: "Welcome to HealthSpire", body: "Hello {{name}}, welcome!" },
    invoice: { subject: "Invoice {{number}}", body: "Dear {{client}}, your invoice total is {{total}}." },
    resetPassword: { subject: "Reset your password", body: "Click here to reset: {{link}}" },
  },
  modules: {
    crm: true,
    hrm: true,
    projects: true,
    sales: true,
    reports: true,
    calendar: true,
    email: true,
    clientPortal: true,
    plugins: true,
  },
  leftMenu: {
    dashboard: true,
    crm: true,
    hrm: true,
    projects: true,
    prospects: true,
    sales: true,
    reports: true,
    tickets: true,
    calendar: true,
    clientPortal: true,
    plugins: true,
  },
  leftMenuOptions: {
    compact: false,
    showBadges: true,
    collapsibleGroups: true,
  },
  notifications: {
    email: true,
    inApp: true,
    sms: false,
    testEmail: "",
    desktop: true,
    dailyDigest: false,
    sound: true,
    digestHour: 9,
  },
  integration: {
    slackWebhookUrl: "",
    zapierHookUrl: "",
    stripePublishableKey: "",
    googleCalendarClientId: "",
    googleCalendarApiKey: "",
    microsoftAppId: "",
    twilioSid: "",
    twilioToken: "",
    twilioFromPhone: "",
  },
  cron: {
    lastRunAt: undefined,
    enabled: true,
    schedule: "0 9 * * *", // every day at 09:00
  },
  documents: {
    invoiceTerms:
      "1. Please reference the invoice number with your payment.\n\n2. Delivery and scope are as agreed in the invoice.\n\n3. This is a computer-generated document.",
    estimateTerms:
      "1. Please reference the estimate number in all communication.\n\n2. Validity: 7 days unless agreed otherwise.\n\n3. This is a computer-generated document.",
  },
  system: {
    maintenanceMode: false,
    debugMode: false,
    autoBackup: true,
    sessionTimeout: 120,
    maxUploadSize: 10,
    backupRetention: 30,
    maintenanceMessage: "System under maintenance. Please try again later.",
  },
  meta: {
    version: "1.0.0",
    updatedAt: new Date().toISOString(),
  },
};

const KEY = "app_settings_v1";

function mergeSettings(partial: any): Settings {
  const p = partial || {};
  return {
    ...DEFAULTS,
    ...p,
    general: { ...DEFAULTS.general, ...(p.general || {}) },
    localization: { ...DEFAULTS.localization, ...(p.localization || {}) },
    email: { ...DEFAULTS.email, ...(p.email || {}) },
    notifications: { ...DEFAULTS.notifications, ...(p.notifications || {}) },
    integration: { ...DEFAULTS.integration, ...(p.integration || {}) },
    cron: { ...DEFAULTS.cron, ...(p.cron || {}) },
    documents: { ...DEFAULTS.documents, ...(p.documents || {}) },
    system: { ...DEFAULTS.system, ...(p.system || {}) },
    modules: { ...DEFAULTS.modules, ...(p.modules || {}) },
    leftMenu: { ...DEFAULTS.leftMenu, ...(p.leftMenu || {}) },
    leftMenuOptions: { ...DEFAULTS.leftMenuOptions, ...(p.leftMenuOptions || {}) },
    emailTemplates: { ...DEFAULTS.emailTemplates, ...(p.emailTemplates || {}) },
    meta: { ...DEFAULTS.meta, ...(p.meta || {}), updatedAt: (p.meta?.updatedAt || DEFAULTS.meta.updatedAt) },
  } as Settings;
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return DEFAULTS;
      const parsed = JSON.parse(raw);
      return mergeSettings(parsed);
    } catch {
      return DEFAULTS;
    }
  });

  // Load from backend on first mount and merge with defaults
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/settings`, { 
          cache: "no-store",
          headers: getAuthHeaders()
        });
        if (!res.ok) return;
        const remote = (await res.json()) as Partial<Settings>;
        if (cancelled) return;
        const merged = mergeSettings(remote);
        setSettings(merged);
        localStorage.setItem(KEY, JSON.stringify(merged));
      } catch {
        // ignore and keep local cache
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const save = useCallback((next: Partial<Settings>) => {
    setSettings(prev => {
      const merged: Settings = {
        ...prev,
        ...next,
        meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      } as Settings;
      localStorage.setItem(KEY, JSON.stringify(merged));
      return merged;
    });
  }, []);

  const saveSection = useCallback(<K extends keyof Settings>(section: K, data: Settings[K]) => {
    // optimistic update
    save({ [section]: data } as Partial<Settings>);
    // persist to backend
    try {
      fetch(`${API_BASE}/api/settings/${String(section)}` as string, {
        method: "PATCH",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(data),
      }).catch(() => {});
    } catch {
      // ignore background errors
    }
  }, [save]);

  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'settings.json'; a.click();
    URL.revokeObjectURL(url);
  }, [settings]);

  const importJSON = useCallback(async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text);
    // Merge with defaults to ensure new fields are present
    const merged: Settings = { ...DEFAULTS, ...parsed } as Settings;
    setSettings(merged);
    localStorage.setItem(KEY, JSON.stringify(merged));
    try {
      await fetch(`${API_BASE}/api/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      }).catch(() => {});
    } catch {
      // ignore
    }
  }, []);

  const resetAll = useCallback(() => {
    setSettings(DEFAULTS);
    localStorage.setItem(KEY, JSON.stringify(DEFAULTS));
    try {
      fetch(`${API_BASE}/api/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(DEFAULTS),
      }).catch(() => {});
    } catch {}
  }, []);

  const resetSection = useCallback(<K extends keyof Settings>(section: K) => {
    setSettings(prev => {
      const next: Settings = {
        ...prev,
        [section]: DEFAULTS[section],
        meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      } as Settings;
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
    try {
      fetch(`${API_BASE}/api/settings/${String(section)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(DEFAULTS[section]),
      }).catch(() => {});
    } catch {}
  }, []);

  const data = useMemo(() => settings, [settings]);

  return { settings: data, save, saveSection, exportJSON, importJSON, resetAll, resetSection };
}
