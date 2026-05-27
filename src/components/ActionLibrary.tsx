import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Trash2,
  Edit,
  Plus,
  Search,
  Clock,
  Flame,
  Compass,
  TrendingUp,
  X,
  Check,
  Filter,
  Heart,
  BookOpen,
  Dumbbell,
  Folder,
  Wind,
  Coffee,
  ChevronLeft
} from "lucide-react";
import { translate, Language } from "../i18n";
import { apiFetch } from "../api";
import { ActionItem, CheckIn } from "../types";
import { renderLucideIcon } from "./TodayScreen";
import { motion, AnimatePresence } from "motion/react";
import ConfirmDialog from "./ConfirmDialog";

interface ActionLibraryProps {
  lang: Language;
}

const CATEGORIES = ["health", "development", "organization", "mindfulness", "leisure", "other"] as const;
const ICONS = ["Heart", "BookOpen", "Dumbbell", "Folder", "Wind", "Coffee", "Sparkles"];

export default function ActionLibrary({ lang }: ActionLibraryProps) {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Edit/Create Modal Controls
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionItem | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("Heart");
  const [duration, setDuration] = useState(30);
  const [energy, setEnergy] = useState<"high" | "medium" | "low">("medium");
  const [category, setCategory] = useState<typeof CATEGORIES[number]>("other");
  const [smartSuggestion, setSmartSuggestion] = useState(true);
  const [preferredTime, setPreferredTime] = useState<string>("morning");

  const t = (key: Parameters<typeof translate>[1], params?: any) => translate(lang, key, params);

  const loadActionsData = async () => {
    try {
      setLoading(true);
      const actsRes = await apiFetch("/api/actions");
      const actsData = await actsRes.json();
      setActions(actsData);

      const chRes = await apiFetch("/api/check-ins");
      const chData = await chRes.json();
      setCheckins(chData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActionsData();
  }, []);

  const openCreateModal = () => {
    setEditingAction(null);
    setTitle("");
    setIcon("Heart");
    setDuration(30);
    setEnergy("medium");
    setCategory("other");
    setSmartSuggestion(true);
    setPreferredTime("morning");
    setIsModalOpen(true);
  };

  const openEditModal = (action: ActionItem) => {
    setEditingAction(action);
    setTitle(action.title);
    setIcon(action.icon);
    setDuration(action.duration_minutes);
    setEnergy(action.energy_level);
    setCategory(action.category as any);
    setSmartSuggestion(action.smart_suggestion_enabled);
    setPreferredTime(action.preferred_time_window || "morning");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || submitting) return;
    setSubmitting(true);

    try {
      const payload = {
        title,
        icon,
        duration_minutes: duration,
        energy_level: energy,
        category,
        smart_suggestion_enabled: smartSuggestion,
        preferred_time_window: preferredTime
      };

      const endpoint = editingAction ? `/api/actions/${editingAction.id}` : "/api/actions";
      const method = editingAction ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setIsModalOpen(false);
        loadActionsData();
      }
    } catch (err) {
      console.error("Failed submitting action detail:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/actions/${id}`, { method: "DELETE" });
      if (response.ok) {
        setConfirmDeleteId(null);
        setIsModalOpen(false);
        loadActionsData();
      }
    } catch (err) {
      console.error("Error deleting item:", err);
    }
  };

  const getActionSuccessRate = (actionId: string): number => {
    const actionHistory = checkins.filter((c) => c.action_id === actionId);
    if (actionHistory.length === 0) return 100; // Fresh actions display 100% ideal target

    const successes = actionHistory.filter((c) => c.status === "done").length;
    const partials = actionHistory.filter((c) => c.status === "partial").length;
    
    return Math.round(((successes + partials * 0.5) / actionHistory.length) * 100);
  };

  const getCategoryTranslation = (cat: string) => {
    switch (cat) {
      case "health": return t("categoryHealth");
      case "development": return t("categoryDevelopment");
      case "organization": return t("categoryOrganization");
      case "mindfulness": return t("categoryMindfulness");
      case "leisure": return t("categoryLeisure");
      default: return t("categoryOther");
    }
  };

  const filteredActions = actions.filter((act) => {
    const matchesSearch = act.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || act.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="space-y-5 pb-24 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 bg-slate-200 rounded-lg w-36" />
            <div className="h-3 bg-slate-100 rounded-lg w-24" />
          </div>
          <div className="h-10 w-24 bg-slate-200 rounded-xl" />
        </div>
        <div className="h-11 bg-slate-100 rounded-xl" />
        <div className="flex gap-2">
          {[1,2,3,4].map(i => <div key={i} className="h-8 w-16 bg-slate-100 rounded-full" />)}
        </div>
        {[1,2,3].map(i => (
          <div key={i} className="h-20 bg-white border border-slate-100 rounded-2xl" />
        ))}
      </div>
    );
  }

  const isRtl = lang === "he";

  return (
    <div className="space-y-6 pb-24 font-sans animate-fade-in text-dark-navy">
      
      {/* Title block */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold font-display leading-tight tracking-tight">
            {t("actionLibraryTitle")}
          </h1>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#0066FF]" />
            <span>{actions.length} {t("actionsCount")}</span>
          </p>
        </div>
        
        <button
          onClick={openCreateModal}
          className="h-10 px-4 bg-[#0066FF] hover:bg-[#0052cc] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10 active:scale-95 flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t("newAction")}</span>
        </button>
      </div>

      {/* Search Input and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRtl ? "חיפוש פעולה..." : "Search actions..."}
            className={`w-full h-11 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:border-[#0066FF] transition-all font-sans ${isRtl ? "pr-10 pl-4" : "pl-10 pr-4"}`}
            style={{ direction: isRtl ? "rtl" : "ltr" }}
          />
          <Search className={`absolute top-3.5 w-4 h-4 text-slate-400 ${isRtl ? "right-3.5" : "left-3.5"}`} />
        </div>

        {/* Category Filters Carousel */}
        <div className="flex gap-2 pb-1 max-w-full overflow-x-auto cursor-grab">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-tight shrink-0 transition-all select-none cursor-pointer ${
              selectedCategory === "all" ? "bg-[#0066FF] text-white shadow-md shadow-blue-500/15" : "bg-white text-slate-500 border border-slate-150 hover:bg-slate-50"
            }`}
          >
            {isRtl ? "הכל" : "All"}
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-tight shrink-0 transition-all select-none cursor-pointer ${
                selectedCategory === cat ? "bg-[#0066FF] text-white shadow-md shadow-blue-500/15" : "bg-white text-slate-500 border border-slate-150 hover:bg-slate-50"
              }`}
            >
              {getCategoryTranslation(cat)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 gap-3">
        <AnimatePresence>
          {filteredActions.length > 0 ? (
            filteredActions.map((action, index) => {
              const successRate = getActionSuccessRate(action.id);
              return (
                <motion.div
                  key={action.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.04, duration: 0.35, ease: "easeOut" }}
                  whileHover={{ y: -2, scale: 1.005, boxShadow: "0 12px 30px -10px rgba(0,0,0,0.06)", borderColor: "rgba(0,102,255,0.15)" }}
                  whileTap={{ scale: 0.995 }}
                  onClick={() => openEditModal(action)}
                  className="bg-gradient-to-br from-white to-[#F8F9FC] border border-gray-100 rounded-2xl p-4.5 shadow-sm flex items-center justify-between gap-4 cursor-pointer hover:shadow-md transition-all group text-right"
                  style={{ direction: isRtl ? "rtl" : "ltr" }}
                >
                  <div className="flex items-center gap-4 animate-parent-hover">
                    <div className="w-12 h-12 rounded-xl bg-[#F4F5F7] text-slate-800 flex items-center justify-center border border-slate-100/50 text-xl group-hover:scale-105 transition-transform">
                      {renderLucideIcon(action.icon, "w-6 h-6")}
                    </div>
                  <div>
                    <h3 className="text-base font-bold text-dark-navy group-hover:text-[#0066FF] transition-colors leading-tight">
                      {action.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs font-bold text-slate-400">
                        {getCategoryTranslation(action.category)}
                      </span>
                      <span className="w-1 h-1 bg-slate-350 rounded-full"></span>
                      <span className="text-xs font-medium text-slate-400 flex items-center gap-0.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{action.duration_minutes} {lang === "he" ? "דק׳" : "mins"}</span>
                      </span>
                      {action.preferred_time_window && (
                        <>
                          <span className="w-1 h-1 bg-slate-350 rounded-full"></span>
                          <span className="text-[10px] font-extrabold text-[#0066FF] bg-blue-50 px-2 py-0.5 rounded-md uppercase font-display select-none">
                            ☀️ {action.preferred_time_window === "morning" ? (isRtl ? "בוקר" : "Morning") : (isRtl ? "ערב" : "Evening")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-center font-display">
                    <span className="text-[10px] text-slate-400 block pb-0.5 font-bold">{t("successRate")}</span>
                    <span className={`text-sm font-black ${
                      successRate >= 80 ? "text-emerald-500" : successRate >= 50 ? "text-amber-500" : "text-rose-500"
                    }`}>
                      {successRate}%
                    </span>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-slate-300 shrink-0 select-none group-hover:-translate-x-1 transition-transform" />
                </div>
              </motion.div>
            );
          })
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-12 bg-white border border-dashed border-slate-200 rounded-3xl text-center shadow-xs"
          >
            <Compass className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">{lang === "he" ? "לא נמצאו פעולות תואמות" : "No matching actions found in list."}</p>
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title={lang === "he" ? "מחק פעולה" : "Delete Action"}
        message={lang === "he" ? "פעולה זו תימחק לצמיתות ולא ניתן לשחזרה." : "This action will be permanently deleted and cannot be recovered."}
        confirmLabel={t("deleteAction")}
        cancelLabel={t("cancel")}
        destructive
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {/* Editor & Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl relative border border-slate-100 animate-fade-in space-y-5">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                {editingAction ? t("editAction") : t("newAction")}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xxs font-bold text-slate-500 uppercase">{lang === "he" ? "שם הפעולה" : "Action Title"}</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("actionTitlePlaceholder")}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-600 transition-all font-sans"
                  required
                />
              </div>

              {/* Dynamic Icon Library pick list */}
              <div className="space-y-1">
                <label className="block text-xxs font-bold text-slate-500 uppercase">{lang === "he" ? "אייקון" : "Visual Icon"}</label>
                <div className="flex gap-2 overflow-x-auto py-1">
                  {ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      className={`w-9 h-9 border rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                        icon === ic ? "border-blue-600 bg-blue-50 text-blue-600" : "border-slate-150 text-slate-400 hover:bg-slate-50"
                      }`}
                    >
                      {renderLucideIcon(ic, "w-4.5 h-4.5")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xxs font-bold text-slate-500 uppercase">{t("durationInMinutes")}</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    min={5}
                    max={120}
                    step={5}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-blue-600 transition-all"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xxs font-bold text-slate-500 uppercase">{t("preferredTimeWindow")}</label>
                  <select
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:border-blue-600 transition-all cursor-pointer"
                  >
                    <option value="morning">{isRtl ? "בוקר" : "Morning"}</option>
                    <option value="afternoon">{isRtl ? "צהריים" : "Afternoon"}</option>
                    <option value="evening">{isRtl ? "ערב" : "Evening"}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xxs font-bold text-slate-500 uppercase">{t("energyLevelLabel")}</label>
                  <select
                    value={energy}
                    onChange={(e) => setEnergy(e.target.value as any)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:border-blue-600 transition-all cursor-pointer"
                  >
                    <option value="high">{t("energyHigh")}</option>
                    <option value="medium">{t("energyMedium")}</option>
                    <option value="low">{t("energyLow")}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xxs font-bold text-slate-500 uppercase">{t("categoryLabel")}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:border-blue-600 transition-all cursor-pointer"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {getCategoryTranslation(cat)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100/80 rounded-2xl">
                <label className="text-xxs font-black text-slate-600 uppercase cursor-pointer select-none" htmlFor="smart-sug">
                  {t("smartSuggestionToggle")}
                </label>
                <input
                  id="smart-sug"
                  type="checkbox"
                  checked={smartSuggestion}
                  onChange={(e) => setSmartSuggestion(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                {editingAction && (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(editingAction.id)}
                    className="h-11 px-3.5 bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 transition-all rounded-xl cursor-pointer"
                    title={t("deleteAction")}
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-2 h-11 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/10 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : t("saveAction")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
