import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Send, Trash2, ArrowLeft, Bot, User, Trash, Settings } from "lucide-react";
import { translate, Language } from "../i18n";
import { apiFetch } from "../api";
import { AiChatMessage } from "../types";
import { motion, AnimatePresence } from "motion/react";
import ConfirmDialog from "./ConfirmDialog";

interface ChatRoomProps {
  lang: Language;
}

export default function ChatRoom({ lang }: ChatRoomProps) {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  const t = (key: Parameters<typeof translate>[1], params?: any) => translate(lang, key, params);

  const loadMessages = async () => {
    try {
      const response = await apiFetch("/api/ai/messages");
      const data = await response.json();
      setMessages(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    // Scroll to bottom smoothly
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const trimmed = textToSend.trim();
    setInputText("");
    setLoading(true);

    // Optimistically log user message
    const tempUserMsg: AiChatMessage = {
      id: "u_temp_" + Date.now(),
      user_id: "usr",
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const { getAccessToken } = await import("../firebase");
      const token = await getAccessToken();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await apiFetch("/api/ai/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ message: trimmed })
      });

      const data = await response.json();
      if (response.ok) {
        setMessages(prev => [...prev.filter(m => m.id !== tempUserMsg.id), tempUserMsg, data]);
      } else {
        throw new Error("Chat api failed");
      }
    } catch (err) {
      // Fail safely logging error
      const errMsg: AiChatMessage = {
        id: "m_err_" + Date.now(),
        user_id: "usr",
        role: "model",
        content: lang === "he" 
          ? "משהו קרה בחיבור לשרת ה-AI של Layer. נסה לסנכרן שוב בעזרת כפתור הרענון בדף היום!" 
          : "Could not sync with Layer server. Please check your network and try again.",
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    setClearing(true);
    try {
      const response = await apiFetch("/api/privacy/reset-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear_ai: true })
      });

      if (response.ok) {
        setMessages([
          { 
            id: "m_seed_" + Date.now(), 
            user_id: "usr",
            role: "model", 
            content: lang === "he" 
              ? "היסטוריית הצ'אט שלך נמחקה לחלוטין. איך אוכל לעזור לך היום?" 
              : "Chat history cleared successfully. How can I guide you today?", 
            created_at: new Date().toISOString() 
          }
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setClearing(false);
    }
  };

  const PROMPT_CHIPS = [
    t("promptSuggestAction"),
    t("promptGymReason"),
    t("promptShortAction"),
    t("promptImproveTomorrow"),
    t("promptWeeklyPatterns")
  ];

  const isRtl = lang === "he";

  return (
    <div className="flex flex-col h-[600px] border border-gray-100 rounded-[32px] bg-white overflow-hidden font-sans relative animate-fade-in shadow-sm">
      
      {/* Top chat status bar */}
      <div className="px-5 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#0066FF]/10 border border-[#0066FF]/10 text-[#0066FF] flex items-center justify-center relative">
            <Bot className="w-5 h-5" />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white"></span>
          </div>
          <div>
            <h2 className="text-sm font-black text-dark-navy leading-none">{t("chat")}</h2>
            <span className="text-[10px] text-slate-400 block pt-1">{lang === "he" ? "עוזר חכם פעיל" : "Smart day companion connected"}</span>
          </div>
        </div>

        <button
          onClick={() => setConfirmClear(true)}
          disabled={clearing}
          className="w-9 h-9 border border-slate-150 bg-[#F4F5F7] hover:bg-slate-100 text-slate-500 hover:text-rose-600 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs"
          title={t("clearChatHistory")}
        >
          <Trash2 className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Message Feed Canvas */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center gap-4 py-8"
          >
            <div className="w-16 h-16 rounded-full bg-[#0066FF]/8 border border-[#0066FF]/15 flex items-center justify-center">
              <Bot className="w-8 h-8 text-[#0066FF]" />
            </div>
            <div>
              <p className="text-sm font-bold text-dark-navy">
                {lang === "he" ? "שלום! אני Layer" : "Hi! I'm Layer"}
              </p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-[220px]">
                {lang === "he"
                  ? "שאל אותי על הדפוסים שלך, על פעולות ספציפיות, או על איך לשפר את היום."
                  : "Ask me about your patterns, specific actions, or how to improve your day."}
              </p>
            </div>
          </motion.div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <motion.div 
                key={msg.id}
                layout
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 450, damping: 25 }}
                className={`flex items-end gap-2 max-w-[85%] ${
                  isUser 
                    ? (isRtl ? "mr-auto flex-row-reverse" : "ml-auto") 
                    : (isRtl ? "ml-auto" : "mr-auto")
                }`}
              >
                {/* Profile indicator */}
                <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] border shadow-xs ${
                  isUser 
                    ? "bg-slate-50 border-slate-200 text-slate-600" 
                    : "bg-blue-50/50 border-[#0066FF]/20 text-[#0066FF]"
                }`}>
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Text Bubble */}
                <div className={`p-4 rounded-2xl text-xs leading-relaxed font-sans shadow-sm ${
                  isUser 
                    ? "bg-gradient-to-br from-[#0A1128] to-[#1a2340] text-white rounded-br-none border border-slate-800" 
                    : "bg-gradient-to-br from-white to-[#F8F9FC] text-dark-navy rounded-bl-none border border-gray-100"
                }`}>
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>
              </motion.div>
            );
          })}

          {loading && (
            <motion.div 
              key="loading-indicator"
              layout
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 450, damping: 25 }}
              className={`flex items-end gap-2 max-w-[80%] ${isRtl ? "ml-auto" : "mr-auto"}`}
            >
              <div className="w-7 h-7 rounded-full bg-blue-50/50 border border-[#0066FF]/20 text-[#0066FF] flex items-center justify-center shrink-0 shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-gradient-to-br from-white to-[#F8F9FC] border border-gray-100 p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-[#0066FF] rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-[#0066FF] rounded-full animate-bounce delay-150"></span>
                <span className="w-1.5 h-1.5 bg-[#0066FF] rounded-full animate-bounce delay-300"></span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Recommended Prompt chips panel */}
      {messages.length < 5 && (
        <div className="px-5 py-2.5 bg-white border-t border-slate-50 flex gap-2 overflow-x-auto max-w-full">
          {PROMPT_CHIPS.map((pText, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(pText)}
              className="px-3.5 py-1.5 bg-[#F4F5F7] hover:bg-blue-50 hover:text-[#0066FF] hover:border-blue-150 border border-transparent text-slate-600 font-bold rounded-xl text-[10px] shrink-0 transition-all select-none cursor-pointer leading-tight shadow-xs"
            >
              {pText}
            </button>
          ))}
        </div>
      )}

      {/* Fixed bottom input tray */}
      <div className="p-4 bg-white border-t border-gray-100">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputText);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t("aiChatPlaceholder")}
            disabled={loading}
            className="flex-1 h-11 px-4 text-xs bg-[#F4F5F7] border border-transparent rounded-xl text-slate-900 focus:outline-none focus:border-[#0066FF] focus:bg-white transition-all font-sans"
            style={{ direction: isRtl ? "rtl" : "ltr" }}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className="w-11 h-11 bg-[#0066FF] disabled:bg-slate-100 disabled:text-slate-300 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-md shadow-blue-500/10 shrink-0"
          >
            <Send className="w-4.5 h-4.5" />
          </button>
        </form>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title={lang === "he" ? "מחק היסטוריית צ'אט" : "Clear Chat History"}
        message={lang === "he" ? "כל השיחה תימחק לצמיתות." : "All messages will be permanently deleted."}
        confirmLabel={lang === "he" ? "מחק הכל" : "Clear All"}
        cancelLabel={t("cancel")}
        destructive
        onConfirm={() => { setConfirmClear(false); handleClearChat(); }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
