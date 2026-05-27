import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Award, 
  Flame, 
  ThumbsUp, 
  Sliders, 
  Activity, 
  ArrowLeft,
  Bot,
  Zap,
  RotateCcw
} from "lucide-react";
import { translate, Language } from "../i18n";
import { apiFetch } from "../api";
import { CheckIn, ActionItem, AiInsightItem } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { useToast } from "./Toast";

interface RecapScreenProps {
  lang: Language;
}

export default function RecapScreen({ lang }: RecapScreenProps) {
  const [activeTab, setActiveTab] = useState<"daily" | "weekly">("daily");
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [insights, setInsights] = useState<AiInsightItem[]>([]);
  const [loading, setLoading] = useState(true);

  const { toast } = useToast();

  const t = (key: Parameters<typeof translate>[1], params?: any) => translate(lang, key, params);

  const loadRecapData = async () => {
    try {
      setLoading(true);
      const chRes = await apiFetch("/api/check-ins");
      const chData = await chRes.json();
      setCheckins(chData);

      const actRes = await apiFetch("/api/actions");
      const actData = await actRes.json();
      setActions(actData);

      const insRes = await apiFetch("/api/ai/insights");
      const insData = await insRes.json();
      setInsights(insData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecapData();
  }, []);

  // Handle smart suggestion CTA adjustment action (shorten hours etc)
  const handleApplyAdjustment = async (actionId: string) => {
    try {
      const response = await apiFetch("/api/ai/propose-action-adjustment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action_id: actionId, adjustment_type: "shorten_duration" })
      });
      if (response.ok) {
        toast(lang === "he" ? "הפעולה עודכנה בהצלחה ✨" : "Action updated successfully ✨");
        loadRecapData();
      }
    } catch (e) {
      toast(lang === "he" ? "שגיאה בעדכון הפעולה" : "Failed to update action", "error");
    }
  };

  // Compile calculations for Today's elements
  const getTodayMetrics = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayCheckins = checkins.filter((c) => c.date === todayStr);

    const doneCount = todayCheckins.filter((c) => c.status === "done").length;
    const partialCount = todayCheckins.filter((c) => c.status === "partial").length;
    const skippedCount = todayCheckins.filter((c) => c.status === "not_today").length;

    const totalMinutes = todayCheckins.reduce((acc, current) => {
      return acc + (current.minutes_completed || 0);
    }, 0);

    return { doneCount, partialCount, skippedCount, totalMinutes, todayCheckins };
  };

  const getWeeklyMetrics = () => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    const cutoff = sevenDaysAgo.toISOString().split("T")[0];

    const weekCheckins = checkins.filter((c) => c.date >= cutoff);
    const doneCount = weekCheckins.filter((c) => c.status === "done").length;
    const partialCount = weekCheckins.filter((c) => c.status === "partial").length;
    const skippedCount = weekCheckins.filter((c) => c.status === "not_today").length;
    const totalMinutes = weekCheckins.reduce((acc, curr) => acc + (curr.minutes_completed || 0), 0);
    const successRate = weekCheckins.length > 0
      ? Math.round(((doneCount + partialCount * 0.5) / weekCheckins.length) * 100)
      : 0;

    // Compute best day of week
    const dayTotals: Record<string, { done: number; total: number }> = {};
    weekCheckins.forEach((c) => {
      const day = new Date(c.date).toLocaleDateString(lang === "he" ? "he-IL" : "en-US", { weekday: "long" });
      if (!dayTotals[day]) dayTotals[day] = { done: 0, total: 0 };
      dayTotals[day].total++;
      if (c.status === "done" || c.status === "partial") dayTotals[day].done++;
    });
    const bestDay = Object.entries(dayTotals).sort((a, b) => (b[1].done / b[1].total) - (a[1].done / a[1].total))[0]?.[0] || null;

    // Compute worst-performing action
    const actionFailCounts: Record<string, number> = {};
    weekCheckins.filter((c) => c.status === "not_today" && c.action_id).forEach((c) => {
      actionFailCounts[c.action_id!] = (actionFailCounts[c.action_id!] || 0) + 1;
    });
    const worstActionId = Object.entries(actionFailCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const worstAction = worstActionId ? actions.find((a) => a.id === worstActionId) : null;

    return { doneCount, partialCount, skippedCount, totalMinutes, successRate, bestDay, worstAction, weekCheckins };
  };

  if (loading) {
    return (
      <div className="space-y-5 pb-24 animate-pulse">
        <div className="space-y-2">
          <div className="h-5 bg-slate-200 rounded-lg w-28" />
          <div className="h-3 bg-slate-100 rounded-lg w-48" />
        </div>
        <div className="h-9 bg-slate-100 rounded-full w-[280px]" />
        <div className="grid grid-cols-2 gap-3.5">
          <div className="h-28 bg-white border border-slate-100 rounded-3xl" />
          <div className="h-28 bg-white border border-slate-100 rounded-3xl" />
        </div>
        <div className="h-40 bg-white border border-slate-100 rounded-3xl" />
        <div className="h-32 bg-slate-200/60 rounded-[30px]" />
      </div>
    );
  }

  const today = getTodayMetrics();
  const weekly = getWeeklyMetrics();
  const weeklyInsight = insights.find((i) => i.type === "weekly") || insights[0] || null;
  const isRtl = lang === "he";

  return (
    <div className="space-y-6 pb-24 font-sans animate-fade-in text-dark-navy">
      
      {/* Title block */}
      <div>
        <h1 className="text-xl font-extrabold font-display leading-tight tracking-tight">
          {t("recapTitle")}
        </h1>
        <p className="text-xs text-slate-400 mt-1">{lang === "he" ? "ההתנהגות והשיפור שלך במספרים ותובנות" : "Review stats, patterns, and dynamic optimizations."}</p>
      </div>

      {/* Switch selectors */}
      <div className="bg-[#F4F5F7] p-1 rounded-full flex max-w-[280px] border border-gray-150/50">
        <button
          onClick={() => setActiveTab("daily")}
          className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all select-none cursor-pointer ${
            activeTab === "daily" ? "bg-white text-dark-navy shadow-xs border border-gray-100" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {t("dailyRecapTitle")}
        </button>
        <button
          onClick={() => setActiveTab("weekly")}
          className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all select-none cursor-pointer ${
            activeTab === "weekly" ? "bg-white text-dark-navy shadow-xs border border-gray-100" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {t("weeklyReviewTitle")}
        </button>
      </div>

      {/* Daily Mode Layout */}
      <AnimatePresence mode="wait">
      {activeTab === "daily" && (
        <motion.div
          key="daily"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          className="space-y-6"
        >
          
          {/* Numbers grid */}
          <div className="grid grid-cols-2 gap-3.5">
            <motion.div 
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              whileHover={{ y: -3, scale: 1.01 }}
              className="bg-gradient-to-br from-white/95 via-white/80 to-[#F8F9FC]/60 backdrop-blur-xl border border-white/80 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all cursor-default"
            >
              <span className="text-xs text-slate-400 block font-bold">{t("doneCount")}</span>
              <span className="text-2xl font-black font-display text-emerald-600">{today.doneCount}</span>
              <span className="text-[10px] text-slate-400 block pt-1">✔️ {lang === "he" ? "הושלמו במלואם" : "Full completions"}</span>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              whileHover={{ y: -3, scale: 1.01 }}
              className="bg-gradient-to-br from-white/95 via-white/80 to-[#F8F9FC]/60 backdrop-blur-xl border border-white/80 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all cursor-default"
            >
              <span className="text-xs text-slate-400 block font-bold">{t("activeMinutesSum")}</span>
              <span className="text-2xl font-black font-display text-[#0066FF]">{today.totalMinutes}</span>
              <span className="text-[10px] text-slate-400 block pt-1">⏱️ {lang === "he" ? "דקות פעולה מעשיות" : "Minutes invested"}</span>
            </motion.div>
          </div>

          {/* Today Check-in Outcomes List */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">{lang === "he" ? "היסטוריית בדיקות היום" : "Today's Outcome Logs"}</h3>
            <div className="bg-white/95 backdrop-blur-xl border border-white/80 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
              {today.todayCheckins.length > 0 ? (
                today.todayCheckins.map((item) => {
                  const correlatedAction = actions.find((a) => a.id === item.action_id);
                  return (
                    <div key={item.id} className="flex justify-between items-center gap-4 py-2 border-b border-gray-100/55 last:border-0 text-right">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-dark-navy leading-none">
                          {correlatedAction ? correlatedAction.title : t("quickCheckInTitle")}
                        </h4>
                        {item.note && (
                          <p className="text-[10px] text-slate-500 italic font-sans leading-none mt-1">{item.note}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2_5">
                        {item.minutes_completed !== undefined && item.minutes_completed > 0 && (
                          <span className="text-[10px] bg-slate-100 text-slate-550 px-1.5 py-0.5 rounded-md font-bold font-display">
                            {item.minutes_completed}m
                          </span>
                        )}
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          item.status === "done" ? "bg-emerald-50 text-emerald-600" :
                          item.status === "partial" ? "bg-amber-50 text-amber-600" :
                          "bg-rose-50 text-rose-600"
                        }`}>
                          {item.status === "done" ? t("completeStatus") : item.status === "partial" ? t("partialStatus") : t("skipStatus")}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">
                  {lang === "he" ? "טרם נרשמו בדיקות להיום." : "No action checkpoints registered yet today."}
                </p>
              )}
            </div>
          </motion.div>

          {/* Core Daily Insight Section 11 */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            whileHover={{ y: -3, scale: 1.01 }}
            className="space-y-3 bg-gradient-to-br from-[#F4F5F7] to-[#eef0f4] border border-gray-150/60 rounded-[30px] p-6 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-2 text-[#0066FF] mb-1">
              <Bot className="w-5 h-5" />
              <h3 className="text-xs font-black tracking-wider uppercase">{lang === "he" ? "ניתוח יומי מה-AI" : "Daily AI Perspective"}</h3>
            </div>
            {insights.length > 0 ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-dark-navy leading-tight">{insights[0].title}</h4>
                  <p className="text-xs text-slate-600 leading-normal font-sans">{insights[0].body}</p>
                </div>

                {insights[0].suggested_action?.action_id && (
                  <div className="border-t border-gray-200/50 flex flex-wrap items-center justify-between gap-3 pt-3">
                    <span className="text-[10px] text-[#0066FF] font-bold">
                      {lang === "he" ? "💡 הצעה לשיפור מחר" : "💡 Suggested improvement"}
                    </span>
                    <button
                      onClick={() => handleApplyAdjustment(insights[0].suggested_action!.action_id!)}
                      className="h-8 px-4 bg-[#0066FF] hover:bg-[#0052cc] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                    >
                      {lang === "he" ? "קבל שינוי מוצע" : "Apply suggestion"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                {lang === "he" ? "עוד אין מספיק מידע. בחר פעולה אחת ונתחיל ללמוד." : "Not enough data yet. Log your first action and we'll start learning."}
              </p>
            )}
          </motion.div>

        </motion.div>
      )}

      {/* Weekly Mode Layout */}
      {activeTab === "weekly" && (
        <motion.div
          key="weekly"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="space-y-5"
        >
          
          {/* Numbers overview */}
          <div className="grid grid-cols-2 gap-3.5">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
              whileHover={{ y: -3, scale: 1.01 }}
              className="bg-gradient-to-br from-white/95 via-white/80 to-[#F8F9FC]/60 backdrop-blur-xl border border-white/80 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-1 flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all cursor-default"
            >
              <span className="text-xs text-slate-400 block font-bold">{lang === "he" ? `${t("successRate")} ממוצע` : `Avg. ${t("successRate")}`}</span>
              <span className="text-2xl font-black font-display text-emerald-600">{weekly.successRate}%</span>
              <p className="text-[10px] text-slate-400 leading-relaxed pt-1.5 border-t border-gray-100/50 mt-1.5 select-none">
                {lang === "he" ? "רמת הפרודוקטיביות השבועית שלך פנטסטית." : "Your weekly completion rate remains strong."}
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
              whileHover={{ y: -3, scale: 1.01 }}
              className="bg-gradient-to-br from-white/95 via-white/80 to-[#F8F9FC]/60 backdrop-blur-xl border border-white/80 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-1 flex flex-col justify-between hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all cursor-default"
            >
              <span className="text-xs text-slate-400 block font-bold">{lang === "he" ? `${t("activeMinutesSum")} שבועי` : `Weekly ${t("activeMinutesSum")}`}</span>
              <span className="text-2xl font-black font-display text-[#0066FF]">{weekly.totalMinutes}</span>
              <p className="text-[10px] text-slate-400 leading-relaxed pt-1.5 border-t border-gray-100/50 mt-1.5 select-none">
                {lang === "he" ? "הספק מדהים הממצב אותך במסלול הנכון." : "An amazing investment scale putting you on target."}
              </p>
            </motion.div>
          </div>

          {/* Computed patterns */}
          {(weekly.bestDay || weekly.worstAction) && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-3">
              <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                {lang === "he" ? "דפוסי התנהגות שבועיים" : "Weekly Behavioral Patterns"}
              </h3>
              <div className="bg-white/95 backdrop-blur-xl border border-white/80 rounded-[30px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4 text-xs font-sans leading-relaxed hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                {weekly.bestDay && (
                  <div className="flex justify-between items-center py-1 border-b border-gray-100">
                    <span className="text-slate-500 font-medium">{t("bestDay")}</span>
                    <span className="font-bold text-slate-800">{weekly.bestDay}</span>
                  </div>
                )}
                {weekly.worstAction && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 font-medium">{t("weakActionPattern")}</span>
                    <span className="font-bold text-rose-500 max-w-[160px] text-right">{weekly.worstAction.title}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Weekly AI Insight Panel */}
          {weeklyInsight ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              whileHover={{ y: -3, scale: 1.01 }}
              className="bg-gradient-to-br from-[#0A1128] via-[#111A3A] to-[#0A1128] text-white rounded-[32px] p-6 shadow-lg relative overflow-hidden space-y-4 hover:shadow-xl transition-all"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#0066FF] rounded-full mix-blend-multiply opacity-15 translate-x-12 -translate-y-12"></div>
              <div className="flex items-center gap-2 text-blue-300">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <h3 className="text-xs font-black tracking-wider uppercase">{t("aiWeeklyInsightTitle")}</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-white mb-1 leading-tight">{weeklyInsight.title}</h4>
                  <p className="text-xs text-blue-100/90 leading-relaxed font-sans">{weeklyInsight.body}</p>
                </div>
                {weeklyInsight.suggested_action?.action_id && (
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                    <span className="text-[10px] text-blue-300 font-bold">
                      {lang === "he" ? "📋 הצעה לשיפור" : "📋 Suggested improvement"}
                    </span>
                    <button
                      onClick={() => handleApplyAdjustment(weeklyInsight.suggested_action!.action_id!)}
                      className="h-8 px-4 bg-white text-[#0A1128] hover:bg-slate-100 font-extrabold text-xs rounded-xl transition-all shadow-sm cursor-pointer active:scale-95"
                    >
                      {lang === "he" ? "קבל שינוי מוצע" : "Apply suggestion"}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="bg-[#F4F5F7] border border-gray-150 rounded-[32px] p-6 text-center space-y-2"
            >
              <Bot className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-400">
                {lang === "he" ? "עוד אין מספיק נתונים שבועיים לניתוח AI." : "Not enough weekly data yet for an AI analysis."}
              </p>
            </motion.div>
          )}

        </motion.div>
      )}
      </AnimatePresence>

    </div>
  );
}
