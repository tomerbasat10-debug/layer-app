import React, { useState, useEffect } from "react";
import {
  Calendar,
  Bot,
  CheckSquare,
  Settings as SettingsIcon,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";

import { Language, translate } from "./i18n";
import { UserProfile } from "./types";
import { initAuth, getAccessToken, logoutUser } from "./firebase";
import { setStoredEmail, clearStoredEmail, apiFetch } from "./api";
import logoUrl from "./assets/images/layer_logo_v3_1779839083605.png";

// Import modular pages
import Login from "./components/Login";
import Onboarding from "./components/Onboarding";
import TodayScreen from "./components/TodayScreen";
import ActionLibrary from "./components/ActionLibrary";
import ChatRoom from "./components/ChatRoom";
import RecapScreen from "./components/RecapScreen";
import SettingsScreen from "./components/SettingsScreen";

export default function App() {
  const [lang, setLang] = useState<Language>("he");
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<string>("today");
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(["today"]));

  const handleTabSwitch = (tab: string) => {
    if (!visitedTabs.has(tab)) {
      setVisitedTabs(prev => new Set([...prev, tab]));
    }
    setActiveTab(tab);
  };

  const [loading, setLoading] = useState(true);

  const t = (key: Parameters<typeof translate>[1], params?: any) => translate(lang, key, params);

  const checkUserSession = async (email: string) => {
    try {
      setLoading(true);
      setStoredEmail(email);

      // Initialize server session
      await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const response = await apiFetch("/api/profile");
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setUserEmail(email);
        setAuthenticated(true);
        if (data.language) {
          setLang(data.language as Language);
        }
      } else {
        setAuthenticated(false);
      }
    } catch (err) {
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        if (user.email) {
          checkUserSession(user.email);
        } else {
          setAuthenticated(false);
          setLoading(false);
        }
      },
      () => {
        setAuthenticated(false);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Update HTML body direction dynamically when language settings shift
  useEffect(() => {
    document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  const handleLoginSuccess = async (email: string) => {
    await checkUserSession(email);
  };

  const handleOnboardingComplete = async () => {
    if (userEmail) {
      await checkUserSession(userEmail);
      setActiveTab("today");
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      await apiFetch("/api/auth/logout", { method: "POST" });
      clearStoredEmail();
      setProfile(null);
      setUserEmail(null);
      setAuthenticated(false);
      setActiveTab("today");
    } catch (err) {
      console.error(err);
    }
  };

  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <img 
          src={logoUrl} 
          alt="Layer Logo" 
          referrerPolicy="no-referrer"
          className="w-16 h-16 rounded-2xl shadow-md border border-slate-100 animate-pulse mb-4 object-cover"
        />
        <span className="text-xs text-slate-500">{t("loading")}</span>
      </div>
    );
  }

  // Not signed in
  if (!authenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} lang={lang} />;
  }


  // Signed in but not onboarded yet
  if (profile && !profile.onboarded) {
    return (
      <Onboarding 
        profile={profile} 
        lang={lang} 
        onOnboardingComplete={handleOnboardingComplete} 
      />
    );
  }

  const isRtl = lang === "he";

  return (
    <div className="min-h-screen bg-off-white text-dark-navy pb-28 select-none transition-colors duration-200">
      
      {/* Decorative top ambient color spot */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-44 bg-[#0066FF]/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Core View Area */}
      <main className="max-w-2xl mx-auto px-4 pt-6 md:pt-10">
        <div style={{ display: activeTab === "today" ? "block" : "none" }}>
          {visitedTabs.has("today") && <TodayScreen lang={lang} onNavigate={handleTabSwitch} />}
        </div>
        <div style={{ display: activeTab === "actions" ? "block" : "none" }}>
          {visitedTabs.has("actions") && <ActionLibrary lang={lang} />}
        </div>
        <div style={{ display: activeTab === "chat" ? "block" : "none" }}>
          {visitedTabs.has("chat") && <ChatRoom lang={lang} />}
        </div>
        <div style={{ display: activeTab === "recap" ? "block" : "none" }}>
          {visitedTabs.has("recap") && <RecapScreen lang={lang} />}
        </div>
        <div style={{ display: activeTab === "settings" ? "block" : "none" }}>
          {visitedTabs.has("settings") && (
            <SettingsScreen
              lang={lang}
              onLanguageChange={handleLanguageChange}
              onLogout={handleLogout}
            />
          )}
        </div>
      </main>

      {/* Floating Modern Tab Bar (Section 4 & Design spec) */}
      <nav 
        className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-lg bg-white/80 backdrop-blur-xl rounded-full py-2.5 px-4 shadow-2xl flex items-center justify-between border border-white z-40"
        style={{ direction: isRtl ? "rtl" : "ltr" }}
      >
        <button
          onClick={() => handleTabSwitch("today")}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 relative gap-1 transition-all cursor-pointer ${
            activeTab === "today" ? "text-brand-blue scale-110 font-bold" : "text-slate-400 hover:text-slate-800"
          }`}
        >
          <Calendar className="w-5 h-5 shrink-0" />
          <span className="text-[10px] leading-none tracking-tight select-none">
            {t("today")}
          </span>
          {activeTab === "today" && (
            <motion.span 
              layoutId="activeTabDot" 
              className="absolute -bottom-1 w-1.5 h-1.5 bg-[#0066FF] rounded-full"
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
            />
          )}
        </button>

        <button
          onClick={() => handleTabSwitch("actions")}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 relative gap-1 transition-all cursor-pointer ${
            activeTab === "actions" ? "text-brand-blue scale-110 font-bold" : "text-slate-400 hover:text-slate-800"
          }`}
        >
          <CheckSquare className="w-5 h-5 shrink-0" />
          <span className="text-[10px] leading-none tracking-tight select-none">
            {t("actions")}
          </span>
          {activeTab === "actions" && (
            <motion.span 
              layoutId="activeTabDot" 
              className="absolute -bottom-1 w-1.5 h-1.5 bg-[#0066FF] rounded-full"
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
            />
          )}
        </button>

        <button
          onClick={() => handleTabSwitch("chat")}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 relative gap-1 transition-all cursor-pointer ${
            activeTab === "chat" ? "text-brand-blue scale-110 font-bold" : "text-slate-400 hover:text-slate-800"
          }`}
        >
          <Bot className="w-5 h-5 shrink-0" />
          <span className="text-[10px] leading-none tracking-tight select-none">
            {t("chat")}
          </span>
          {activeTab === "chat" && (
            <motion.span 
              layoutId="activeTabDot" 
              className="absolute -bottom-1 w-1.5 h-1.5 bg-[#0066FF] rounded-full"
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
            />
          )}
        </button>

        <button
          onClick={() => handleTabSwitch("recap")}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 relative gap-1 transition-all cursor-pointer ${
            activeTab === "recap" ? "text-brand-blue scale-110 font-bold" : "text-slate-400 hover:text-slate-800"
          }`}
        >
          <TrendingUp className="w-5 h-5 shrink-0" />
          <span className="text-[10px] leading-none tracking-tight select-none">
            {t("recap")}
          </span>
          {activeTab === "recap" && (
            <motion.span 
              layoutId="activeTabDot" 
              className="absolute -bottom-1 w-1.5 h-1.5 bg-[#0066FF] rounded-full"
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
            />
          )}
        </button>

        <button
          onClick={() => handleTabSwitch("settings")}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 relative gap-1 transition-all cursor-pointer ${
            activeTab === "settings" ? "text-brand-blue scale-110 font-bold" : "text-slate-400 hover:text-slate-800"
          }`}
        >
          <SettingsIcon className="w-5 h-5 shrink-0" />
          <span className="text-[10px] leading-none tracking-tight select-none">
            {t("settings")}
          </span>
          {activeTab === "settings" && (
            <motion.span 
              layoutId="activeTabDot" 
              className="absolute -bottom-1 w-1.5 h-1.5 bg-[#0066FF] rounded-full"
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
            />
          )}
        </button>
      </nav>

    </div>
  );
}
