import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Flame, 
  Plus, 
  Check, 
  X, 
  RefreshCw, 
  TrendingUp, 
  ThumbsUp, 
  HelpCircle,
  HelpCircle as QuestionIcon,
  ChevronLeft,
  ChevronRight,
  Zap,
  BookOpen,
  Heart,
  Dumbbell,
  Folder,
  Wind,
  Coffee,
  CalendarCheck,
  AlertCircle
} from "lucide-react";
import { translate, Language } from "../i18n";
import { apiFetch } from "../api";
import { Capacitor } from "@capacitor/core";
import { FreeWindow, ActionItem, CheckIn, LayoutBlockItem } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { useToast } from "./Toast";
import logoUrl from "../assets/images/layer_logo_v3_1779839083605.png";

// Dynamic icon mapper dynamically loading Lucide references safely
export function renderLucideIcon(iconName: string, className = "w-5 h-5") {
  switch (iconName) {
    case "Heart": return <Heart className={className} />;
    case "BookOpen": return <BookOpen className={className} />;
    case "Dumbbell": return <Dumbbell className={className} />;
    case "Folder": return <Folder className={className} />;
    case "Wind": return <Wind className={className} />;
    case "Coffee": return <Coffee className={className} />;
    default: return <Sparkles className={className} />;
  }
}

interface TodayScreenProps {
  lang: Language;
  onNavigate: (tab: string) => void;
}

export default function TodayScreen({ lang, onNavigate }: TodayScreenProps) {
  const [profile, setProfile] = useState<any>(null);
  const [freeWindow, setFreeWindow] = useState<FreeWindow | null>(null);
  const [suggestions, setSuggestions] = useState<ActionItem[]>([]);
  const [layoutBlocks, setLayoutBlocks] = useState<LayoutBlockItem[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [todaysEvents, setTodaysEvents] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Check in modal controls
  const [activeCheckInAction, setActiveCheckInAction] = useState<ActionItem | null>(null);
  const [checkInStatus, setCheckInStatus] = useState<"done" | "partial" | "not_today">("done");
  const [checkInNote, setCheckInNote] = useState("");
  const [completedMinutes, setCompletedMinutes] = useState(30);

  const { toast } = useToast();

  // Google Calendar confirmation overlay controls
  const [pendingCalendarAction, setPendingCalendarAction] = useState<ActionItem | null>(null);

  const isNative = Capacitor.isNativePlatform();
  const t = (key: Parameters<typeof translate>[1], params?: any) => translate(lang, key, params);

  const loadTodayData = async () => {
    setError(false);
    try {
      const pRes = await apiFetch("/api/profile");
      const pData = await pRes.json();
      setProfile(pData);

      const { getAccessToken } = await import("../firebase");
      const token = await getAccessToken();
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Fetch Layout blocks
      const layRes = await apiFetch("/api/layout-blocks");
      const layData = await layRes.json();
      setLayoutBlocks(layData.sort((a: any, b: any) => a.sort_order - b.sort_order));

      // Fetch Calendar Events (do this before Free windows so free windows use fresh data)
      const calRes = await apiFetch("/api/calendar/sync", { 
        method: "POST",
        headers
      });
      const calData = await calRes.json();
      if (calData.success) {
        setTodaysEvents(calData.events);
      }

      // Fetch Free windows + suggestions
      const freeRes = await apiFetch("/api/calendar/free-windows", { headers });
      const freeData = await freeRes.json();
      setFreeWindow(freeData.freeWindow);
      setSuggestions(freeData.suggestions);

      // Fetch Check-ins
      const chRes = await apiFetch("/api/check-ins");
      const chData = await chRes.json();
      setCheckins(chData);

      // Fetch insights
      const insRes = await apiFetch("/api/ai/insights");
      const insData = await insRes.json();
      setInsights(insData);

    } catch (err) {
      console.error("Failed to fetch today endpoint contents:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodayData();
  }, []);

  const handleManualSync = async () => {
    setRefreshing(true);
    await loadTodayData();
    // Simulate notification creation
    try {
      await apiFetch("/api/notifications/test", { method: "POST" });
    } catch (e) { }
    setRefreshing(false);
  };

  // Log active check-in output
  const handleSubmitCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCheckInAction) return;

    try {
      const response = await apiFetch("/api/check-ins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_id: activeCheckInAction.id,
          status: checkInStatus,
          note: checkInNote,
          minutes_completed: checkInStatus === "done" ? activeCheckInAction.duration_minutes : (checkInStatus === "partial" ? completedMinutes : 0),
        }),
      });

      if (response.ok) {
        setActiveCheckInAction(null);
        setCheckInNote("");
        setCheckInStatus("done");
        loadTodayData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add action as Google Calendar Event
  const handleCalendarCommit = async () => {
    if (!pendingCalendarAction || !freeWindow) return;

    try {
      const { getAccessToken, googleSignIn } = await import("../firebase");
      let token = await getAccessToken();
      if (!token && profile?.calendar_connected) {
        const result = await googleSignIn();
        token = result?.accessToken || null;
      }
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await apiFetch("/api/calendar/add-event", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: pendingCalendarAction.title,
          duration_minutes: pendingCalendarAction.duration_minutes,
        }),
      });

      if (response.ok) {
        setPendingCalendarAction(null);
        toast(t("addCalendarSuccess"));
        loadTodayData();
      }
    } catch (err) {
      console.error("Calendar scheduling issue:", err);
    }
  };

  // Calculate daily completion stats to render progress
  const getDailyStats = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const todaysCheckIns = checkins.filter((c) => c.date === todayStr);
    
    const completed = todaysCheckIns.filter((c) => c.status === "done").length;
    const partial = todaysCheckIns.filter((c) => c.status === "partial").length;
    const skipped = todaysCheckIns.filter((c) => c.status === "not_today").length;
    
    const successRate = todaysCheckIns.length > 0
      ? Math.round(((completed + partial * 0.5) / todaysCheckIns.length) * 100)
      : 0;

    return { completed, partial, skipped, successRate, total: todaysCheckIns.length };
  };

  if (loading) {
    return (
      <div className="space-y-4 pb-24 animate-pulse">
        <div className="flex items-center gap-3 pt-2">
          <div className="w-10 h-10 rounded-xl bg-slate-200" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-slate-200 rounded-lg w-32" />
            <div className="h-3 bg-slate-100 rounded-lg w-24" />
          </div>
        </div>
        <div className="h-48 bg-slate-200 rounded-[32px]" />
        <div className="h-24 bg-slate-100 rounded-3xl" />
        <div className="h-20 bg-slate-100 rounded-2xl" />
        <div className="h-20 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px] text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-rose-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-700">
            {lang === "he" ? "שגיאה בטעינת הנתונים" : "Couldn't load your day"}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {lang === "he" ? "בדוק את החיבור ונסה שנית" : "Check your connection and try again"}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); loadTodayData(); }}
          className="h-10 px-6 bg-[#0066FF] text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/15 active:scale-95 transition-all cursor-pointer"
        >
          {lang === "he" ? "נסה שנית" : "Try again"}
        </button>
      </div>
    );
  }

  const stats = getDailyStats();
  const isRtl = lang === "he";

  return (
    <div className="space-y-6 pb-24 animate-fade-in font-sans">
      
      {/* Small top greeting & manual sync button */}
      <header className="flex justify-between items-center mb-6 pt-2">
        <div className="flex items-center gap-3">
          <img 
            src={logoUrl} 
            alt="Layer" 
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-xl shadow-xs border border-slate-100 object-cover"
          />
          <div>
            <h1 className="text-xl font-extrabold font-display text-dark-navy tracking-tight flex items-center gap-1.5 leading-none">
              <span>{isRtl ? `היי${profile?.display_name ? ` ${profile.display_name}` : ""}` : `Hey${profile?.display_name ? ` ${profile.display_name}` : ""}`}</span>
              <span className="text-lg">👋</span>
            </h1>
            <p className="text-[10px] text-slate-400 mt-1">{t("allPrivatelyStored")}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {profile?.calendar_connected ? (
            <div className="bg-white px-3 py-1.5 rounded-full border border-gray-150/70 flex items-center gap-2 text-[10px] font-bold text-emerald-700 shadow-xs">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span>{isRtl ? "מחובר ל-Google Calendar" : "Connected with Google Calendar"}</span>
            </div>
          ) : (
            <div className="bg-white px-3 py-1.5 rounded-full border border-gray-150/70 flex items-center gap-2 text-[10px] font-medium text-amber-600 shadow-xs">
              <div className="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>
              <span>{isRtl ? "לא מחובר ללוח שנה" : "Calendar disconnected"}</span>
            </div>
          )}

          <button
            onClick={handleManualSync}
            disabled={refreshing}
            className="w-10 h-10 bg-white border border-gray-150/70 hover:bg-slate-50 active:scale-95 text-slate-500 hover:text-brand-blue rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-brand-blue" : ""}`} />
          </button>
        </div>
      </header>

      {/* Render layout blocks based on their configured order */}
      {layoutBlocks
        .filter((block) => block.visible)
        .map((block, index) => {
          switch (block.block_id) {
            case "empty_window_hero":
              return (
                <motion.div 
                  key={block.id} 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.35, ease: "easeOut" }}
                  whileHover={{ y: -4, scale: 1.008, boxShadow: "0 20px 40px -15px rgba(0,102,255,0.4)" }}
                  whileTap={{ scale: 0.995 }}
                  className="bg-gradient-to-br from-[#0066FF] to-[#0051cc] rounded-[32px] p-8 text-white relative overflow-hidden shadow-xl shadow-blue-200/50 transition-all duration-300 cursor-pointer"
                >
                  {/* Decorative background circles matching Design HTML */}
                  <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-blue-500 rounded-full opacity-30 mix-blend-multiply"></div>
                  <div className="absolute right-10 -top-10 w-40 h-40 bg-white rounded-full opacity-10"></div>

                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-bold tracking-wide uppercase flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></span>
                        <span>{t("emptyWindowStatus")}</span>
                      </div>
                      
                      {freeWindow?.source === "mock" && (
                        <div className="px-2.5 py-0.5 bg-black/20 text-white/90 text-[10px] font-medium rounded-full">
                          {lang === "he" ? "רשת ריקה סימולטור" : "Demo Cache"}
                        </div>
                      )}
                    </div>

                    <div>
                      {freeWindow ? (
                        <>
                          <p className="text-blue-100 text-base font-medium mb-1">{t("nextFreeWindow")}</p>
                          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black font-display leading-tight tracking-tight mb-2">
                            {freeWindow.start} – {freeWindow.end}
                          </h2>
                          <p className="text-blue-50 text-base opacity-90">
                            {t("minutesAvailable", { min: freeWindow.durationMinutes })}. {lang === "he" ? "זמן מעולה לפעולה מרוכזת." : "Great time for a deep-focus session."}
                          </p>
                        </>
                      ) : (
                        <p className="text-base text-blue-100">{t("noWindowFound")}</p>
                      )}
                    </div>

                    {!profile?.calendar_connected && (
                      <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                        <p className="text-xs text-blue-100/85 leading-relaxed max-w-sm">
                          {t("calendarNotConnectedDesc")}
                        </p>
                        <button
                          onClick={() => onNavigate("settings")}
                          className="h-8.5 px-4 bg-white text-[#0066FF] hover:bg-slate-50 text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
                        >
                          {t("connectCalendarCTA")}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );

            case "progress":
              return (
                <motion.div 
                  key={block.id} 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.35, ease: "easeOut" }}
                  whileHover={{ y: -3, scale: 1.006, boxShadow: "0 12px 30px -10px rgba(0,0,0,0.06)", borderColor: "rgba(0,102,255,0.15)" }}
                  whileTap={{ scale: 0.995 }}
                  className="bg-gradient-to-br from-white/95 via-white/80 to-[#F8F9FC]/60 backdrop-blur-xl border border-white/80 rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <h4 className="text-xs font-extrabold text-[#0066FF] uppercase tracking-wider">{t("dailyProgressTitle")}</h4>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-black font-display leading-none text-dark-navy">{stats.successRate}%</span>
                        <span className="text-xs text-slate-400">({stats.completed} / {stats.total} {lang === "he" ? "הושלמו" : "Done"})</span>
                      </div>
                    </div>
                    {stats.total > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1.5 bg-[#F4F5F7] p-1.5 rounded-xl text-[10px] font-bold">
                          <span className="text-emerald-600">✔️ {stats.completed}</span>
                          <span className="text-amber-600">🔘 {stats.partial}</span>
                          <span className="text-rose-500">❌ {stats.skipped}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Progress Line */}
                  <div className="w-full bg-[#F4F5F7] h-3 rounded-full mt-4 overflow-hidden">
                    <motion.div 
                      className="bg-[#0066FF] h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.successRate || 0}%` }}
                      transition={{ delay: (index * 0.05) + 0.15, duration: 0.75, ease: "easeOut" }}
                    />
                  </div>
                </motion.div>
              );

            case "suggested_actions":
              return (
                <div key={block.id} className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                      {t("suggestedActionsTitle")}
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {suggestions.length > 0 ? (
                      suggestions.map((action, actionIdx) => {
                        const isHighEnergy = action.energy_level === "high";
                        return (
                          <motion.div 
                            key={action.id}
                            initial={{ opacity: 0, x: isRtl ? 15 : -15 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: (index * 0.05) + (actionIdx * 0.04), duration: 0.35, ease: "easeOut" }}
                            whileHover={{ 
                              y: -4, 
                              scale: 1.008, 
                              boxShadow: isHighEnergy 
                                ? "0 15px 30px -10px rgba(239,68,68,0.15)" 
                                : "0 12px 24px -10px rgba(0,102,255,0.08)",
                              borderColor: isHighEnergy 
                                ? "rgba(239, 68, 68, 0.25)" 
                                : "rgba(0,102,255,0.22)"
                            }}
                            whileTap={{ scale: 0.992 }}
                            className={`rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex items-center justify-between gap-4 border transition-all duration-300 group cursor-pointer backdrop-blur-xl ${
                              isHighEnergy 
                                ? "bg-gradient-to-br from-white/95 via-rose-50/20 to-rose-50/30 border-rose-100/60" 
                                : "bg-gradient-to-br from-white/95 via-slate-50/50 to-[#F8F9FC]/60 border-white/80"
                            }`}
                          >
                            <div className="flex items-center gap-4 animate-parent-hover">
                              <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center border border-slate-100/50 text-xl shadow-xs group-hover:scale-105 transition-transform">
                                {renderLucideIcon(action.icon, "w-6 h-6")}
                              </div>
                              <div>
                                <h4 className="text-base font-bold text-dark-navy leading-tight group-hover:text-[#0066FF] transition-colors">
                                  {action.title}
                                </h4>
                                <div className="flex items-center gap-2 mt-1.5 font-sans">
                                  <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{action.duration_minutes} {lang === "he" ? "דק׳" : "mins"}</span>
                                  </span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                    action.energy_level === "high" ? "bg-rose-50 text-rose-600" :
                                    action.energy_level === "medium" ? "bg-amber-50 text-amber-600" :
                                    "bg-emerald-50 text-emerald-600"
                                  }`}>
                                    {action.energy_level === "high" ? "⚡" : action.energy_level === "medium" ? "🔋" : "💤"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Schedule calendar button */}
                              {profile?.calendar_connected && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPendingCalendarAction(action);
                                  }}
                                  className="h-9 px-3 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-[#0066FF] border border-slate-150 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                                  title={t("addCalendarCTA")}
                                >
                                  <Calendar className="w-4 h-4" />
                                </button>
                              )}

                              {/* Standard check-in trigger */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveCheckInAction(action);
                                  setCheckInStatus("done");
                                }}
                                className="bg-[#F4F5F7] hover:bg-[#E5E7EB] text-slate-800 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer active:scale-95"
                              >
                                {t("checkInPrompt")}
                              </button>
                            </div>
                          </motion.div>
                        );
                      })
                    ) : (
                      <div className="p-8 bg-white border border-dashed border-slate-200 rounded-2xl text-center shadow-xs">
                        <QuestionIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <h5 className="text-xs font-bold text-slate-600 mb-1">{t("addFirstAction")}</h5>
                        <button
                          onClick={() => onNavigate("actions")}
                          className="text-xs text-[#0066FF] font-bold hover:underline"
                        >
                          {t("newAction")} +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );

            case "up_next":
              return (
                <motion.div 
                  key={block.id} 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.35, ease: "easeOut" }}
                  whileHover={{ y: -3, scale: 1.005, boxShadow: "0 12px 30px -10px rgba(0,0,0,0.05)" }}
                  whileTap={{ scale: 0.998 }}
                  className="space-y-3 font-sans"
                >
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest px-1 mr-1">
                    {t("upNextTitle")}
                  </h3>

                  <div className="bg-gradient-to-br from-white/95 via-white/80 to-[#F8F9FC]/60 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow">
                    {todaysEvents.length > 0 ? (
                      todaysEvents.map((ev, evIdx) => {
                        const sTime = new Date(ev.start_time).toLocaleTimeString(lang === "he" ? "he-IL" : "en-US", { hour: "numeric", minute: "2-digit" });
                        const eTime = new Date(ev.end_time).toLocaleTimeString(lang === "he" ? "he-IL" : "en-US", { hour: "numeric", minute: "2-digit" });
                        
                        return (
                          <motion.div 
                            key={ev.id || evIdx} 
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: (index * 0.05) + (evIdx * 0.03) }}
                            className="flex gap-4 items-start"
                          >
                            <p className="text-xs font-bold text-slate-400 w-16 tabular-nums pt-1 shrink-0">
                              {sTime}
                            </p>
                            <div className="flex-1 bg-slate-50 rounded-xl p-3.5 border-r-4 border-[#0066FF]">
                              <p className="text-sm font-bold text-slate-800">{ev.title}</p>
                              <p className="text-[10px] text-slate-400 mt-1 select-none flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-[#0066FF] rounded-full animate-pulse"></span>
                                <span>{lang === "he" ? "Google Calendar" : "Google Calendar"} • {sTime} – {eTime}</span>
                              </p>
                            </div>
                          </motion.div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-2">
                        {lang === "he" ? "אין אירועים קרובים להיום." : "No upcoming events scheduled on calendar today."}
                      </p>
                    )}
                  </div>
                </motion.div>
              );

            case "small_insight":
              return insights.length > 0 ? (
                <motion.div 
                  key={block.id} 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -4, scale: 1.01, boxShadow: "0 15px 35px -12px rgba(0,102,255,0.12)", borderColor: "rgba(0,102,255,0.25)" }}
                  whileTap={{ scale: 0.992 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="bg-gradient-to-br from-white/95 via-indigo-50/40 to-blue-50/60 backdrop-blur-xl p-6 rounded-3xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden space-y-3.5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] cursor-pointer transition-colors"
                >
                  <div className="flex gap-2 items-center text-[#0066FF]">
                    <Sparkles className="w-4 h-4 text-[#0066FF] shrink-0" />
                    <p className="text-[10px] font-extrabold tracking-wider uppercase">{t("insightQuickCard")}</p>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-dark-navy mb-1.5 leading-snug">{insights[0].title}</h4>
                    <p className="text-sm text-slate-600 leading-relaxed font-sans">{insights[0].body}</p>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => onNavigate("recap")}
                      className="text-[10px] font-bold bg-blue-50 text-[#0066FF] hover:bg-blue-100 px-3.5 py-1.5 rounded-full transition-all cursor-pointer active:scale-95"
                    >
                      {lang === "he" ? "עוד תובנות" : "More insights"}
                    </button>
                    <button
                      onClick={() => onNavigate("chat")}
                      className="text-[10px] font-bold bg-white text-gray-400 hover:text-slate-600 px-3.5 py-1.5 rounded-full border border-gray-100 transition-all cursor-pointer active:scale-95"
                    >
                      {lang === "he" ? "שאל את Layer" : "Ask Layer"}
                    </button>
                  </div>
                </motion.div>
              ) : null;

            case "quick_check_in":
              return (
                <motion.div 
                  key={block.id} 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4, scale: 1.01, boxShadow: "0 25px 45px -15px rgba(10,17,40,0.45)" }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className="bg-gradient-to-br from-[#0A1128] via-[#111A3A] to-[#0A1128] text-white rounded-3xl p-6 shadow-xl flex items-center justify-between gap-4 relative overflow-hidden cursor-pointer"
                >
                  <div className="space-y-1 relative z-10 font-sans">
                    <h4 className="text-base font-bold leading-tight flex items-center gap-1.5 font-display">
                      <span>💬</span>
                      <span>{t("quickCheckInTitle")}</span>
                    </h4>
                    <p className="text-xs text-blue-200/60">{lang === "he" ? "ביצעת משהו מחוץ לספרייה?" : "Logged an off-library achievement?"}</p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveCheckInAction({
                        id: "custom",
                        title: lang === "he" ? "פעולה כללית" : "Custom Action",
                        icon: "Sparkles",
                        duration_minutes: 30,
                        energy_level: "medium",
                        category: "other",
                        smart_suggestion_enabled: false,
                        is_active: true
                      } as any);
                    }}
                    className="h-10 px-4 bg-white text-[#0A1128] hover:bg-white/95 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-md relative z-10"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>{lang === "he" ? "סמן בוצע" : "Check In"}</span>
                  </button>
                </motion.div>
              );

            case "ai_messages_box":
              return (
                <motion.div 
                  key={block.id} 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4, scale: 1.01, boxShadow: "0 15px 35px -12px rgba(124,58,237,0.08)", borderColor: "rgba(124,58,237,0.3)" }}
                  whileTap={{ scale: 0.992 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className="bg-gradient-to-br from-white/95 via-indigo-50/40 to-violet-50/50 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] space-y-3.5 flex items-center justify-between gap-4 cursor-pointer transition-colors"
                >
                  <div className="space-y-1 font-sans">
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">{t("chat")}</h4>
                    <p className="text-sm text-slate-600 font-medium leading-tight">
                      {lang === "he" ? "התייעץ עם ה-AI לגבי הדפוסים שלך" : "Sync directly with your AI personal patterns"}
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate("chat")}
                    className="h-10 px-4 bg-[#F4F5F7] hover:bg-[#E5E7EB] text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-95"
                  >
                    {lang === "he" ? "שאל את Layer" : "Open Assistant"}
                  </button>
                </motion.div>
              );

            default:
              return null;
          }
        })}

      {/* Outcome Assessment Modal (Overlay) */}
      <AnimatePresence>
      {activeCheckInAction && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-4 z-50"
          onClick={() => setActiveCheckInAction(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl space-y-6 relative border border-slate-100">
            <button 
              onClick={() => setActiveCheckInAction(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <form onSubmit={handleSubmitCheckIn} className="space-y-5">
              <div className="text-center">
                <span className="text-xxs text-blue-600 font-bold uppercase tracking-wider">{t("checkInPrompt")}</span>
                <h3 className="text-base font-bold text-slate-900 mt-1 leading-tight">
                  {activeCheckInAction.title}
                </h3>
              </div>

              {/* Status selectors from metadata Section 12 */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCheckInStatus("done")}
                  className={`py-3.5 px-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                    checkInStatus === "done" 
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-bold" 
                      : "border-slate-150 text-slate-600 hover:bg-slate-50 text-xs"
                  }`}
                >
                  <span className="text-lg">✔️</span>
                  <span className="text-xxs font-bold leading-none">{t("completeStatus")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCheckInStatus("partial")}
                  className={`py-3.5 px-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                    checkInStatus === "partial" 
                      ? "border-amber-500 bg-amber-50 text-amber-700 font-bold" 
                      : "border-slate-150 text-slate-600 hover:bg-slate-50 text-xs"
                  }`}
                >
                  <span className="text-lg">🔘</span>
                  <span className="text-xxs font-bold leading-none">{t("partialStatus")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCheckInStatus("not_today")}
                  className={`py-3.5 px-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                    checkInStatus === "not_today" 
                      ? "border-rose-400 bg-rose-50 text-rose-600 font-bold" 
                      : "border-slate-150 text-slate-600 hover:bg-slate-50 text-xs"
                  }`}
                >
                  <span className="text-lg">❌</span>
                  <span className="text-xxs font-bold leading-none">{t("skipStatus")}</span>
                </button>
              </div>

              {/* Slider for partial activity */}
              {checkInStatus === "partial" && (
                <div className="space-y-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl animate-fade-in">
                  <label className="block text-xxs font-semibold text-slate-600">
                    {t("minutesCompletedLabel")}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={activeCheckInAction.duration_minutes || 60}
                      value={completedMinutes}
                      onChange={(e) => setCompletedMinutes(Number(e.target.value))}
                      className="flex-1 accent-blue-600 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800 shrink-0 select-none tabular-nums">
                      {completedMinutes}דק׳
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <input
                  type="text"
                  value={checkInNote}
                  onChange={(e) => setCheckInNote(e.target.value)}
                  placeholder={t("notePlaceholder")}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-600 transition-all font-sans"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveCheckInAction(null)}
                  className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-all cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="flex-2 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/10 active:scale-95 transition-all cursor-pointer"
                >
                  {t("submitCheckIn")}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Calendar Confirmation Overlay Dialog (Section 6) */}
      <AnimatePresence>
      {pendingCalendarAction && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-4 z-50"
          onClick={() => setPendingCalendarAction(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-xl space-y-4 relative border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {lang === "he" 
                  ? `להוסיף את "${pendingCalendarAction.title}" ליומן ב-${freeWindow?.start}?`
                  : `Insert "${pendingCalendarAction.title}" into Google Calendar at ${freeWindow?.start}?`
                }
              </h3>
              <p className="text-xxs text-slate-400 leading-normal px-4">
                {t("calendarExplanation")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingCalendarAction(null)}
                className="h-10 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold transition-all cursor-pointer"
              >
                {t("doNotAdd")}
              </button>
              <button
                type="button"
                onClick={handleCalendarCommit}
                className="h-10 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer shadow-md shadow-blue-600/10"
              >
                {t("confirm")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

    </div>
  );
}
