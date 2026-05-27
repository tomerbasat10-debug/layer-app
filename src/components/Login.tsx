import React, { useState } from "react";
import { Chrome, HelpCircle, LogIn, ShieldAlert, UserPlus } from "lucide-react";
import { translate, Language } from "../i18n";
import { apiFetch } from "../api";
import logoUrl from "../assets/images/layer_logo_v3_1779839083605.png";

interface LoginProps {
  onLoginSuccess: (email: string) => void;
  lang: Language;
}

export default function Login({ onLoginSuccess, lang }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const isHebrew = lang === "he";
  const text = {
    title: isHebrew
      ? isSignUp ? "הרשמה" : "ברוכים הבאים ל-Layer"
      : isSignUp ? "Sign up" : "Welcome to Layer",
    subtitle: isHebrew
      ? "התחברו כדי לשמור את היום, הפעולות והתובנות שלכם."
      : "Sign in to save your day, actions, and insights.",
    google: isHebrew ? "כניסה עם Google" : "Sign in with Google",
    or: isHebrew ? "או" : "or",
    displayName: isHebrew ? "שם תצוגה" : "Display name",
    displayNamePlaceholder: isHebrew ? "לדוגמה: שם פרטי" : "Example: first name",
    email: isHebrew ? "אימייל" : "Email",
    password: isHebrew ? "סיסמה" : "Password",
    login: isHebrew ? "כניסה" : "Sign in",
    signUp: isHebrew ? "הרשמה" : "Sign up",
    forgotPassword: isHebrew ? "שכחת סיסמה?" : "Forgot password?",
    switchToSignUp: isHebrew ? "אין לך חשבון? הרשמה" : "Don't have an account? Sign up",
    switchToLogin: isHebrew ? "יש לך כבר חשבון? כניסה" : "Already have an account? Sign in",
    badLogin: isHebrew ? "פרטי ההתחברות שגויים או שיש שגיאת שרת" : "Authentication failed",
    googleFailed: isHebrew ? "התחברות עם Google נכשלה. נסה שוב." : "Google login failed. Please try again.",
    enterEmailFirst: isHebrew ? "נא להזין כתובת אימייל קודם" : "Please enter email first",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setResetMessage("");
    setLoading(true);

    try {
      const endpoint = isSignUp ? "/api/auth/signup" : "/api/auth/login";
      const payload = isSignUp
        ? { email, password, display_name: displayName }
        : { email, password };

      const response = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || text.badLogin);
      }

      onLoginSuccess(email);
    } catch (err: any) {
      setErrorMsg(isHebrew ? text.badLogin : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg("");
    setResetMessage("");
    try {
      const { googleSignIn } = await import("../firebase");
      const result = await googleSignIn();
      if (result) {
        onLoginSuccess(result.user.email || result.user.uid);
      }
    } catch {
      setErrorMsg(text.googleFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setErrorMsg("");
    if (!email) {
      setErrorMsg(text.enterEmailFirst);
      return;
    }
    setResetMessage(translate(lang, "passwordResetSent"));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-x-1/2 translate-y-1/2" />

      <div className="w-full max-w-sm bg-white border border-slate-100 rounded-3xl p-8 shadow-sm transition-all duration-300 animate-fade-in z-10">
        <div className="text-center mb-6">
          <div className="inline-block mb-4">
            <img
              src={logoUrl}
              alt="Layer Logo"
              referrerPolicy="no-referrer"
              className="w-16 h-16 mx-auto rounded-2xl shadow-md border border-slate-100 object-cover"
            />
          </div>
          <h2 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
            {text.title}
          </h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed px-4">
            {text.subtitle}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-2 text-rose-600 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {resetMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 text-xs text-center">
            {resetMessage}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full h-12 px-4 bg-white border-2 border-blue-600 hover:bg-blue-50 text-slate-900 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm disabled:opacity-70"
        >
          {loading ? (
            <span className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
          ) : (
            <>
              <Chrome className="w-5 h-5 text-red-500" />
              <span>{text.google}</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="h-px bg-slate-100 flex-1" />
          <span className="text-[10px] font-bold text-slate-400 uppercase">{text.or}</span>
          <div className="h-px bg-slate-100 flex-1" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {text.displayName}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={text.displayNamePlaceholder}
                autoComplete="name"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {text.email}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              autoComplete="email"
              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {text.password}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
              required
            />
          </div>

          {!isSignUp && (
            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3 h-3" />
                {text.forgotPassword}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-600/15 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {loading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" />
                {text.signUp}
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                {text.login}
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg("");
              setResetMessage("");
            }}
            className="text-xs text-slate-600 hover:text-blue-600 transition-colors inline-block cursor-pointer font-medium"
          >
            {isSignUp ? text.switchToLogin : text.switchToSignUp}
          </button>
        </div>
      </div>
    </div>
  );
}
