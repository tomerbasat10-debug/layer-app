import React, { useState, useEffect } from "react";
import { ArrowUp, ArrowDown, Eye, EyeOff, RotateCcw, Save, Sparkles, LayoutGrid } from "lucide-react";
import { translate, Language } from "../i18n";
import { apiFetch } from "../api";
import { LayoutBlockItem } from "../types";
import { motion, AnimatePresence } from "motion/react";
import ConfirmDialog from "./ConfirmDialog";

interface EditTodayProps {
  lang: Language;
  onClose: () => void;
}

export default function EditToday({ lang, onClose }: EditTodayProps) {
  const [blocks, setBlocks] = useState<LayoutBlockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const t = (key: Parameters<typeof translate>[1], params?: any) => translate(lang, key, params);

  const loadBlocks = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/layout-blocks");
      const data = await res.json();
      setBlocks(data.sort((a: any, b: any) => a.sort_order - b.sort_order));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlocks();
  }, [lang]);

  const handleToggleVisible = (id: string) => {
    setBlocks(prev => 
      prev.map(b => (b.id === id ? { ...b, visible: !b.visible } : b))
    );
  };

  const shiftOrder = (index: number, direction: "up" | "down") => {
    const newBlocks = [...blocks];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    
    if (targetIdx < 0 || targetIdx >= newBlocks.length) return;

    // Swap items
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIdx];
    newBlocks[targetIdx] = temp;

    // Re-index sort order
    const updated = newBlocks.map((b, idx) => ({ ...b, sort_order: idx + 1 }));
    setBlocks(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback("");
    try {
      const response = await apiFetch("/api/layout-blocks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blocks)
      });
      if (response.ok) {
        setFeedback(lang === "he" ? "הפריסה נשמרה בהצלחה! ✨" : "Layout saved successfully! ✨");
        setTimeout(() => setFeedback(""), 3500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const defaults: LayoutBlockItem[] = [
      { id: "b_1", user_id: "usr", block_id: "progress", visible: true, sort_order: 1 },
      { id: "b_2", user_id: "usr", block_id: "empty_window_hero", visible: true, sort_order: 2 },
      { id: "b_3", user_id: "usr", block_id: "suggested_actions", visible: true, sort_order: 3 },
      { id: "b_4", user_id: "usr", block_id: "up_next", visible: true, sort_order: 4 },
      { id: "b_5", user_id: "usr", block_id: "quick_check_in", visible: true, sort_order: 5 },
      { id: "b_6", user_id: "usr", block_id: "small_insight", visible: true, sort_order: 6 },
      { id: "b_7", user_id: "usr", block_id: "ai_messages_box", visible: true, sort_order: 7 },
    ];
    setBlocks(defaults);
  };

  const getBlockReadableTitle = (blockId: string) => {
    switch (blockId) {
      case "progress": return t("dailyProgressTitle");
      case "empty_window_hero": return t("todayHeroTitle");
      case "suggested_actions": return t("suggestedActionsTitle");
      case "up_next": return t("upNextTitle");
      case "small_insight": return t("insightQuickCard");
      case "quick_check_in": return t("quickCheckInTitle");
      default: return t("chat");
    }
  };

  if (loading) {
    return (
      <div className="text-center p-8">
        <span className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent inline-block"></span>
      </div>
    );
  }

  const isRtl = lang === "he";

  return (
    <div className="space-y-6 font-sans animate-fade-in text-slate-900">
      
      {/* Header element */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onClose}
            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer font-bold mb-1"
          >
            {isRtl ? "→ חזור להגדרות" : "← Back to settings"}
          </button>
          <h2 className="text-lg font-extrabold font-display leading-tight">{t("editTodayLayoutTitle")}</h2>
          <p className="text-xxs text-slate-400 mt-0.5">{t("editTodayLayoutSubtitle")}</p>
        </div>

        <button
          onClick={() => setConfirmReset(true)}
          className="w-9 h-9 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl flex items-center justify-center transition-all cursor-pointer"
          title={t("resetLayout")}
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold text-center rounded-2xl">
          {feedback}
        </div>
      )}

      {/* Blocks reordering list */}
      <div className="space-y-2.5">
        <AnimatePresence>
          {blocks.map((block, index) => {
            const isFirst = index === 0;
            const isLast = index === blocks.length - 1;

            return (
              <motion.div
                key={block.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                whileHover={{ scale: 1.01 }}
                className={`border p-4 rounded-2xl shadow-sm flex items-center justify-between gap-4 transition-all ${
                  block.visible ? "bg-white border-slate-100" : "bg-slate-50/50 border-slate-200 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xxs font-bold text-slate-300 font-display tabular-nums select-none">
                    #{index + 1}
                  </span>
                  <span className="text-xs font-bold font-sans text-slate-900">
                    {getBlockReadableTitle(block.block_id)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Visibility Toggle */}
                  <button
                    onClick={() => handleToggleVisible(block.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    {block.visible ? <Eye className="w-4 h-4 text-slate-600" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  {/* Move Up */}
                  <button
                    onClick={() => shiftOrder(index, "up")}
                    disabled={isFirst}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-slate-400 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>

                  {/* Move Down */}
                  <button
                    onClick={() => shiftOrder(index, "down")}
                    disabled={isLast}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-slate-400 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title={lang === "he" ? "איפוס פריסת היום" : "Reset Layout"}
        message={lang === "he" ? "הפריסה תחזור לברירת המחדל." : "The layout will be restored to its default order."}
        confirmLabel={lang === "he" ? "אפס" : "Reset"}
        cancelLabel={lang === "he" ? "ביטול" : "Cancel"}
        onConfirm={() => { setConfirmReset(false); handleReset(); }}
        onCancel={() => setConfirmReset(false)}
      />

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/10 transition-all cursor-pointer flex items-center justify-center gap-2"
      >
        {saving ? (
          <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
        ) : (
          <>
            <Save className="w-4 h-4" />
            <span>{t("save")}</span>
          </>
        )}
      </button>

    </div>
  );
}
