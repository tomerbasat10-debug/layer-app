import React, { useState, useEffect } from "react";
import { 
  User, 
  Calendar, 
  Bot, 
  Bell, 
  SlidersHorizontal,
  Globe, 
  Lock, 
  Info, 
  LogOut, 
  Trash2, 
  Check, 
  Sparkles,
  RefreshCw,
  Clock,
  LayoutGrid
} from "lucide-react";
import { translate, Language } from "../i18n";
import { apiFetch } from "../api";
import { Capacitor } from "@capacitor/core";
import { UserProfile, UserSettings } from "../types";
import EditToday from "./EditToday";
import ConfirmDialog from "./ConfirmDialog";
import { useToast } from "./Toast";
import { motion } from "motion/react";

interface SettingsScreenProps {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onLogout: () => void;
}

export default function SettingsScreen({ lang, onLanguageChange, onLogout }: SettingsScreenProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Layout customization sub-view router
  const [isEditingLayout, setIsEditingLayout] = useState(false);

  const { toast } = useToast();

  // Status indicators
  const [syncLoading, setSyncLoading] = useState(false);
  const [testNotificationSent, setTestNotificationSent] = useState(false);

  // Confirm dialogs
  type ConfirmTarget = "purge_ai" | "purge_checkins" | "purge_all" | null;
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);

  const t = (key: Parameters<typeof translate>[1], params?: any) => translate(lang, key, params);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const profRes = await apiFetch("/api/profile");
      const profData = await profRes.json();
      setProfile(profData);

      const setRes = await apiFetch("/api/settings");
      const setData = await setRes.json();
      setSettings(setData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUpdateSetting = async (key: keyof UserSettings, value: any) => {
    if (!settings) return;
    
    const updated = { ...settings, [key]: value };
    setSettings(updated);

    try {
      await apiFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value })
      });
      toast(lang === "he" ? "ההגדרות נשמרו" : "Settings saved");
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProfile = async (key: keyof UserProfile, value: any) => {
    if (!profile) return;
    
    const updated = { ...profile, [key]: value };
    setProfile(updated);

    try {
      await apiFetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value })
      });
      toast(lang === "he" ? "הפרופיל עודכן" : "Profile saved");
    } catch (err) {
      console.error(err);
    }
  };

  const handleLanguageToggle = async (newLang: Language) => {
    onLanguageChange(newLang);
    handleUpdateSetting("language", newLang);
  };

  const handleCalendarConnectToggle = async () => {
    if (!profile) return;
    const connectState = !profile.calendar_connected;

    try {
      if (connectState) {
        const { googleSignIn } = await import("../firebase");
        const result = await googleSignIn();
        const headers: HeadersInit = {};
        if (result?.accessToken) {
          headers["Authorization"] = `Bearer ${result.accessToken}`;
        }
        const response = await apiFetch("/api/calendar/connect", {
          method: "POST",
          headers,
        });
        if (response.ok) {
          await apiFetch("/api/calendar/sync", {
            method: "POST",
            headers,
          });
          setProfile(prev => prev ? { ...prev, calendar_connected: true } : null);
          toast(lang === "he" ? "היומן חובר!" : "Calendar connected!");
        }
      } else {
        const response = await apiFetch("/api/calendar/disconnect", { method: "POST" });
        if (response.ok) {
          setProfile(prev => prev ? { ...prev, calendar_connected: false } : null);
          toast(lang === "he" ? "היומן נותק." : "Calendar unlinked.");
        }
      }
    } catch (err: any) {
      toast(lang === "he" ? "החיבור נכשל, נסה שנית" : "Connection failed, please try again", "error");
      console.error(err);
    }
  };

  const handleManualSync = async () => {
    setSyncLoading(true);
    try {
      const { getAccessToken, googleSignIn } = await import("../firebase");
      let token = await getAccessToken();
      if (!token) {
        const result = await googleSignIn();
        token = result?.accessToken || null;
      }
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await apiFetch("/api/calendar/sync", { 
        method: "POST",
        headers
      });
      if (response.ok) {
        toast(lang === "he" ? "סונכרן בהצלחה!" : "Synchronized successfully!");
      }
    } catch (e) { }
    setSyncLoading(false);
  };

  const handleTestNotification = async () => {
    setTestNotificationSent(true);
    try {
      const response = await apiFetch("/api/notifications/test", { method: "POST" });
      if (response.ok) {
        toast(t("testNotificationSent"), "info");
      }
    } catch (e) {
      toast(lang === "he" ? "שגיאה בשליחת התראה" : "Failed to send test notification", "error");
    } finally {
      setTestNotificationSent(false);
    }
  };

  // Privacy: Export personal user JSON file
  const handleExportData = () => {
    if (!profile) return;
    const expData = {
      profile,
      settings,
      export_date: new Date().toISOString(),
      disclaimer: "Layer private day audit export"
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(expData, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `layer_vault_export_${profile.email}.json`);
    dlAnchor.click();
  };

  const handleRestoreDefaultActions = async () => {
    try {
      const response = await apiFetch("/api/actions/restore-defaults", { method: "POST" });
      if (response.ok) {
        toast(lang === "he" ? "הפעולות ברירת המחדל שוחזרו!" : "Default actions restored!");
      }
    } catch (e) {
      toast(lang === "he" ? "שגיאה בשחזור פעולות" : "Failed to restore actions", "error");
    }
    setConfirmTarget(null);
  };

  const handlePurgeAiInsights = async () => {
    try {
      const response = await apiFetch("/api/privacy/reset-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear_ai: true })
      });
      if (response.ok) {
        toast(lang === "he" ? "תובנות והיסטוריית הצ'אט נמחקו." : "Insights purged successfully.");
      }
    } catch (e) { }
    setConfirmTarget(null);
  };

  const handlePurgeCheckIns = async () => {
    try {
      const response = await apiFetch("/api/privacy/reset-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear_checkins: true })
      });
      if (response.ok) {
        toast(lang === "he" ? "יומן הבדיקות נמחק." : "Check-ins log erased.");
      }
    } catch (e) { }
    setConfirmTarget(null);
  };

  const handlePurgeAllData = async () => {
    try {
      const response = await apiFetch("/api/privacy/reset-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delete_all: true })
      });
      if (response.ok) {
        onLogout();
      }
    } catch (e) { }
    setConfirmTarget(null);
  };

  if (loading) {
    return (
      <div className="space-y-5 pb-24 animate-pulse">
        <div className="space-y-2">
          <div className="h-5 bg-slate-200 rounded-lg w-28" />
          <div className="h-3 bg-slate-100 rounded-lg w-40" />
        </div>
        {[1,2,3,4].map(i => (
          <div key={i} className="h-28 bg-white border border-slate-100 rounded-3xl" />
        ))}
      </div>
    );
  }

  // Render Layout Customizer View instead if routed
  if (isEditingLayout) {
    return <EditToday lang={lang} onClose={() => setIsEditingLayout(false)} />;
  }

  const isRtl = lang === "he";
  const isNative = Capacitor.isNativePlatform();

  return (
    <div className="space-y-6 pb-24 font-sans animate-fade-in text-dark-navy">
      
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold font-display leading-tight tracking-tight">
            {t("settingsTitle")}
          </h1>
          <p className="text-xs text-slate-400 mt-1">{lang === "he" ? "מידע קריטי ושליטה במערכת" : "System rules and account control."}</p>
        </div>
      </div>

      {/* Account config card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        whileHover={{ y: -3, scale: 1.005, boxShadow: "0 12px 30px -10px rgba(0,0,0,0.05)" }}
        className="bg-white border border-gray-100 rounded-3xl p-5.5 shadow-sm space-y-4 hover:shadow-md transition-all"
      >
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <User className="w-4 h-4 text-[#0066FF]" />
          <span>{t("accountSection")}</span>
        </h3>
        
        <div className="flex items-center gap-3">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="w-12 h-12 rounded-xl bg-slate-50 border border-gray-100 object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-[#0066FF]/10 border border-[#0066FF]/15 flex items-center justify-center">
              <span className="text-base font-black text-[#0066FF] select-none">
                {profile?.display_name?.charAt(0)?.toUpperCase() || "?"}
              </span>
            </div>
          )}
          <div>
            <h4 className="text-base font-bold leading-normal text-dark-navy">
              {profile?.display_name || "משתמש לייר"}
            </h4>
            <span className="text-xs text-slate-400 block pt-0.5">{profile?.email}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-50 flex gap-2">
          <button
            onClick={onLogout}
            className="h-10 px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{t("signout")}</span>
          </button>
        </div>
      </motion.div>

      {/* Google Calendar config card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        whileHover={{ y: -3, scale: 1.005, boxShadow: "0 12px 30px -10px rgba(0,0,0,0.05)" }}
        className="bg-white border border-gray-100 rounded-3xl p-5.5 shadow-sm space-y-4 hover:shadow-md transition-all"
      >
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-[#0066FF]" />
          <span>{t("calendarSection")}</span>
        </h3>

        <p className="text-xs text-slate-500 leading-relaxed font-sans select-none">
          {t("calendarExplanation")}
        </p>

        <div className="flex flex-col gap-2.5 pt-1.5">
          <div className="flex items-center justify-between p-3.5 bg-[#F4F5F7] border border-gray-100 rounded-2xl">
            <div>
              <span className="text-[10px] font-bold text-slate-600 block leading-none select-none">
                {lang === "he" ? "מצב חיבור" : "Connection status"}
              </span>
              <span className="text-xs font-bold mt-1 block">
                {profile?.calendar_connected ? (isRtl ? "מחובר ליומן גוגל" : "Linked to Google Calendar") : (isRtl ? "מנותק" : "Disconnected")}
              </span>
            </div>
            <button
              onClick={handleCalendarConnectToggle}
              className={`h-9 px-4 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer ${
                profile?.calendar_connected
                  ? "bg-rose-55 border border-rose-100 text-rose-600 hover:bg-rose-100"
                  : "bg-[#0066FF] text-white hover:bg-[#0052cc] shadow-blue-600/10"
              }`}
            >
              {profile?.calendar_connected ? t("disconnectCalendar") : t("connectCalendarCTA")}
            </button>
          </div>

          {profile?.calendar_connected && (
            <div className="flex gap-2 duration-300 animate-fade-in">
              <button
                onClick={handleManualSync}
                disabled={syncLoading}
                className="flex-1 h-10 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${syncLoading ? "animate-spin text-[#0066FF]" : ""}`} />
                <span>{t("syncNow")}</span>
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* AI Intelligence config card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        whileHover={{ y: -3, scale: 1.005, boxShadow: "0 12px 30px -10px rgba(0,0,0,0.05)" }}
        className="bg-white border border-gray-100 rounded-3xl p-5.5 shadow-sm space-y-4 hover:shadow-md transition-all"
      >
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Bot className="w-4 h-4 text-[#0066FF]" />
          <span>{t("aiSection")}</span>
        </h3>

        <div className="flex items-center justify-between p-2 bg-[#F4F5F7] border border-gray-100 rounded-2xl">
          <label className="text-xs font-black text-slate-600 uppercase cursor-pointer pl-2 select-none" htmlFor="ai-toggle">
            {t("enableAiLabel")}
          </label>
          <input
            id="ai-toggle"
            type="checkbox"
            checked={settings?.ai_enabled || false}
            onChange={(e) => handleUpdateSetting("ai_enabled", e.target.checked)}
            className="w-4.5 h-4.5 accent-[#0066FF] cursor-pointer"
          />
        </div>

        {settings?.ai_enabled && (
          <div className="space-y-3.5 pt-1.5 animate-fade-in">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-500 select-none">
                {t("aiToneLabel")}
              </label>
              <select
                value={settings?.tone || "warm"}
                onChange={(e) => handleUpdateSetting("tone", e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-dark-navy text-sm focus:outline-none focus:border-[#0066FF] cursor-pointer"
              >
                <option value="warm">{t("toneWarm")}</option>
                <option value="direct">{t("toneDirect")}</option>
                <option value="analytical">{t("toneAnalytical")}</option>
              </select>
            </div>
          </div>
        )}
      </motion.div>

      {/* Local Push Notifications config card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        whileHover={{ y: -3, scale: 1.005, boxShadow: "0 12px 30px -10px rgba(0,0,0,0.05)" }}
        className="bg-white border border-gray-100 rounded-3xl p-5.5 shadow-sm space-y-4 hover:shadow-md transition-all"
      >
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Bell className="w-4 h-4 text-[#0066FF]" />
          <span>{t("notificationsSection")}</span>
        </h3>

        <div className="flex items-center justify-between p-2 bg-[#F4F5F7] border border-gray-100 rounded-2xl">
          <label className="text-xs font-black text-slate-600 uppercase cursor-pointer pl-2 select-none" htmlFor="not-toggle">
            {t("notificationsEnabledLabel")}
          </label>
          <input
            id="not-toggle"
            type="checkbox"
            checked={settings?.notifications_enabled || false}
            onChange={(e) => handleUpdateSetting("notifications_enabled", e.target.checked)}
            className="w-4.5 h-4.5 accent-[#0066FF] cursor-pointer"
          />
        </div>

        {settings?.notifications_enabled && (
          <div className="space-y-4 pt-1.5 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-550 select-none">{t("quietHoursStart")}</label>
                <input
                  type="time"
                  value={settings?.quiet_hours_start || "22:00"}
                  onChange={(e) => handleUpdateSetting("quiet_hours_start", e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 text-slate-900 text-sm text-center"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-550 select-none">{t("quietHoursEnd")}</label>
                <input
                  type="time"
                  value={settings?.quiet_hours_end || "07:00"}
                  onChange={(e) => handleUpdateSetting("quiet_hours_end", e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 text-slate-900 text-sm text-center"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-2 bg-[#F4F5F7] border border-gray-100 rounded-2xl">
              <label className="text-xs font-black text-slate-600 uppercase cursor-pointer pl-2 select-none" htmlFor="pause-today">
                {t("pauseForTodayLabel")}
              </label>
              <input
                id="pause-today"
                type="checkbox"
                checked={settings?.pause_for_today || false}
                onChange={(e) => handleUpdateSetting("pause_for_today", e.target.checked)}
                className="w-4.5 h-4.5 accent-[#0066FF] cursor-pointer"
              />
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleTestNotification}
                disabled={testNotificationSent}
                className="w-full h-10 border border-blue-200 hover:bg-blue-50/50 text-[#0066FF] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
              >
                {testNotificationSent
                  ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-[#0066FF] border-t-transparent" />
                  : t("testNotificationCTA")}
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Personalization controls */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        whileHover={{ y: -3, scale: 1.005, boxShadow: "0 12px 30px -10px rgba(0,0,0,0.05)" }}
        className="bg-white border border-gray-100 rounded-3xl p-5.5 shadow-sm space-y-4 hover:shadow-md transition-all"
      >
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <SlidersHorizontal className="w-4 h-4 text-[#0066FF]" />
          <span>{t("personalizationSection")}</span>
        </h3>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <span className="block text-xs font-semibold text-slate-500 select-none">{t("strongTimeWindow")}</span>
            <input
              type="text"
              value={profile?.strong_time_window || "08:00-11:00"}
              onChange={(e) => handleUpdateProfile("strong_time_window", e.target.value)}
              className="w-full h-11 bg-slate-50 hover:bg-slate-100 px-4 rounded-xl border border-slate-200 text-slate-900 text-sm text-center focus:outline-none focus:border-[#0066FF]"
            />
          </div>

          <div className="space-y-1">
            <span className="block text-xs font-semibold text-slate-500 select-none">{t("driftTimeWindow")}</span>
            <input
              type="text"
              value={profile?.drift_time_window || "17:00-19:00"}
              onChange={(e) => handleUpdateProfile("drift_time_window", e.target.value)}
              className="w-full h-11 bg-slate-50 hover:bg-slate-100 px-4 rounded-xl border border-slate-200 text-slate-900 text-sm text-center focus:outline-none focus:border-[#0066FF]"
            />
          </div>
        </div>

        <button
          onClick={() => setIsEditingLayout(true)}
          className="w-full h-11 bg-dark-navy hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <LayoutGrid className="w-4 h-4" />
          <span>{t("editTodayLayoutTitle")}</span>
        </button>
      </motion.div>

      {/* Language Trigger Selection */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        whileHover={{ y: -3, scale: 1.005, boxShadow: "0 12px 30px -10px rgba(0,0,0,0.05)" }}
        className="bg-white border border-gray-100 rounded-3xl p-5.5 shadow-sm space-y-4 hover:shadow-md transition-all"
      >
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Globe className="w-4 h-4 text-[#0066FF]" />
          <span>{t("languageLabel")}</span>
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleLanguageToggle("he")}
            className={`py-3.5 rounded-2xl border font-bold text-xs transition-all select-none cursor-pointer ${
              lang === "he" ? "border-[#0066FF] bg-blue-50/50 text-[#0066FF]" : "border-slate-150 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t("hebrew")}
          </button>
          <button
            onClick={() => handleLanguageToggle("en")}
            className={`py-3.5 rounded-2xl border font-bold text-xs transition-all select-none cursor-pointer ${
              lang === "en" ? "border-[#0066FF] bg-blue-50/50 text-[#0066FF]" : "border-slate-150 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t("english")}
          </button>
        </div>
      </motion.div>

      {/* Privacy and destruction of data */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        whileHover={{ y: -3, scale: 1.005, boxShadow: "0 12px 30px -10px rgba(0,0,0,0.05)" }}
        className="bg-white border border-gray-100 rounded-3xl p-5.5 shadow-sm space-y-4 hover:shadow-md transition-all"
      >
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Lock className="w-4 h-4 text-[#0066FF]" />
          <span>{t("privacySection")}</span>
        </h3>

        <div className="space-y-2 pt-1">
          <button
            onClick={handleExportData}
            className="w-full h-11 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {t("exportDataCTA")}
          </button>

          <button
            onClick={handleRestoreDefaultActions}
            className="w-full h-11 border border-emerald-200 hover:bg-emerald-50 rounded-xl text-xs font-bold text-emerald-700 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {lang === "he" ? "שחזר פעולות ברירת מחדל" : "Restore default actions"}
          </button>

          <button
            onClick={() => setConfirmTarget("purge_ai")}
            className="w-full h-11 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-[#0066FF] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {t("deleteChatInsights")}
          </button>

          <button
            onClick={() => setConfirmTarget("purge_checkins")}
            className="w-full h-11 border border-slate-200 hover:bg-rose-50 rounded-xl text-xs font-bold text-rose-600 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {lang === "he" ? "מחק יומן בדיקות ותוצאות" : "Erase check-ins log"}
          </button>

          <button
            onClick={() => setConfirmTarget("purge_all")}
            className="w-full h-11 bg-rose-50/50 hover:bg-rose-100/50 rounded-xl text-xs font-bold text-rose-600 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>{t("deleteAllDataCTA")}</span>
          </button>
        </div>
      </motion.div>

      <ConfirmDialog
        open={confirmTarget !== null}
        title={
          confirmTarget === "purge_all"
            ? (lang === "he" ? "מחק את כל הנתונים" : "Delete All Data")
            : confirmTarget === "purge_checkins"
            ? (lang === "he" ? "מחק יומן בדיקות" : "Erase Check-ins")
            : (lang === "he" ? "מחק תובנות AI" : "Purge AI Insights")
        }
        message={
          confirmTarget === "purge_all"
            ? (lang === "he" ? "פעולה זו תמחק את כל הנתונים שלך ותנתק את החשבון לצמיתות." : "This will permanently delete all your data and log you out.")
            : confirmTarget === "purge_checkins"
            ? (lang === "he" ? "כל יומן הבדיקות יימחק לצמיתות." : "All check-in records will be permanently erased.")
            : (lang === "he" ? "כל תובנות ה-AI והיסטוריית הצ'אט יימחקו." : "All AI insights and chat history will be deleted.")
        }
        confirmLabel={lang === "he" ? "מחק" : "Delete"}
        cancelLabel={t("cancel")}
        destructive
        onConfirm={() => {
          if (confirmTarget === "purge_ai") handlePurgeAiInsights();
          else if (confirmTarget === "purge_checkins") handlePurgeCheckIns();
          else if (confirmTarget === "purge_all") handlePurgeAllData();
        }}
        onCancel={() => setConfirmTarget(null)}
      />

      {/* About App definitions */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        whileHover={{ y: -3, scale: 1.005 }}
        className="bg-transparent border border-gray-100 rounded-3xl p-5.5 space-y-3.5 text-center transition-all opacity-80"
      >
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
          <Info className="w-4 h-4 text-[#0066FF]" />
          <span>{t("aboutSection")}</span>
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed font-sans max-w-sm mx-auto select-none">
          {t("aboutText")}
        </p>
        <div className="text-xs text-slate-400 font-bold font-display select-none">
          <span>{t("version")}</span>
        </div>
      </motion.div>

    </div>
  );
}
