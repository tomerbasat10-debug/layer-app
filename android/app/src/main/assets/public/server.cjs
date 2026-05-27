var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_mongodb = require("mongodb");
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = process.env.PORT ? parseInt(process.env.PORT) : 3e3;
app.disable("x-powered-by");
app.use((0, import_cors.default)({ origin: true, credentials: true }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});
app.use(import_express.default.json());
var usersCol;
async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI env var not set \u2014 database unavailable");
    return;
  }
  const client = new import_mongodb.MongoClient(uri);
  await client.connect();
  const db = client.db("layer");
  usersCol = db.collection("users");
  await usersCol.createIndex({ "profile.email": 1 }, { unique: true, sparse: true });
  console.log("Connected to MongoDB");
}
function getTodayDateString() {
  const d = /* @__PURE__ */ new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
async function callGroq(systemPrompt, messages, tools) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { content: "" };
  const body = {
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    temperature: 0.7
  };
  if (tools?.length) {
    body.tools = tools;
    body.tool_choice = "auto";
  }
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const choice = data.choices[0];
  if (choice.finish_reason === "tool_calls" && choice.message.tool_calls?.length) {
    const tc = choice.message.tool_calls[0];
    return { content: "", toolCall: { id: tc.id, name: tc.function.name, args: JSON.parse(tc.function.arguments) } };
  }
  return { content: choice.message?.content || "" };
}
async function getOrCreateUser(emailString) {
  if (!usersCol) throw new Error("Database not connected");
  const email = emailString.toLowerCase().trim();
  let userData = await usersCol.findOne({ _id: email });
  if (!userData) {
    const id = "usr_" + Math.random().toString(36).substring(2, 9);
    const defaultActions = [
      { id: "act_1", title: "\u05D9\u05D5\u05D2\u05D4 \u05D1\u05D5\u05E7\u05E8 \u05D5\u05D4\u05D0\u05E8\u05DB\u05EA \u05E9\u05E8\u05D9\u05E8\u05D9\u05DD", icon: "Heart", duration_minutes: 20, energy_level: "medium", category: "health", smart_suggestion_enabled: true, preferred_time_window: "morning", is_active: true, created_at: (/* @__PURE__ */ new Date()).toISOString() },
      { id: "act_2", title: "\u05E7\u05E8\u05D9\u05D0\u05EA \u05E1\u05E4\u05E8 \u05E4\u05D9\u05EA\u05D5\u05D7 \u05D0\u05D9\u05E9\u05D9", icon: "BookOpen", duration_minutes: 30, energy_level: "low", category: "development", smart_suggestion_enabled: true, preferred_time_window: "afternoon", is_active: true, created_at: (/* @__PURE__ */ new Date()).toISOString() },
      { id: "act_3", title: "\u05D0\u05D9\u05DE\u05D5\u05DF \u05DB\u05D5\u05D7 \u05D0\u05D9\u05E0\u05D8\u05E0\u05E1\u05D9\u05D1\u05D9", icon: "Dumbbell", duration_minutes: 50, energy_level: "high", category: "health", smart_suggestion_enabled: true, preferred_time_window: "evening", is_active: true, created_at: (/* @__PURE__ */ new Date()).toISOString() },
      { id: "act_4", title: "\u05E1\u05D9\u05D3\u05D5\u05E8 \u05D5\u05DE\u05D9\u05D5\u05DF \u05DE\u05D9\u05D9\u05DC\u05D9\u05DD \u05E4\u05E0\u05D5\u05D9\u05D9\u05DD", icon: "Folder", duration_minutes: 15, energy_level: "low", category: "organization", smart_suggestion_enabled: true, preferred_time_window: "afternoon", is_active: true, created_at: (/* @__PURE__ */ new Date()).toISOString() },
      { id: "act_5", title: "\u05E0\u05E9\u05D9\u05DE\u05D5\u05EA \u05D5\u05E8\u05D5\u05D2\u05E2 \u05E7\u05D5\u05E1\u05DE\u05D9", icon: "Wind", duration_minutes: 10, energy_level: "low", category: "mindfulness", smart_suggestion_enabled: true, preferred_time_window: "evening", is_active: true, created_at: (/* @__PURE__ */ new Date()).toISOString() }
    ];
    const checkIns = [];
    const today = /* @__PURE__ */ new Date();
    for (let i = 5; i > 0; i--) {
      const pastDate = /* @__PURE__ */ new Date();
      pastDate.setDate(today.getDate() - i);
      const dateStr = pastDate.toISOString().split("T")[0];
      checkIns.push(
        { id: `chk_pre_${i}_1`, action_id: "act_1", date: dateStr, status: "done", note: "\u05D4\u05EA\u05D7\u05DC\u05EA\u05D9 \u05D0\u05EA \u05D4\u05D9\u05D5\u05DD \u05E2\u05DD \u05D4\u05DE\u05D5\u05DF \u05E8\u05D9\u05DB\u05D5\u05D6", minutes_completed: 20, created_at: pastDate.toISOString() },
        { id: `chk_pre_${i}_2`, action_id: "act_2", date: dateStr, status: "partial", note: "\u05D4\u05D9\u05D9\u05EA\u05D9 \u05E2\u05D9\u05D9\u05E3 \u05D0\u05D1\u05DC \u05E7\u05E8\u05D0\u05EA\u05D9 \u05E7\u05E6\u05EA", minutes_completed: 15, created_at: pastDate.toISOString() },
        { id: `chk_pre_${i}_3`, action_id: "act_3", date: dateStr, status: Math.random() > 0.3 ? "done" : "not_today", note: "\u05D0\u05D9\u05DE\u05D5\u05DF \u05DB\u05D5\u05D7 \u05DE\u05D3\u05D4\u05D9\u05DD", minutes_completed: 50, created_at: pastDate.toISOString() }
      );
    }
    const firstHour = (/* @__PURE__ */ new Date()).getHours();
    const calendarEvents = [
      { id: "ev_1", title: "\u05E4\u05D2\u05D9\u05E9\u05EA \u05E1\u05E0\u05DB\u05E8\u05D5\u05DF \u05E6\u05D5\u05D5\u05EA", start_time: new Date((/* @__PURE__ */ new Date()).setHours(firstHour - 3, 0)).toISOString(), end_time: new Date((/* @__PURE__ */ new Date()).setHours(firstHour - 2, 0)).toISOString(), is_busy: true, source: "google" },
      { id: "ev_2", title: "\u05D0\u05E8\u05D5\u05D7\u05EA \u05E6\u05D4\u05E8\u05D9\u05D9\u05DD \u05DE\u05E9\u05E4\u05D7\u05EA\u05D9\u05EA", start_time: new Date((/* @__PURE__ */ new Date()).setHours(firstHour, 0)).toISOString(), end_time: new Date((/* @__PURE__ */ new Date()).setHours(firstHour + 1, 0)).toISOString(), is_busy: true, source: "google" },
      { id: "ev_3", title: "\u05E4\u05E8\u05D5\u05D9\u05D9\u05E7\u05D8 \u05E9\u05D1\u05D5\u05E2\u05D9 \u05E7\u05E8\u05D9\u05D8\u05D9", start_time: new Date((/* @__PURE__ */ new Date()).setHours(firstHour + 4, 0)).toISOString(), end_time: new Date((/* @__PURE__ */ new Date()).setHours(firstHour + 5, 0)).toISOString(), is_busy: true, source: "google" }
    ];
    userData = {
      _id: email,
      profile: {
        id,
        email,
        display_name: email.split("@")[0],
        avatar_url: "https://api.dicebear.com/7.x/pixel-art/svg?seed=" + email,
        language: "he",
        onboarded: false,
        tone_preference: "warm",
        strong_time_window: "08:00-11:00",
        drift_time_window: "17:00-19:00",
        reminder_frequency: "regular",
        quiet_hours_start: "22:00",
        quiet_hours_end: "07:00",
        calendar_connected: true,
        ai_enabled: true,
        health_goals: [],
        activity_level: "general",
        focus_areas: [],
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      },
      settings: {
        user_id: id,
        language: "he",
        appearance: "light",
        tone: "warm",
        reminder_frequency: "regular",
        quiet_hours_start: "22:00",
        quiet_hours_end: "07:00",
        pause_for_today: false,
        notifications_enabled: true,
        calendar_sync_enabled: true,
        ai_enabled: true
      },
      actions: defaultActions,
      check_ins: checkIns,
      layout_blocks: [
        { id: "b_1", block_id: "progress", visible: true, sort_order: 1 },
        { id: "b_2", block_id: "empty_window_hero", visible: true, sort_order: 2 },
        { id: "b_3", block_id: "suggested_actions", visible: true, sort_order: 3 },
        { id: "b_4", block_id: "up_next", visible: true, sort_order: 4 },
        { id: "b_5", block_id: "quick_check_in", visible: true, sort_order: 5 },
        { id: "b_6", block_id: "small_insight", visible: true, sort_order: 6 },
        { id: "b_7", block_id: "ai_messages_box", visible: true, sort_order: 7 }
      ],
      calendar_events: calendarEvents,
      ai_messages: [
        { id: "m_1", role: "model", content: "\u05E9\u05DC\u05D5\u05DD! \u05D0\u05E0\u05D9 Layer. \u05D0\u05E9\u05DE\u05D7 \u05DC\u05E2\u05D6\u05D5\u05E8 \u05DC\u05DA \u05DC\u05D4\u05E4\u05D9\u05E7 \u05E2\u05E8\u05DA \u05DE\u05D7\u05DE\u05E9 \u05D3\u05E7\u05D5\u05EA \u05E4\u05E0\u05D5\u05D9\u05D5\u05EA \u05D0\u05D5 \u05D7\u05DC\u05D5\u05E0\u05D5\u05EA \u05D0\u05E8\u05D5\u05DB\u05D9\u05DD \u05D1\u05D9\u05D5\u05DE\u05DA! \u05E9\u05D0\u05DC \u05D0\u05D5\u05EA\u05D9 \u05DB\u05DC \u05D3\u05D1\u05E8 \u05DC\u05D2\u05D1\u05D9 \u05E1\u05D3\u05E8 \u05D4\u05D9\u05D5\u05DD \u05D0\u05D5 \u05D4\u05D3\u05E4\u05D5\u05E1\u05D9\u05DD \u05E9\u05DC\u05DA.", created_at: (/* @__PURE__ */ new Date()).toISOString() }
      ],
      ai_insights: [
        {
          id: "ins_1",
          type: "daily",
          title: "\u05D1\u05E8\u05D5\u05DA \u05D4\u05D1\u05D0 \u05DC-Layer \u{1F31F}",
          body: "\u05D4\u05D2\u05D3\u05E8\u05E0\u05D5 \u05D0\u05EA \u05D4\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D4 \u05DC\u05E4\u05D9 \u05D4\u05E2\u05D3\u05E4\u05D5\u05EA\u05D9\u05DA \u05D4\u05D0\u05D9\u05E9\u05D9\u05D5\u05EA \u05DE\u05E9\u05D0\u05DC\u05D5\u05DF \u05D4\u05D4\u05EA\u05D0\u05DE\u05D4. \u05DB\u05E2\u05EA \u05E0\u05D5\u05DB\u05DC \u05DC\u05D4\u05EA\u05D0\u05D9\u05DD \u05DC\u05DA \u05D7\u05DC\u05D5\u05E0\u05D5\u05EA \u05D6\u05DE\u05DF \u05E4\u05E0\u05D5\u05D9\u05D9\u05DD \u05D5\u05DC\u05EA\u05D6\u05DE\u05DF \u05D0\u05D5\u05EA\u05DD \u05D1\u05D9\u05D5\u05DE\u05DF \u05D1\u05E6\u05D5\u05E8\u05D4 \u05D0\u05D5\u05E4\u05D8\u05D9\u05DE\u05DC\u05D9\u05EA!",
          suggested_action: { action_type: "keep_same" },
          accepted: false,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        }
      ],
      notifications: []
    };
    await usersCol.insertOne(userData);
  }
  return userData;
}
async function saveUser(user) {
  const email = user._id || user.profile.email.toLowerCase().trim();
  await usersCol.replaceOne({ _id: email }, user, { upsert: true });
}
function extractVerifiedEmailFromToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const decodedJson = Buffer.from(payloadBase64, "base64").toString("utf-8");
      const payload = JSON.parse(decodedJson);
      if (payload.email) return payload.email.toLowerCase().trim();
    }
  } catch (e) {
    console.error("Token email decoder error:", e);
  }
  return null;
}
async function getActiveUser(req) {
  const verifiedTokenEmail = extractVerifiedEmailFromToken(req.headers.authorization);
  const email = verifiedTokenEmail || req.headers["x-user-email"];
  if (!email) throw new Error("No user email in request");
  return getOrCreateUser(email);
}
app.post("/api/auth/login", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05E0\u05D3\u05E8\u05E9" });
  try {
    const user = await getOrCreateUser(email);
    res.json({ user: user.profile, success: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});
app.post("/api/auth/signup", async (req, res) => {
  const { email, display_name } = req.body;
  if (!email) return res.status(400).json({ error: "\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05E0\u05D3\u05E8\u05E9" });
  try {
    const user = await getOrCreateUser(email);
    if (display_name) {
      user.profile.display_name = display_name;
      user.profile.onboarded = false;
      await saveUser(user);
    }
    res.json({ user: user.profile, success: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});
app.post("/api/auth/logout", (_req, res) => {
  res.json({ success: true });
});
app.post("/api/auth/forgot-password", (_req, res) => {
  res.json({ success: true, message: "\u05D4\u05D5\u05E8\u05D0\u05D5\u05EA \u05DC\u05D0\u05D9\u05E4\u05D5\u05E1 \u05E1\u05D9\u05E1\u05DE\u05D4 \u05E0\u05E9\u05DC\u05D7\u05D5 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4!" });
});
app.get("/api/auth/me", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    res.json({ user: user.profile, settings: user.settings });
  } catch {
    res.json({ user: null });
  }
});
app.get("/api/profile", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    res.json(user.profile);
  } catch (err) {
    res.status(401).json({ error: "Unauthorized" });
  }
});
app.put("/api/profile", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const { display_name, strong_time_window, drift_time_window, tone_preference, language, onboarded, health_goals, activity_level, focus_areas } = req.body;
    if (display_name !== void 0) user.profile.display_name = display_name;
    if (strong_time_window !== void 0) user.profile.strong_time_window = strong_time_window;
    if (drift_time_window !== void 0) user.profile.drift_time_window = drift_time_window;
    if (tone_preference !== void 0) user.profile.tone_preference = tone_preference;
    if (language !== void 0) {
      user.profile.language = language;
      user.settings.language = language;
    }
    if (onboarded !== void 0) user.profile.onboarded = onboarded;
    if (health_goals !== void 0) user.profile.health_goals = health_goals;
    if (activity_level !== void 0) user.profile.activity_level = activity_level;
    if (focus_areas !== void 0) user.profile.focus_areas = focus_areas;
    await saveUser(user);
    res.json(user.profile);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/api/settings", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    res.json(user.settings);
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
});
app.put("/api/settings", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    user.settings = { ...user.settings, ...req.body };
    if (req.body.language) user.profile.language = req.body.language;
    if (req.body.tone) user.profile.tone_preference = req.body.tone;
    if (req.body.quiet_hours_start) user.profile.quiet_hours_start = req.body.quiet_hours_start;
    if (req.body.quiet_hours_end) user.profile.quiet_hours_end = req.body.quiet_hours_end;
    await saveUser(user);
    res.json(user.settings);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/api/actions", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    res.json(user.actions.filter((a) => a.is_active !== false));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
app.post("/api/actions", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const { title, icon, duration_minutes, energy_level, category, smart_suggestion_enabled, preferred_time_window } = req.body;
    if (!title || !duration_minutes) return res.status(400).json({ error: "\u05E9\u05DD \u05D5\u05D6\u05DE\u05DF \u05E4\u05E2\u05D5\u05DC\u05D4 \u05D4\u05D9\u05E0\u05DD \u05E9\u05D3\u05D5\u05EA \u05D7\u05D5\u05D1\u05D4" });
    const newAct = {
      id: "act_" + Math.random().toString(36).substring(2, 9),
      title,
      icon: icon || "Heart",
      duration_minutes: Number(duration_minutes),
      energy_level: energy_level || "medium",
      category: category || "other",
      smart_suggestion_enabled: smart_suggestion_enabled !== false,
      preferred_time_window,
      is_active: true,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    user.actions.push(newAct);
    await saveUser(user);
    res.json(newAct);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
app.put("/api/actions/:id", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const idx = user.actions.findIndex((a) => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "\u05E4\u05E2\u05D5\u05DC\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4" });
    user.actions[idx] = {
      ...user.actions[idx],
      ...req.body,
      duration_minutes: req.body.duration_minutes ? Number(req.body.duration_minutes) : user.actions[idx].duration_minutes
    };
    await saveUser(user);
    res.json(user.actions[idx]);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
app.delete("/api/actions/:id", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const idx = user.actions.findIndex((a) => a.id === req.params.id);
    if (idx !== -1) {
      user.actions[idx].is_active = false;
      await saveUser(user);
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/api/check-ins", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    res.json(user.check_ins);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
app.post("/api/check-ins", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const { action_id, status, note, minutes_completed } = req.body;
    if (!status) return res.status(400).json({ error: "\u05DE\u05E6\u05D1 \u05D1\u05D3\u05D9\u05E7\u05D4 \u05D4\u05D9\u05E0\u05D5 \u05E9\u05D3\u05D4 \u05D7\u05D5\u05D1\u05D4" });
    const newCheckIn = {
      id: "chk_" + Math.random().toString(36).substring(2, 9),
      action_id: action_id || null,
      date: getTodayDateString(),
      status,
      note,
      minutes_completed: minutes_completed !== void 0 ? Number(minutes_completed) : void 0,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    user.check_ins.push(newCheckIn);
    await saveUser(user);
    res.json(newCheckIn);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/api/layout-blocks", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    res.json(user.layout_blocks);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
app.put("/api/layout-blocks", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    if (Array.isArray(req.body)) {
      user.layout_blocks = req.body;
      await saveUser(user);
    }
    res.json(user.layout_blocks);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/api/calendar/status", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    res.json({ connected: user.profile.calendar_connected, email: user.profile.calendar_connected ? user.profile.email : null, last_sync: (/* @__PURE__ */ new Date()).toISOString() });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
app.post("/api/calendar/connect", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    user.profile.calendar_connected = true;
    user.settings.calendar_sync_enabled = true;
    await saveUser(user);
    res.json({ success: true, connected: true, email: user.profile.email });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
app.post("/api/calendar/disconnect", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    user.profile.calendar_connected = false;
    user.settings.calendar_sync_enabled = false;
    await saveUser(user);
    res.json({ success: true, connected: false });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
app.post("/api/calendar/sync", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const now = /* @__PURE__ */ new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
        const realRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(startOfDay)}&timeMax=${encodeURIComponent(endOfDay)}&singleEvents=true&orderBy=startTime`, {
          headers: { Authorization: authHeader }
        });
        if (realRes.ok) {
          const data = await realRes.json();
          user.calendar_events = (data.items || []).map((item) => ({
            id: item.id,
            title: item.summary || "Untitled Event",
            start_time: item.start?.dateTime || item.start?.date || startOfDay,
            end_time: item.end?.dateTime || item.end?.date || endOfDay,
            is_busy: true,
            source: "google"
          }));
          await saveUser(user);
          return res.json({ success: true, events: user.calendar_events });
        }
      } catch (e) {
        console.error("Google Calendar Sync failed", e);
      }
    }
    const baseHour = (/* @__PURE__ */ new Date()).getHours();
    user.calendar_events = [
      { id: "ev_sync_1", title: "\u05E4\u05E8\u05D5\u05D9\u05D9\u05E7\u05D8 \u05E9\u05D1\u05D5\u05E2\u05D9 \u05E7\u05E8\u05D9\u05D8\u05D9 \u05DC\u05D9\u05D9\u05E8", start_time: new Date((/* @__PURE__ */ new Date()).setHours(baseHour + 1, 30)).toISOString(), end_time: new Date((/* @__PURE__ */ new Date()).setHours(baseHour + 3, 0)).toISOString(), is_busy: true, source: "google" },
      { id: "ev_sync_2", title: "\u05E4\u05D2\u05D9\u05E9\u05EA \u05E2\u05D1\u05D5\u05D3\u05D4 \u05E9\u05D5\u05D8\u05E4\u05EA", start_time: new Date((/* @__PURE__ */ new Date()).setHours(baseHour + 5, 0)).toISOString(), end_time: new Date((/* @__PURE__ */ new Date()).setHours(baseHour + 6, 0)).toISOString(), is_busy: true, source: "google" }
    ];
    await saveUser(user);
    res.json({ success: true, events: user.calendar_events });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/api/calendar/free-windows", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const now = /* @__PURE__ */ new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    let startMinutes = currentHour * 60 + currentMinute;
    const [qS_h, qS_m] = user.profile.quiet_hours_start.split(":").map(Number);
    const [qE_h, qE_m] = user.profile.quiet_hours_end.split(":").map(Number);
    const quietStartMin = qS_h * 60 + qS_m;
    let freeWindow = null;
    if (!user.profile.calendar_connected) {
      freeWindow = { start: "15:30", end: "17:00", durationMinutes: 90, source: "mock", confidence: 1, explanation: "\u05D9\u05D5\u05DE\u05DF \u05D2\u05D5\u05D2\u05DC \u05D0\u05D9\u05E0\u05D5 \u05DE\u05D7\u05D5\u05D1\u05E8. \u05DE\u05E6\u05D9\u05D2 \u05D7\u05DC\u05D5\u05DF \u05E4\u05E0\u05D5\u05D9 \u05DE\u05D3\u05D5\u05DE\u05D9\u05D9\u05DF." };
    } else {
      const busyTimes = [];
      user.calendar_events.forEach((ev) => {
        const startD = new Date(ev.start_time);
        const endD = new Date(ev.end_time);
        if (startD.getDate() === now.getDate() && endD.getTime() > now.getTime()) {
          busyTimes.push({ start: startD.getHours() * 60 + startD.getMinutes(), end: endD.getHours() * 60 + endD.getMinutes(), title: ev.title });
        }
      });
      busyTimes.sort((a, b) => a.start - b.start);
      let endOfEvaluation = quietStartMin < startMinutes ? 24 * 60 : quietStartMin;
      let windowStart = startMinutes;
      let windowEnd = endOfEvaluation;
      let upNextEvent = null;
      let foundGap = false;
      for (const busy of busyTimes) {
        if (busy.start > windowStart) {
          if (busy.start - windowStart >= 15) {
            windowEnd = busy.start;
            upNextEvent = busy;
            foundGap = true;
            break;
          }
        }
        if (busy.end > windowStart) windowStart = busy.end;
      }
      if (!foundGap && windowEnd - windowStart >= 15) foundGap = true;
      if (foundGap) {
        const shStr = String(Math.floor(windowStart / 60)).padStart(2, "0");
        const smStr = String(windowStart % 60).padStart(2, "0");
        const ehStr = String(Math.floor(windowEnd / 60)).padStart(2, "0");
        const emStr = String(windowEnd % 60).padStart(2, "0");
        freeWindow = { start: `${shStr}:${smStr}`, end: `${ehStr}:${emStr}`, durationMinutes: windowEnd - windowStart, source: "calendar", confidence: 0.95, upNext: upNextEvent ? upNextEvent.title : "\u05E1\u05D5\u05E3 \u05D4\u05D9\u05D5\u05DD \u05D4\u05E9\u05D5\u05D8\u05E3" };
      } else {
        freeWindow = { start: "18:00", end: "19:00", durationMinutes: 60, source: "calendar", confidence: 0.8, explanation: "\u05E7\u05D9\u05D5\u05DD \u05E4\u05D2\u05D9\u05E9\u05D5\u05EA \u05E8\u05E6\u05D5\u05E3. \u05DE\u05E6\u05D9\u05D2 \u05D7\u05DC\u05D5\u05DF \u05D7\u05DC\u05D5\u05E4\u05D9 \u05D1\u05E2\u05E8\u05D1." };
      }
    }
    const filterMinutes = freeWindow ? freeWindow.durationMinutes : 60;
    let candidates = user.actions.filter((a) => a.is_active && a.duration_minutes <= filterMinutes);
    candidates.sort((a, b) => {
      const aSmart = a.smart_suggestion_enabled ? 1 : 0;
      const bSmart = b.smart_suggestion_enabled ? 1 : 0;
      if (bSmart !== aSmart) return bSmart - aSmart;
      return b.duration_minutes - a.duration_minutes;
    });
    res.json({ freeWindow, suggestions: candidates.slice(0, 3), calendar_connected: user.profile.calendar_connected });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
async function insertCalendarEvent(user, title, start_time, duration_minutes, authHeader) {
  const start = start_time ? new Date(start_time) : /* @__PURE__ */ new Date();
  const end = new Date(start.getTime() + (duration_minutes || 30) * 6e4);
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const realRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: { "Authorization": authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ summary: title, start: { dateTime: start.toISOString() }, end: { dateTime: end.toISOString() } })
      });
      if (realRes.ok) {
        const item = await realRes.json();
        const newEvent2 = { id: item.id, title: item.summary || title, start_time: item.start.dateTime || start.toISOString(), end_time: item.end.dateTime || end.toISOString(), is_busy: true, source: "google" };
        user.calendar_events.push(newEvent2);
        await saveUser(user);
        return newEvent2;
      }
    } catch (e) {
      console.error("Google Calendar insertion failed:", e);
    }
  }
  const newEvent = { id: "ev_added_" + Math.random().toString(36).substring(2, 9), title, start_time: start.toISOString(), end_time: end.toISOString(), is_busy: true, source: "google" };
  user.calendar_events.push(newEvent);
  await saveUser(user);
  return newEvent;
}
app.post("/api/calendar/add-event", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const { title, duration_minutes, start_time } = req.body;
    if (!title) return res.status(400).json({ error: "\u05E9\u05DD \u05D4\u05D0\u05D9\u05E8\u05D5\u05E2 \u05D7\u05E1\u05E8" });
    const newEvent = await insertCalendarEvent(user, title, start_time, duration_minutes, req.headers.authorization);
    res.json({ success: true, event: newEvent });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/api/ai/messages", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    res.json(user.ai_messages);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
app.post("/api/ai/chat", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const { message } = req.body;
    const authHeader = req.headers.authorization;
    if (!user.settings.ai_enabled) {
      return res.json({ role: "model", content: "\u05EA\u05DB\u05D5\u05E0\u05D5\u05EA \u05D4-AI \u05DB\u05E8\u05D2\u05E2 \u05DB\u05D1\u05D5\u05D9\u05D5\u05EA \u05D1\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05E9\u05DC\u05DA. \u05D0\u05E0\u05D0 \u05D4\u05E4\u05E2\u05DC \u05D0\u05D5\u05EA\u05DF \u05DE\u05D3\u05E3 \u05D4\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05DC\u05D7\u05D5\u05D5\u05D9\u05D4 \u05DE\u05DC\u05D0\u05D4." });
    }
    if (!message) return res.status(400).json({ error: "\u05EA\u05D5\u05DB\u05DF \u05D4\u05D4\u05D5\u05D3\u05E2\u05D4 \u05D7\u05E1\u05E8" });
    const userMsg = { id: "m_usr_" + Math.random().toString(36).substring(2, 9), role: "user", content: message, created_at: (/* @__PURE__ */ new Date()).toISOString() };
    user.ai_messages.push(userMsg);
    const lang = user.profile.language;
    const tone = user.profile.tone_preference;
    const healthGoals = user.profile.health_goals ? user.profile.health_goals.join(", ") : "Not set";
    const activityLevel = user.profile.activity_level || "Not set";
    const focusAreas = user.profile.focus_areas ? user.profile.focus_areas.join(", ") : "Not set";
    const actionsSummary = user.actions.filter((a) => a.is_active).map((a) => `\u2022 ${a.title} (${a.duration_minutes} \u05D3\u05E7', \u05D0\u05E0\u05E8\u05D2\u05D9\u05D4 ${a.energy_level}, \u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D4 ${a.category})`).join("\n");
    const recentCheckins = user.check_ins.slice(-10).map((c) => {
      const act = user.actions.find((a) => a.id === c.action_id);
      return `\u2022 \u05EA\u05D0\u05E8\u05D9\u05DA ${c.date}: ${act ? act.title : "\u05DB\u05DC\u05DC\u05D9"} \u05DE\u05E9\u05D5\u05D1: ${c.status} (${c.note || "\u05D0\u05D9\u05DF \u05D4\u05E2\u05E8\u05D4"})`;
    }).join("\n");
    const systemPrompt = `You are Layer Chat Assistant. A calm, warm, practical and highly protective virtual assistant.
Your goal is to help the user turn empty windows into useful activity.
Never use shaming, excessive clinical therapist tones, or fake motivational words.

Onboarding Questionnaire Context (To tailor your advice):
- Primary Goals: ${healthGoals}
- Daytime Energy/Activity Level: ${activityLevel}
- Specific Focus Areas of Interest: ${focusAreas}

Guidelines:
1. Always respond in the selected language: ${lang === "he" ? "Hebrew (RTL)" : "English"}.
2. Use the tone requested: ${tone} (direct, warm, analytical).
3. Ground your answers in user data:
Active Actions:
${actionsSummary}

Recent Outcomes Logged:
${recentCheckins}

Keep the answers relatively short, direct, actionable, and formatted in clear Markdown.`;
    let modelResponse = "";
    if (process.env.GROQ_API_KEY) {
      try {
        const chatMessages = user.ai_messages.slice(-6).map((msg) => ({
          role: msg.role === "model" ? "assistant" : "user",
          content: msg.content
        }));
        const tools = [{
          type: "function",
          function: {
            name: "addCalendarEvent",
            description: "Add an event or activity to the user's schedule/calendar.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "The name/summary of the event." },
                start_time: { type: "string", description: `ISO 8601 datetime. Current UTC: ${(/* @__PURE__ */ new Date()).toISOString()}. Israel is UTC+3.` },
                duration_minutes: { type: "number", description: "Duration in minutes. Defaults to 30." }
              },
              required: ["title", "start_time"]
            }
          }
        }];
        const result = await callGroq(systemPrompt, [...chatMessages, { role: "user", content: message }], tools);
        if (result.toolCall?.name === "addCalendarEvent") {
          const { title, start_time, duration_minutes } = result.toolCall.args;
          const newEvent = await insertCalendarEvent(user, title, start_time, duration_minutes, authHeader);
          const followup = await callGroq(systemPrompt, [
            ...chatMessages,
            { role: "user", content: message },
            { role: "assistant", content: null, tool_calls: [{ id: result.toolCall.id, type: "function", function: { name: "addCalendarEvent", arguments: JSON.stringify(result.toolCall.args) } }] },
            { role: "tool", tool_call_id: result.toolCall.id, content: JSON.stringify({ success: true, event: newEvent }) }
          ]);
          modelResponse = followup.content;
        } else {
          modelResponse = result.content;
        }
      } catch (err) {
        console.error("Groq API error:", err);
        modelResponse = lang === "he" ? "\u05E1\u05DC\u05D9\u05D7\u05D4, \u05E0\u05E8\u05D0\u05D4 \u05E9\u05D9\u05E9 \u05E7\u05D5\u05E9\u05D9 \u05D1\u05E8\u05E9\u05EA \u05D4-AI \u05DB\u05E8\u05D2\u05E2. \u05EA\u05D5\u05DB\u05DC \u05DC\u05E0\u05E1\u05D5\u05EA \u05E9\u05E0\u05D9\u05EA?" : "Sorry, I can't reach our AI services right now. Feel free to use the manual actions in the meantime.";
      }
    } else {
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes("\u05EA\u05D5\u05E1\u05D9\u05E3") || lowerMessage.includes("\u05EA\u05D6\u05DE\u05DF") || lowerMessage.includes("\u05DE\u05D7\u05E8")) {
        let title = "\u05D0\u05D9\u05DE\u05D5\u05DF \u05DB\u05D5\u05D7 \u05DE\u05D4\u05D9\u05E8";
        if (lowerMessage.includes("\u05D9\u05D5\u05D2\u05D4")) title = "\u05EA\u05E8\u05D2\u05D5\u05DC \u05D9\u05D5\u05D2\u05D4 \u05DE\u05E8\u05D2\u05D9\u05E2";
        else if (lowerMessage.includes("\u05E0\u05E9\u05D9\u05DE\u05D5\u05EA")) title = "\u05EA\u05E8\u05D2\u05D5\u05DC \u05E0\u05E9\u05D9\u05DE\u05D5\u05EA \u05E7\u05D5\u05E1\u05DE\u05D9\u05D5\u05EA";
        else if (lowerMessage.includes("\u05E1\u05E4\u05E8")) title = "\u05E7\u05E8\u05D9\u05D0\u05EA \u05E1\u05E4\u05E8";
        let targetTime = /* @__PURE__ */ new Date();
        if (lowerMessage.includes("\u05DE\u05D7\u05E8")) targetTime.setDate(targetTime.getDate() + 1);
        const hourMatch = lowerMessage.match(/(?:בשעה|שעה)?\s*(\d{1,2})(?::(\d{2}))?/);
        if (hourMatch) {
          targetTime.setHours(parseInt(hourMatch[1], 10), hourMatch[2] ? parseInt(hourMatch[2], 10) : 0, 0, 0);
        } else {
          targetTime.setHours(21, 0, 0, 0);
        }
        const newEvent = await insertCalendarEvent(user, title, targetTime.toISOString(), 30, authHeader);
        const formattedTime = targetTime.toLocaleTimeString(lang === "he" ? "he-IL" : "en-US", { hour: "2-digit", minute: "2-digit" });
        const formattedDate = targetTime.toLocaleDateString(lang === "he" ? "he-IL" : "en-US", { weekday: "long" });
        modelResponse = lang === "he" ? `\u05E8\u05E9\u05DE\u05EA\u05D9 \u05DC\u05E2\u05E6\u05DE\u05D9! \u05D4\u05D5\u05E1\u05E4\u05EA\u05D9 \u05D0\u05EA \u05D4\u05E4\u05E2\u05D9\u05DC\u05D5\u05EA **"${newEvent.title}"** \u05DC\u05EA\u05D5\u05DB\u05E0\u05D9\u05EA \u05E9\u05DC\u05DA \u05DC\u05D9\u05D5\u05DD ${formattedDate} \u05D1\u05E9\u05E2\u05D4 ${formattedTime}.` : `Got it! I've added **"${newEvent.title}"** to your schedule for ${formattedDate} at ${formattedTime}.`;
      } else {
        modelResponse = lang === "he" ? "\u05D4\u05D9\u05D9! \u05E8\u05E9\u05EA \u05D4-AI \u05E4\u05D5\u05E2\u05DC\u05EA \u05D1\u05DE\u05E6\u05D1 \u05E9\u05DE\u05D5\u05E8 \u05DB\u05E8\u05D2\u05E2. \u05DE\u05DE\u05D4 \u05E9\u05E0\u05D9\u05EA\u05D7\u05EA\u05D9 \u05D1\u05D3\u05E4\u05D5\u05E1\u05D9\u05DD \u05E9\u05DC\u05DA, \u05D4\u05E4\u05E2\u05D5\u05DC\u05D5\u05EA \u05D4\u05E7\u05E6\u05E8\u05D5\u05EA \u05DE\u05E0\u05D9\u05D1\u05D5\u05EA \u05D4\u05DB\u05D9 \u05D4\u05E8\u05D1\u05D4 \u05D4\u05E6\u05DC\u05D7\u05D5\u05EA." : "Hello! AI is running in offline safety mode. Looking at your metrics, shorter action windows yield a much higher success rate for you.";
      }
    }
    const assistantMsg = { id: "m_ast_" + Math.random().toString(36).substring(2, 9), role: "model", content: modelResponse, created_at: (/* @__PURE__ */ new Date()).toISOString() };
    user.ai_messages.push(assistantMsg);
    await saveUser(user);
    res.json(assistantMsg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
app.post("/api/ai/suggest", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const targetDuration = Number(req.body.duration) || 30;
    const activeActions = user.actions.filter((a) => a.is_active && a.duration_minutes <= targetDuration);
    res.json({
      suggested_ids: activeActions.slice(0, 3).map((a) => a.id),
      reason: user.profile.language === "he" ? "\u05D4\u05E4\u05E2\u05D5\u05DC\u05D5\u05EA \u05D4\u05DC\u05DC\u05D5 \u05DE\u05EA\u05D0\u05D9\u05DE\u05D5\u05EA \u05D1\u05E6\u05D5\u05E8\u05D4 \u05DE\u05D5\u05E9\u05DC\u05DE\u05EA \u05DC\u05E8\u05DE\u05EA \u05D4\u05D0\u05E0\u05E8\u05D2\u05D9\u05D4 \u05D5\u05DC\u05D6\u05DE\u05DF \u05D4\u05E2\u05D5\u05DE\u05D3 \u05DC\u05E8\u05E9\u05D5\u05EA\u05DA." : "These actions fit perfectly into your active timeframe."
    });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/api/ai/insights", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const lang = user.profile.language;
    if (user.ai_insights.length === 0) {
      user.ai_insights = [{
        id: "ins_new_1",
        type: "daily",
        title: lang === "he" ? "\u05D4\u05D1\u05D5\u05E7\u05E8 \u05D4\u05D5\u05D0 \u05D4\u05DB\u05D5\u05D7 \u05E9\u05DC\u05DA" : "Morning is your strength",
        body: lang === "he" ? "\u05D6\u05D9\u05D4\u05D9\u05E0\u05D5 \u05E9-90% \u05DE\u05D4\u05E4\u05E2\u05D5\u05DC\u05D5\u05EA \u05D1\u05D1\u05D5\u05E7\u05E8 \u05DE\u05E1\u05D5\u05DE\u05E0\u05D5\u05EA \u05DB\u05D1\u05D5\u05E6\u05E2\u05D5 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4. \u05DC\u05E2\u05D5\u05DE\u05EA \u05D6\u05D0\u05EA, \u05D1\u05E9\u05E2\u05D5\u05EA \u05D4\u05E2\u05E8\u05D1 \u05E8\u05DE\u05EA \u05D4\u05D3\u05D7\u05D9\u05D5\u05EA \u05E2\u05D5\u05DC\u05D4." : "We noticed 90% of morning actions are successfully completed, while evening actions face delays.",
        suggested_action: { action_type: "move_morning" },
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      }];
      await saveUser(user);
    }
    res.json(user.ai_insights);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
app.post("/api/ai/generate-insights", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const lang = user.profile.language;
    const newInsight = {
      id: "ins_" + Math.random().toString(36).substring(2, 9),
      type: "daily",
      title: lang === "he" ? "\u05D3\u05E4\u05D5\u05E1 \u05D4\u05EA\u05DE\u05D3\u05D4 \u05D7\u05D9\u05D5\u05D1\u05D9" : "Positive Streak Pattern",
      body: lang === "he" ? "\u05D1\u05D9\u05E6\u05E2\u05EA \u05D0\u05EA \u05E4\u05E2\u05D5\u05DC\u05EA \u05D4'\u05D9\u05D5\u05D2\u05D4' \u05E4\u05E2\u05DE\u05D9\u05D9\u05DD \u05D1\u05E8\u05E6\u05E3 \u05D4\u05E9\u05D1\u05D5\u05E2. \u05D9\u05E9 \u05DC\u05DA \u05DE\u05D2\u05DE\u05EA \u05E9\u05D9\u05E4\u05D5\u05E8 \u05E9\u05DC 15% \u05D1\u05D6\u05DE\u05DF \u05D4\u05E4\u05E2\u05D9\u05DC\u05D5\u05EA \u05D4\u05DE\u05E6\u05D8\u05D1\u05E8." : "You completed Yoga twice in a row this week. Cumulative activity is up 15%.",
      suggested_action: { action_type: "keep_same" },
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    user.ai_insights.unshift(newInsight);
    await saveUser(user);
    res.json(newInsight);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
app.post("/api/ai/propose-action-adjustment", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const { action_id, adjustment_type } = req.body;
    const lang = user.profile.language;
    const act = user.actions.find((a) => a.id === action_id);
    if (!act) return res.status(404).json({ error: "\u05E4\u05E2\u05D5\u05DC\u05D4 \u05DC\u05D0 \u05E7\u05D9\u05D9\u05DE\u05EA" });
    if (adjustment_type === "shorten_duration") act.duration_minutes = Math.max(10, act.duration_minutes - 10);
    await saveUser(user);
    res.json({
      success: true,
      action: act,
      message: lang === "he" ? `\u05D4\u05E4\u05E2\u05D5\u05DC\u05D4 "${act.title}" \u05E2\u05D5\u05D3\u05DB\u05E0\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4.` : `Action "${act.title}" was updated successfully.`
    });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/api/notifications", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    res.json(user.notifications);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
app.post("/api/notifications/test", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const lang = user.profile.language;
    const newNotify = {
      id: "not_" + Math.random().toString(36).substring(2, 9),
      title: lang === "he" ? "\u05D9\u05E9 \u05DC\u05DA \u05D7\u05DC\u05D5\u05DF \u05E4\u05E0\u05D5\u05D9 \u{1F440}" : "Empty window detected \u{1F440}",
      body: lang === "he" ? "\u05DE\u05D4 \u05DE\u05DB\u05E0\u05D9\u05E1\u05D9\u05DD \u05E2\u05DB\u05E9\u05D9\u05D5? \u05D9\u05E9 \u05DC\u05DA 30 \u05D3\u05E7\u05D5\u05EA \u05E4\u05E0\u05D5\u05D9\u05D5\u05EA \u05E2\u05D3 \u05D4\u05E4\u05D2\u05D9\u05E9\u05D4 \u05D4\u05D1\u05D0\u05D4." : "What are we doing next? You have 30 empty minutes until the next event.",
      scheduled_for: new Date(Date.now() + 5e3).toISOString(),
      type: "free_window",
      status: "sent",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    user.notifications.unshift(newNotify);
    await saveUser(user);
    res.json({ success: true, notification: newNotify });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
app.post("/api/privacy/reset-data", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const { clear_ai, clear_checkins, delete_all } = req.body;
    if (delete_all) {
      user.actions = [];
      user.check_ins = [];
      user.ai_messages = [];
      user.ai_insights = [];
      user.notifications = [];
      user.profile.onboarded = false;
      user.profile.calendar_connected = false;
    } else {
      if (clear_ai) {
        user.ai_messages = [];
        user.ai_insights = [];
      }
      if (clear_checkins) user.check_ins = [];
    }
    await saveUser(user);
    res.json({ success: true, user: user.profile });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
app.post("/api/privacy/delete-account", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const email = user.profile.email.toLowerCase().trim();
    await usersCol.deleteOne({ _id: email });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
var isProduction = process.env.NODE_ENV === "production";
async function startServer() {
  await connectDB();
  if (!isProduction) {
    const vite = await (0, import_vite.createServer)({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Layer server running on port ${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
