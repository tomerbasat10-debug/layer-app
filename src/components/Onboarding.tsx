import React, { useState } from "react";
import { Sparkles, ArrowRight, ArrowLeft, Trophy, Calendar, Compass } from "lucide-react";
import { translate, Language } from "../i18n";
import { apiFetch } from "../api";
import { UserProfile } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface OnboardingProps {
  profile: UserProfile;
  lang: Language;
  onOnboardingComplete: () => void;
}

export default function Onboarding({ profile, lang, onOnboardingComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [strongTime, setStrongTime] = useState(profile.strong_time_window || "08:00-11:00");
  const [driftTime, setDriftTime] = useState(profile.drift_time_window || "17:00-19:00");
  const [tone, setTone] = useState<"direct" | "warm" | "analytical">(profile.tone_preference || "warm");
  const [quietStart, setQuietStart] = useState(profile.quiet_hours_start || "22:00");
  const [quietEnd, setQuietEnd] = useState(profile.quiet_hours_end || "07:00");

  // Questionnaire States
  const [healthGoals, setHealthGoals] = useState<string[]>(profile.health_goals || []);
  const [activityLevel, setActivityLevel] = useState<string>(profile.activity_level || "general");
  const [focusAreas, setFocusAreas] = useState<string[]>(profile.focus_areas || []);

  const [loading, setLoading] = useState(false);

  const t = (key: Parameters<typeof translate>[1], params?: any) => translate(lang, key, params);

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const toggleGoal = (goal: string) => {
    setHealthGoals(prev => 
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    );
  };

  const toggleFocusArea = (area: string) => {
    setFocusAreas(prev => 
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          strong_time_window: strongTime,
          drift_time_window: driftTime,
          tone_preference: tone,
          health_goals: healthGoals,
          activity_level: activityLevel,
          focus_areas: focusAreas,
          onboarded: true,
        }),
      });

      if (response.ok) {
        // Also update settings to match
        await apiFetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tone: tone,
            quiet_hours_start: quietStart,
            quiet_hours_end: quietEnd,
          }),
        });

        onOnboardingComplete();
      }
    } catch (err) {
      console.error("Onboarding saving error:", err);
    } finally {
      setLoading(false);
    }
  };

  const isRtl = lang === "he";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 min-w-[320px] font-sans">
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm transition-all duration-300 animate-fade-in relative">
        
        {/* Progress Dots */}
        <div className="flex justify-center gap-1.5 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step ? "w-6 bg-blue-600" : "w-1.5 bg-slate-200"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-5"
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mb-3">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-display text-slate-900">{t("onboardingTitle")}</h3>
              <p className="text-xs text-slate-500 mt-1">{t("onboardingSubtitle")}</p>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t("displayName")}</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={lang === "he" ? "השם שלך" : "Your name"}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-600 transition-all font-sans"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t("strongTimeWindow")}</label>
                <select
                  value={strongTime}
                  onChange={(e) => setStrongTime(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:border-blue-600 transition-all cursor-pointer"
                >
                  <option value="08:00-11:00">08:00 - 11:00 ({lang === "he" ? "בוקר" : "Morning"})</option>
                  <option value="11:00-14:00">11:00 - 14:00 ({lang === "he" ? "צהריים" : "Midday"})</option>
                  <option value="14:00-17:00">14:00 - 17:00 ({lang === "he" ? "אחר הצהריים" : "Afternoon"})</option>
                  <option value="19:00-22:00">19:00 - 22:00 ({lang === "he" ? "ערב" : "Evening"})</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t("driftTimeWindow")}</label>
                <select
                  value={driftTime}
                  onChange={(e) => setDriftTime(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:border-blue-600 transition-all cursor-pointer"
                >
                  <option value="13:30-15:00">13:30 - 15:00 ({lang === "he" ? "עייפות צהריים" : "Midday Dip"})</option>
                  <option value="17:00-19:00">17:00 - 19:00 ({lang === "he" ? "חזרה מהעבודה" : "End of Day"})</option>
                  <option value="21:00-23:00">21:00 - 23:00 ({lang === "he" ? "לפני השינה" : "Late Evening"})</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-5 text-slate-800"
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mb-2">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-display text-slate-900">
                {lang === "he" ? "שאלון התאמה אישית" : "Personalization Quiz"}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === "he" ? "כדי להתאים את הפעילויות והמלצות ה-AI בשבילך" : "Help us custom-tailor recommendations to your daily flow"}
              </p>
            </div>

            <div className="space-y-4 pt-1 max-h-[380px] overflow-y-auto pr-1">
              {/* Question A: Health Goals (Multi selection) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  {lang === "he" ? "1. מהן המטרות המרכזיות שלך?" : "1. What are your main goals?"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "reduce_stress", label_he: "הפחתת לחצים", label_en: "Reduce stress" },
                    { id: "improve_focus", label_he: "שיפור פוקוס", label_en: "Improve focus" },
                    { id: "fitness", label_he: "כושר ובריאות", label_en: "Fitness" },
                    { id: "better_sleep", label_he: "שינה איכותית", label_en: "Better sleep" },
                  ].map((g) => {
                    const isSelected = healthGoals.includes(g.id);
                    return (
                      <button
                        type="button"
                        key={g.id}
                        onClick={() => toggleGoal(g.id)}
                        className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all text-center cursor-pointer ${
                          isSelected 
                            ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                        }`}
                      >
                        {lang === "he" ? g.label_he : g.label_en}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question B: General Daytime energy/activity (Single selection) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  {lang === "he" ? "2. מהי רמת האנרגיה בצהריים?" : "2. How is your energy level midday?"}
                </label>
                <div className="space-y-2">
                  {[
                    { id: "low", label_he: "🔋 נמוכה ועייפה - צריך דרבן או רוגע קל", label_en: "Low - need a boost or absolute quiet" },
                    { id: "general", label_he: "⚡ סבירה ומאוזנת - פתוח להכל", label_en: "Balanced - ready to flow" },
                    { id: "high", label_he: "🔥 סופר אקטיבית וחדה - מוכן לאתגרים", label_en: "Highly active & sports-oriented" },
                  ].map((lvl) => {
                    const isSelected = activityLevel === lvl.id;
                    return (
                      <button
                        type="button"
                        key={lvl.id}
                        onClick={() => setActivityLevel(lvl.id)}
                        className={`w-full py-2.5 px-3.5 rounded-xl border text-xs font-medium text-right flex items-center justify-between transition-all cursor-pointer ${
                          isSelected 
                            ? "bg-blue-50 border-blue-600 text-blue-900 font-semibold"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                        }`}
                      >
                        <span>{lang === "he" ? lvl.label_he : lvl.label_en}</span>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question C: Favorite focus topics (Multi selection) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  {lang === "he" ? "3. אילו תחומים מעניינים אותך?" : "3. What activities excite you?"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "mindfulness", label_he: "מדיטציה ונשימות", label_en: "Mindfulness" },
                    { id: "fitness", label_he: "כושר וספורט", label_en: "Active fitness" },
                    { id: "learning", label_he: "קריאה ולמידה", label_en: "Reading & Study" },
                    { id: "organization", label_he: "סידור וארגון משימות", label_en: "Organization" },
                  ].map((area) => {
                    const isSelected = focusAreas.includes(area.id);
                    return (
                      <button
                        type="button"
                        key={area.id}
                        onClick={() => toggleFocusArea(area.id)}
                        className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all text-center cursor-pointer ${
                          isSelected 
                            ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                        }`}
                      >
                        {lang === "he" ? area.label_he : area.label_en}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-display text-slate-900">{t("tonePreference")}</h3>
              <p className="text-xs text-slate-500 mt-1">{lang === "he" ? "איך תרצה שהעוזר החכם שלך ידבר איתך?" : "Choose how should Layer assistant communicate."}</p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => setTone("warm")}
                className={`w-full p-4 rounded-2xl border text-right flex flex-col transition-all cursor-pointer ${
                  tone === "warm" ? "border-blue-600 bg-blue-50/20" : "border-slate-150 hover:bg-slate-50"
                }`}
              >
                <span className="text-sm font-semibold text-slate-900">{t("toneWarm")}</span>
                <span className="text-xs text-slate-400 mt-1">
                  {lang === "he" ? "תמיכה אמפתית, הכלה ורוגע." : "Empathetic, calm, and highly supportive style."}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTone("direct")}
                className={`w-full p-4 rounded-2xl border text-right flex flex-col transition-all cursor-pointer ${
                  tone === "direct" ? "border-blue-600 bg-blue-50/20" : "border-slate-150 hover:bg-slate-50"
                }`}
              >
                <span className="text-sm font-semibold text-slate-900">{t("toneDirect")}</span>
                <span className="text-xs text-slate-400 mt-1">
                  {lang === "he" ? "קצר, החלטי ותכלס. ישר לפעולה." : "Short, focus-driven, quick to the point, actions direct."}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTone("analytical")}
                className={`w-full p-4 rounded-2xl border text-right flex flex-col transition-all cursor-pointer ${
                  tone === "analytical" ? "border-blue-600 bg-blue-50/20" : "border-slate-150 hover:bg-slate-50"
                }`}
              >
                <span className="text-sm font-semibold text-slate-900">{t("toneAnalytical")}</span>
                <span className="text-xs text-slate-400 mt-1">
                  {lang === "he" ? "דגש על דפוסים, גרפים, ואופטימיזציית נתונים." : "Data parameters, structures, percentages and analytic patterns."}
                </span>
              </button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-5"
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mb-3">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-display text-slate-900">
                {lang === "he" ? "שעות מנוחה והתראות" : "Quiet intervals & Notifications"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {lang === "he" ? "הגדר זמנים שבהם Layer שוכב לישון ולא מפריע לך." : "Configure times where Layer stays silent to allow focus."}
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t("quietHoursStart")}</label>
                  <input
                    type="time"
                    value={quietStart}
                    onChange={(e) => setQuietStart(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-600 transition-all text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t("quietHoursEnd")}</label>
                  <input
                    type="time"
                    value={quietEnd}
                    onChange={(e) => setQuietEnd(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-600 transition-all text-center"
                  />
                </div>
              </div>

              <div className="p-4 bg-emerald-50/30 border border-emerald-100 rounded-2xl text-xs text-emerald-800 leading-relaxed flex gap-2">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  {lang === "he" 
                    ? "אנחנו מייצרים סביבה בטוחה. המידע שלך שמור מקומית ולא ייחשף לעולם." 
                    : "Zero external tracking. Your day metrics remain entirely local, private, and secure."}
                </span>
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* Buttons footer */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              <span>{lang === "he" ? "חזור" : "Back"}</span>
            </button>
          )}

          <button
            onClick={handleNext}
            disabled={loading}
            className="flex-3 h-11 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/10"
          >
            {loading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
            ) : (
              <>
                <span>{step === 4 ? t("completeOnboarding") : (lang === "he" ? "המשך" : "Proceed")}</span>
                {step < 4 ? (isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />) : null}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
