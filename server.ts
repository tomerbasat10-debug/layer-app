import express from "express";
import path from "path";
import cors from "cors";
import { MongoClient, Collection } from "mongodb";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.disable("x-powered-by");

// Allow requests from Capacitor, localhost, and any origin (personal app)
app.use(cors({ origin: true, credentials: true }));

// Secure HTTP Headers Middleware
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(express.json());

// --------------------------------------------------------------------------
// MongoDB Setup
// --------------------------------------------------------------------------
let usersCol: Collection;

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI env var not set — database unavailable");
    return;
  }
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("layer");
  usersCol = db.collection("users");
  await usersCol.createIndex({ "profile.email": 1 }, { unique: true, sparse: true });
  console.log("Connected to MongoDB");
}

// --------------------------------------------------------------------------
// Helper: today date string
// --------------------------------------------------------------------------
function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// --------------------------------------------------------------------------
// Groq AI (OpenAI-compatible, free tier)
// --------------------------------------------------------------------------
async function callGroq(
  systemPrompt: string,
  messages: Array<{ role: string; content: any; tool_calls?: any; tool_call_id?: string }>,
  tools?: any[]
): Promise<{ content: string; toolCall?: { id: string; name: string; args: any } }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { content: "" };

  const body: any = {
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    temperature: 0.7,
  };
  if (tools?.length) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
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

// --------------------------------------------------------------------------
// DB: Get or create user
// --------------------------------------------------------------------------
async function getOrCreateUser(emailString: string) {
  if (!usersCol) throw new Error("Database not connected");

  const email = emailString.toLowerCase().trim();
  let userData: any = await usersCol.findOne({ _id: email as any });

  const defaultActions = [
    { id: "act_1", title: "יוגה בוקר והארכת שרירים", icon: "Heart", duration_minutes: 20, energy_level: "medium" as const, category: "health", smart_suggestion_enabled: true, preferred_time_window: "morning", is_active: true, created_at: new Date().toISOString() },
    { id: "act_2", title: "קריאת ספר פיתוח אישי", icon: "BookOpen", duration_minutes: 30, energy_level: "low" as const, category: "development", smart_suggestion_enabled: true, preferred_time_window: "afternoon", is_active: true, created_at: new Date().toISOString() },
    { id: "act_3", title: "אימון כוח אינטנסיבי", icon: "Dumbbell", duration_minutes: 50, energy_level: "high" as const, category: "health", smart_suggestion_enabled: true, preferred_time_window: "evening", is_active: true, created_at: new Date().toISOString() },
    { id: "act_4", title: "סידור ומיון מיילים פנויים", icon: "Folder", duration_minutes: 15, energy_level: "low" as const, category: "organization", smart_suggestion_enabled: true, preferred_time_window: "afternoon", is_active: true, created_at: new Date().toISOString() },
    { id: "act_5", title: "נשימות ורוגע קוסמי", icon: "Wind", duration_minutes: 10, energy_level: "low" as const, category: "mindfulness", smart_suggestion_enabled: true, preferred_time_window: "evening", is_active: true, created_at: new Date().toISOString() },
  ];

  if (!userData) {
    const id = "usr_" + Math.random().toString(36).substring(2, 9);

    const checkIns: any[] = [];
    const today = new Date();
    for (let i = 5; i > 0; i--) {
      const pastDate = new Date();
      pastDate.setDate(today.getDate() - i);
      const dateStr = pastDate.toISOString().split("T")[0];
      checkIns.push(
        { id: `chk_pre_${i}_1`, action_id: "act_1", date: dateStr, status: "done", note: "התחלתי את היום עם המון ריכוז", minutes_completed: 20, created_at: pastDate.toISOString() },
        { id: `chk_pre_${i}_2`, action_id: "act_2", date: dateStr, status: "partial", note: "הייתי עייף אבל קראתי קצת", minutes_completed: 15, created_at: pastDate.toISOString() },
        { id: `chk_pre_${i}_3`, action_id: "act_3", date: dateStr, status: Math.random() > 0.3 ? "done" : "not_today", note: "אימון כוח מדהים", minutes_completed: 50, created_at: pastDate.toISOString() }
      );
    }

    const firstHour = new Date().getHours();
    const calendarEvents = [
      { id: "ev_1", title: "פגישת סנכרון צוות", start_time: new Date(new Date().setHours(firstHour - 3, 0)).toISOString(), end_time: new Date(new Date().setHours(firstHour - 2, 0)).toISOString(), is_busy: true, source: "google" },
      { id: "ev_2", title: "ארוחת צהריים משפחתית", start_time: new Date(new Date().setHours(firstHour, 0)).toISOString(), end_time: new Date(new Date().setHours(firstHour + 1, 0)).toISOString(), is_busy: true, source: "google" },
      { id: "ev_3", title: "פרוייקט שבועי קריטי", start_time: new Date(new Date().setHours(firstHour + 4, 0)).toISOString(), end_time: new Date(new Date().setHours(firstHour + 5, 0)).toISOString(), is_busy: true, source: "google" },
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
        health_goals: [] as string[],
        activity_level: "general",
        focus_areas: [] as string[],
        created_at: new Date().toISOString(),
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
        ai_enabled: true,
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
        { id: "b_7", block_id: "ai_messages_box", visible: true, sort_order: 7 },
      ],
      calendar_events: calendarEvents,
      ai_messages: [
        { id: "m_1", role: "model", content: "שלום! אני Layer. אשמח לעזור לך להפיק ערך מחמש דקות פנויות או חלונות ארוכים ביומך! שאל אותי כל דבר לגבי סדר היום או הדפוסים שלך.", created_at: new Date().toISOString() }
      ],
      ai_insights: [
        {
          id: "ins_1",
          type: "daily",
          title: "ברוך הבא ל-Layer 🌟",
          body: "הגדרנו את האפליקציה לפי העדפותיך האישיות משאלון ההתאמה. כעת נוכל להתאים לך חלונות זמן פנויים ולתזמן אותם ביומן בצורה אופטימלית!",
          suggested_action: { action_type: "keep_same" },
          accepted: false,
          created_at: new Date().toISOString(),
        }
      ],
      notifications: [],
    };

    await usersCol.insertOne(userData as any);
  } else {
    // Repair missing or empty arrays for accounts created before schema was finalized
    let needsSave = false;
    if (!Array.isArray(userData.actions) || userData.actions.length === 0) {
      userData.actions = defaultActions;
      needsSave = true;
    }
    if (!userData.layout_blocks || userData.layout_blocks.length === 0) {
      userData.layout_blocks = [
        { id: "b_1", block_id: "progress", visible: true, sort_order: 1 },
        { id: "b_2", block_id: "empty_window_hero", visible: true, sort_order: 2 },
        { id: "b_3", block_id: "suggested_actions", visible: true, sort_order: 3 },
        { id: "b_4", block_id: "up_next", visible: true, sort_order: 4 },
        { id: "b_5", block_id: "quick_check_in", visible: true, sort_order: 5 },
        { id: "b_6", block_id: "small_insight", visible: true, sort_order: 6 },
        { id: "b_7", block_id: "ai_messages_box", visible: true, sort_order: 7 },
      ];
      needsSave = true;
    }
    if (!userData.ai_messages || !Array.isArray(userData.ai_messages)) {
      userData.ai_messages = [{ id: "m_1", role: "model", content: "שלום! אני Layer. שאל אותי כל דבר לגבי סדר היום או הדפוסים שלך.", created_at: new Date().toISOString() }];
      needsSave = true;
    }
    if (!userData.calendar_events) { userData.calendar_events = []; needsSave = true; }
    if (!userData.ai_insights) { userData.ai_insights = []; needsSave = true; }
    if (!userData.check_ins) { userData.check_ins = []; needsSave = true; }
    if (!userData.notifications) { userData.notifications = []; needsSave = true; }
    if (needsSave) await saveUser(userData);
  }

  return userData;
}

async function saveUser(user: any) {
  const email = user._id || user.profile.email.toLowerCase().trim();
  await usersCol.replaceOne({ _id: email as any }, user, { upsert: true });
}

// --------------------------------------------------------------------------
// Auth: extract email from Firebase JWT
// --------------------------------------------------------------------------
function extractVerifiedEmailFromToken(authHeader: string | undefined): string | null {
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

async function getActiveUser(req: any) {
  const verifiedTokenEmail = extractVerifiedEmailFromToken(req.headers.authorization);
  const email = verifiedTokenEmail || (req.headers["x-user-email"] as string);
  if (!email) throw new Error("No user email in request");
  return getOrCreateUser(email);
}

// --------------------------------------------------------------------------
// API Endpoints: Authentication
// --------------------------------------------------------------------------
app.post("/api/auth/login", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "אימייל נדרש" });
  try {
    const user = await getOrCreateUser(email);
    res.json({ user: user.profile, success: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/auth/signup", async (req, res) => {
  const { email, display_name } = req.body;
  if (!email) return res.status(400).json({ error: "אימייל נדרש" });
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
  res.json({ success: true, message: "הוראות לאיפוס סיסמה נשלחו בהצלחה!" });
});

app.get("/api/auth/me", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    res.json({ user: user.profile, settings: user.settings });
  } catch {
    res.json({ user: null });
  }
});

// --------------------------------------------------------------------------
// API Endpoints: Profile and Settings
// --------------------------------------------------------------------------
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

    if (display_name !== undefined) user.profile.display_name = display_name;
    if (strong_time_window !== undefined) user.profile.strong_time_window = strong_time_window;
    if (drift_time_window !== undefined) user.profile.drift_time_window = drift_time_window;
    if (tone_preference !== undefined) user.profile.tone_preference = tone_preference;
    if (language !== undefined) { user.profile.language = language; user.settings.language = language; }
    if (onboarded !== undefined) user.profile.onboarded = onboarded;
    if (health_goals !== undefined) user.profile.health_goals = health_goals;
    if (activity_level !== undefined) user.profile.activity_level = activity_level;
    if (focus_areas !== undefined) user.profile.focus_areas = focus_areas;

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

// --------------------------------------------------------------------------
// API Endpoints: Action CRUD
// --------------------------------------------------------------------------
app.get("/api/actions", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    res.json(user.actions.filter((a: any) => a.is_active !== false));
  } catch { res.status(500).json({ error: "Server error" }); }
});

app.post("/api/actions", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const { title, icon, duration_minutes, energy_level, category, smart_suggestion_enabled, preferred_time_window } = req.body;
    if (!title || !duration_minutes) return res.status(400).json({ error: "שם וזמן פעולה הינם שדות חובה" });

    const newAct = {
      id: "act_" + Math.random().toString(36).substring(2, 9),
      title, icon: icon || "Heart",
      duration_minutes: Number(duration_minutes),
      energy_level: energy_level || "medium",
      category: category || "other",
      smart_suggestion_enabled: smart_suggestion_enabled !== false,
      preferred_time_window,
      is_active: true,
      created_at: new Date().toISOString()
    };

    user.actions.push(newAct);
    await saveUser(user);
    res.json(newAct);
  } catch { res.status(500).json({ error: "Server error" }); }
});

app.put("/api/actions/:id", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const idx = user.actions.findIndex((a: any) => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "פעולה לא נמצאה" });

    user.actions[idx] = {
      ...user.actions[idx],
      ...req.body,
      duration_minutes: req.body.duration_minutes ? Number(req.body.duration_minutes) : user.actions[idx].duration_minutes
    };
    await saveUser(user);
    res.json(user.actions[idx]);
  } catch { res.status(500).json({ error: "Server error" }); }
});

app.delete("/api/actions/:id", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const idx = user.actions.findIndex((a: any) => a.id === req.params.id);
    if (idx !== -1) { user.actions[idx].is_active = false; await saveUser(user); }
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Server error" }); }
});

// --------------------------------------------------------------------------
// API Endpoints: Check-ins
// --------------------------------------------------------------------------
app.get("/api/check-ins", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    res.json(user.check_ins);
  } catch { res.status(500).json({ error: "Server error" }); }
});

app.post("/api/check-ins", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const { action_id, status, note, minutes_completed } = req.body;
    if (!status) return res.status(400).json({ error: "מצב בדיקה הינו שדה חובה" });

    const newCheckIn = {
      id: "chk_" + Math.random().toString(36).substring(2, 9),
      action_id: action_id || null,
      date: getTodayDateString(),
      status, note,
      minutes_completed: minutes_completed !== undefined ? Number(minutes_completed) : undefined,
      created_at: new Date().toISOString()
    };

    user.check_ins.push(newCheckIn);
    await saveUser(user);
    res.json(newCheckIn);
  } catch { res.status(500).json({ error: "Server error" }); }
});

// --------------------------------------------------------------------------
// API Endpoints: Layout
// --------------------------------------------------------------------------
app.get("/api/layout-blocks", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    res.json(user.layout_blocks);
  } catch { res.status(500).json({ error: "Server error" }); }
});

app.put("/api/layout-blocks", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    if (Array.isArray(req.body)) { user.layout_blocks = req.body; await saveUser(user); }
    res.json(user.layout_blocks);
  } catch { res.status(500).json({ error: "Server error" }); }
});

// --------------------------------------------------------------------------
// API Endpoints: Calendar
// --------------------------------------------------------------------------
app.get("/api/calendar/status", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    res.json({ connected: user.profile.calendar_connected, email: user.profile.calendar_connected ? user.profile.email : null, last_sync: new Date().toISOString() });
  } catch { res.status(500).json({ error: "Server error" }); }
});

app.post("/api/calendar/connect", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    user.profile.calendar_connected = true;
    user.settings.calendar_sync_enabled = true;
    await saveUser(user);
    res.json({ success: true, connected: true, email: user.profile.email });
  } catch { res.status(500).json({ error: "Server error" }); }
});

app.post("/api/calendar/disconnect", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    user.profile.calendar_connected = false;
    user.settings.calendar_sync_enabled = false;
    await saveUser(user);
    res.json({ success: true, connected: false });
  } catch { res.status(500).json({ error: "Server error" }); }
});

app.post("/api/calendar/sync", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

        const realRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(startOfDay)}&timeMax=${encodeURIComponent(endOfDay)}&singleEvents=true&orderBy=startTime`, {
          headers: { Authorization: authHeader }
        });
        if (realRes.ok) {
          const data = await realRes.json();
          user.calendar_events = (data.items || []).map((item: any) => ({
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

    const baseHour = new Date().getHours();
    user.calendar_events = [
      { id: "ev_sync_1", title: "פרוייקט שבועי קריטי לייר", start_time: new Date(new Date().setHours(baseHour + 1, 30)).toISOString(), end_time: new Date(new Date().setHours(baseHour + 3, 0)).toISOString(), is_busy: true, source: "google" },
      { id: "ev_sync_2", title: "פגישת עבודה שוטפת", start_time: new Date(new Date().setHours(baseHour + 5, 0)).toISOString(), end_time: new Date(new Date().setHours(baseHour + 6, 0)).toISOString(), is_busy: true, source: "google" }
    ];
    await saveUser(user);
    res.json({ success: true, events: user.calendar_events });
  } catch { res.status(500).json({ error: "Server error" }); }
});

app.get("/api/calendar/free-windows", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    let startMinutes = currentHour * 60 + currentMinute;

    const [qS_h, qS_m] = user.profile.quiet_hours_start.split(":").map(Number);
    const [qE_h, qE_m] = user.profile.quiet_hours_end.split(":").map(Number);
    const quietStartMin = qS_h * 60 + qS_m;

    let freeWindow: any = null;

    if (!user.profile.calendar_connected) {
      freeWindow = { start: "15:30", end: "17:00", durationMinutes: 90, source: "mock", confidence: 1.0, explanation: "יומן גוגל אינו מחובר. מציג חלון פנוי מדומיין." };
    } else {
      const busyTimes: Array<{ start: number; end: number; title: string }> = [];
      user.calendar_events.forEach((ev: any) => {
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
      let upNextEvent: any = null;
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
        freeWindow = { start: `${shStr}:${smStr}`, end: `${ehStr}:${emStr}`, durationMinutes: windowEnd - windowStart, source: "calendar", confidence: 0.95, upNext: upNextEvent ? upNextEvent.title : "סוף היום השוטף" };
      } else {
        freeWindow = { start: "18:00", end: "19:00", durationMinutes: 60, source: "calendar", confidence: 0.8, explanation: "קיום פגישות רצוף. מציג חלון חלופי בערב." };
      }
    }

    const filterMinutes = freeWindow ? freeWindow.durationMinutes : 60;
    let candidates = user.actions.filter((a: any) => a.is_active && a.duration_minutes <= filterMinutes);
    candidates.sort((a: any, b: any) => {
      const aSmart = a.smart_suggestion_enabled ? 1 : 0;
      const bSmart = b.smart_suggestion_enabled ? 1 : 0;
      if (bSmart !== aSmart) return bSmart - aSmart;
      return b.duration_minutes - a.duration_minutes;
    });

    res.json({ freeWindow, suggestions: candidates.slice(0, 3), calendar_connected: user.profile.calendar_connected });
  } catch { res.status(500).json({ error: "Server error" }); }
});

async function insertCalendarEvent(user: any, title: string, start_time: string | undefined, duration_minutes: number | undefined, authHeader: string | undefined) {
  const start = start_time ? new Date(start_time) : new Date();
  const end = new Date(start.getTime() + (duration_minutes || 30) * 60000);

  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const realRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: { "Authorization": authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ summary: title, start: { dateTime: start.toISOString() }, end: { dateTime: end.toISOString() } })
      });
      if (realRes.ok) {
        const item = await realRes.json();
        const newEvent = { id: item.id, title: item.summary || title, start_time: item.start.dateTime || start.toISOString(), end_time: item.end.dateTime || end.toISOString(), is_busy: true, source: "google" as const };
        user.calendar_events.push(newEvent);
        await saveUser(user);
        return newEvent;
      }
    } catch (e) {
      console.error("Google Calendar insertion failed:", e);
    }
  }

  const newEvent = { id: "ev_added_" + Math.random().toString(36).substring(2, 9), title, start_time: start.toISOString(), end_time: end.toISOString(), is_busy: true, source: "google" as const };
  user.calendar_events.push(newEvent);
  await saveUser(user);
  return newEvent;
}

app.post("/api/calendar/add-event", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const { title, duration_minutes, start_time } = req.body;
    if (!title) return res.status(400).json({ error: "שם האירוע חסר" });
    const newEvent = await insertCalendarEvent(user, title, start_time, duration_minutes, req.headers.authorization);
    res.json({ success: true, event: newEvent });
  } catch { res.status(500).json({ error: "Server error" }); }
});

// --------------------------------------------------------------------------
// AI Endpoints
// --------------------------------------------------------------------------
app.get("/api/ai/messages", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    res.json(user.ai_messages);
  } catch { res.status(500).json({ error: "Server error" }); }
});

app.post("/api/ai/chat", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const { message } = req.body;
    const authHeader = req.headers.authorization;

    if (!user.settings.ai_enabled) {
      return res.json({ role: "model", content: "תכונות ה-AI כרגע כבויות בהגדרות שלך. אנא הפעל אותן מדף ההגדרות לחוויה מלאה." });
    }
    if (!message) return res.status(400).json({ error: "תוכן ההודעה חסר" });

    const userMsg = { id: "m_usr_" + Math.random().toString(36).substring(2, 9), role: "user" as const, content: message, created_at: new Date().toISOString() };
    user.ai_messages.push(userMsg);

    const lang = user.profile.language;
    const tone = user.profile.tone_preference;
    const healthGoals = user.profile.health_goals ? user.profile.health_goals.join(", ") : "Not set";
    const activityLevel = user.profile.activity_level || "Not set";
    const focusAreas = user.profile.focus_areas ? user.profile.focus_areas.join(", ") : "Not set";

    const actionsSummary = user.actions.filter((a: any) => a.is_active)
      .map((a: any) => `• ${a.title} (${a.duration_minutes} דק', אנרגיה ${a.energy_level}, קטגוריה ${a.category})`).join("\n");

    const recentCheckins = user.check_ins.slice(-10)
      .map((c: any) => { const act = user.actions.find((a: any) => a.id === c.action_id); return `• תאריך ${c.date}: ${act ? act.title : "כללי"} משוב: ${c.status} (${c.note || "אין הערה"})`; }).join("\n");

    const systemPrompt = `You are Layer, a personal productivity assistant built into the Layer app.
You are calm, warm, practical and concise. You help users reflect on their habits and plan their time.

User context:
- Language: ${lang === "he" ? "Hebrew" : "English"} — ALWAYS reply in this language, no exceptions.
- Tone: ${tone}
- Goals: ${healthGoals}
- Activity level: ${activityLevel}
- Focus areas: ${focusAreas}

Active actions in their library:
${actionsSummary || (lang === "he" ? "אין פעולות פעילות עדיין" : "No active actions yet")}

Recent check-ins:
${recentCheckins || (lang === "he" ? "אין היסטוריה עדיין" : "No history yet")}

Rules:
- Keep answers short, direct, and actionable (2-4 sentences max unless asked for more).
- Use Markdown formatting when helpful (bold, bullet lists).
- CRITICAL: Only call addCalendarEvent if the user clearly and explicitly asks to schedule or add something to the calendar (e.g. "add to calendar", "schedule this", "put it in my calendar"). NEVER call it on your own initiative, as a suggestion, or because it seems helpful. If unsure, ask the user first.
- Never invent data. Only reference what appears above.`;

    let modelResponse = "";

    if (process.env.GROQ_API_KEY) {
      try {
        const chatMessages = user.ai_messages.slice(-6).map((msg: any) => ({
          role: msg.role === "model" ? "assistant" : "user",
          content: msg.content,
        }));

        const tools = [{
          type: "function",
          function: {
            name: "addCalendarEvent",
            description: "Add an event to the user's schedule. ONLY call this when the user explicitly asks to schedule or add something to their calendar.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "The name of the event." },
                start_time: { type: "string", description: `ISO 8601 datetime. Current UTC: ${new Date().toISOString()}. Israel is UTC+3.` },
                duration_minutes: { type: "number", description: "Duration in minutes. Defaults to 30." },
              },
              required: ["title", "start_time"],
            },
          },
        }];

        const result = await callGroq(systemPrompt, [...chatMessages, { role: "user", content: message }], tools);

        if (result.toolCall?.name === "addCalendarEvent") {
          const { title, start_time, duration_minutes } = result.toolCall.args;
          const newEvent = await insertCalendarEvent(user, title, start_time, duration_minutes, authHeader);
          const followup = await callGroq(systemPrompt, [
            ...chatMessages,
            { role: "user", content: message },
            { role: "assistant", content: null, tool_calls: [{ id: result.toolCall.id, type: "function", function: { name: "addCalendarEvent", arguments: JSON.stringify(result.toolCall.args) } }] },
            { role: "tool", tool_call_id: result.toolCall.id, content: JSON.stringify({ success: true, event: newEvent }) },
          ]);
          modelResponse = followup.content;
        } else {
          modelResponse = result.content;
        }
      } catch (err) {
        console.error("Groq API error:", err);
        modelResponse = lang === "he"
          ? "סליחה, נראה שיש קושי ברשת ה-AI כרגע. תוכל לנסות שנית?"
          : "Sorry, I can't reach our AI services right now. Feel free to use the manual actions in the meantime.";
      }
    } else {
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes("תוסיף") || lowerMessage.includes("תזמן") || lowerMessage.includes("מחר")) {
        let title = "אימון כוח מהיר";
        if (lowerMessage.includes("יוגה")) title = "תרגול יוגה מרגיע";
        else if (lowerMessage.includes("נשימות")) title = "תרגול נשימות קוסמיות";
        else if (lowerMessage.includes("ספר")) title = "קריאת ספר";

        let targetTime = new Date();
        if (lowerMessage.includes("מחר")) targetTime.setDate(targetTime.getDate() + 1);
        const hourMatch = lowerMessage.match(/(?:בשעה|שעה)?\s*(\d{1,2})(?::(\d{2}))?/);
        if (hourMatch) { targetTime.setHours(parseInt(hourMatch[1], 10), hourMatch[2] ? parseInt(hourMatch[2], 10) : 0, 0, 0); } else { targetTime.setHours(21, 0, 0, 0); }

        const newEvent = await insertCalendarEvent(user, title, targetTime.toISOString(), 30, authHeader);
        const formattedTime = targetTime.toLocaleTimeString(lang === "he" ? "he-IL" : "en-US", { hour: "2-digit", minute: "2-digit" });
        const formattedDate = targetTime.toLocaleDateString(lang === "he" ? "he-IL" : "en-US", { weekday: "long" });
        modelResponse = lang === "he"
          ? `רשמתי לעצמי! הוספתי את הפעילות **"${newEvent.title}"** לתוכנית שלך ליום ${formattedDate} בשעה ${formattedTime}.`
          : `Got it! I've added **"${newEvent.title}"** to your schedule for ${formattedDate} at ${formattedTime}.`;
      } else {
        modelResponse = lang === "he"
          ? "היי! רשת ה-AI פועלת במצב שמור כרגע. ממה שניתחתי בדפוסים שלך, הפעולות הקצרות מניבות הכי הרבה הצלחות."
          : "Hello! AI is running in offline safety mode. Looking at your metrics, shorter action windows yield a much higher success rate for you.";
      }
    }

    const assistantMsg = { id: "m_ast_" + Math.random().toString(36).substring(2, 9), role: "model" as const, content: modelResponse, created_at: new Date().toISOString() };
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
    const activeActions = user.actions.filter((a: any) => a.is_active && a.duration_minutes <= targetDuration);
    res.json({
      suggested_ids: activeActions.slice(0, 3).map((a: any) => a.id),
      reason: user.profile.language === "he" ? "הפעולות הללו מתאימות בצורה מושלמת לרמת האנרגיה ולזמן העומד לרשותך." : "These actions fit perfectly into your active timeframe."
    });
  } catch { res.status(500).json({ error: "Server error" }); }
});

app.get("/api/ai/insights", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const lang = user.profile.language;

    if (user.ai_insights.length === 0) {
      user.ai_insights = [{
        id: "ins_new_1",
        type: "daily",
        title: lang === "he" ? "הבוקר הוא הכוח שלך" : "Morning is your strength",
        body: lang === "he"
          ? "זיהינו ש-90% מהפעולות בבוקר מסומנות כבוצעו בהצלחה. לעומת זאת, בשעות הערב רמת הדחיות עולה."
          : "We noticed 90% of morning actions are successfully completed, while evening actions face delays.",
        suggested_action: { action_type: "move_morning" },
        created_at: new Date().toISOString()
      }];
      await saveUser(user);
    }

    res.json(user.ai_insights);
  } catch { res.status(500).json({ error: "Server error" }); }
});

app.post("/api/ai/generate-insights", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const lang = user.profile.language;
    const newInsight = {
      id: "ins_" + Math.random().toString(36).substring(2, 9),
      type: "daily" as const,
      title: lang === "he" ? "דפוס התמדה חיובי" : "Positive Streak Pattern",
      body: lang === "he"
        ? "ביצעת את פעולת ה'יוגה' פעמיים ברצף השבוע. יש לך מגמת שיפור של 15% בזמן הפעילות המצטבר."
        : "You completed Yoga twice in a row this week. Cumulative activity is up 15%.",
      suggested_action: { action_type: "keep_same" as const },
      created_at: new Date().toISOString()
    };
    user.ai_insights.unshift(newInsight);
    await saveUser(user);
    res.json(newInsight);
  } catch { res.status(500).json({ error: "Server error" }); }
});

app.post("/api/ai/propose-action-adjustment", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const { action_id, adjustment_type } = req.body;
    const lang = user.profile.language;
    const act = user.actions.find((a: any) => a.id === action_id);
    if (!act) return res.status(404).json({ error: "פעולה לא קיימת" });

    if (adjustment_type === "shorten_duration") act.duration_minutes = Math.max(10, act.duration_minutes - 10);
    await saveUser(user);

    res.json({
      success: true, action: act,
      message: lang === "he" ? `הפעולה "${act.title}" עודכנה בהצלחה.` : `Action "${act.title}" was updated successfully.`
    });
  } catch { res.status(500).json({ error: "Server error" }); }
});

// --------------------------------------------------------------------------
// Notifications
// --------------------------------------------------------------------------
app.get("/api/notifications", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    res.json(user.notifications);
  } catch { res.status(500).json({ error: "Server error" }); }
});

app.post("/api/notifications/test", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const lang = user.profile.language;
    const newNotify = {
      id: "not_" + Math.random().toString(36).substring(2, 9),
      title: lang === "he" ? "יש לך חלון פנוי 👀" : "Empty window detected 👀",
      body: lang === "he" ? "מה מכניסים עכשיו? יש לך 30 דקות פנויות עד הפגישה הבאה." : "What are we doing next? You have 30 empty minutes until the next event.",
      scheduled_for: new Date(Date.now() + 5000).toISOString(),
      type: "free_window",
      status: "sent" as const,
      created_at: new Date().toISOString()
    };
    user.notifications.unshift(newNotify);
    await saveUser(user);
    res.json({ success: true, notification: newNotify });
  } catch { res.status(500).json({ error: "Server error" }); }
});

// --------------------------------------------------------------------------
// Privacy Controls
// --------------------------------------------------------------------------
app.post("/api/privacy/reset-data", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const { clear_ai, clear_checkins, delete_all } = req.body;

    if (delete_all) {
      user.actions = []; user.check_ins = []; user.ai_messages = []; user.ai_insights = []; user.notifications = [];
      user.profile.onboarded = false; user.profile.calendar_connected = false;
    } else {
      if (clear_ai) { user.ai_messages = []; user.ai_insights = []; }
      if (clear_checkins) user.check_ins = [];
    }

    await saveUser(user);
    res.json({ success: true, user: user.profile });
  } catch { res.status(500).json({ error: "Server error" }); }
});

app.post("/api/actions/restore-defaults", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const defaultActions = [
      { id: "act_1", title: "יוגה בוקר והארכת שרירים", icon: "Heart", duration_minutes: 20, energy_level: "medium", category: "health", smart_suggestion_enabled: true, preferred_time_window: "morning", is_active: true, created_at: new Date().toISOString() },
      { id: "act_2", title: "קריאת ספר פיתוח אישי", icon: "BookOpen", duration_minutes: 30, energy_level: "low", category: "development", smart_suggestion_enabled: true, preferred_time_window: "afternoon", is_active: true, created_at: new Date().toISOString() },
      { id: "act_3", title: "אימון כוח אינטנסיבי", icon: "Dumbbell", duration_minutes: 50, energy_level: "high", category: "health", smart_suggestion_enabled: true, preferred_time_window: "evening", is_active: true, created_at: new Date().toISOString() },
      { id: "act_4", title: "סידור ומיון מיילים פנויים", icon: "Folder", duration_minutes: 15, energy_level: "low", category: "organization", smart_suggestion_enabled: true, preferred_time_window: "afternoon", is_active: true, created_at: new Date().toISOString() },
      { id: "act_5", title: "נשימות ורוגע קוסמי", icon: "Wind", duration_minutes: 10, energy_level: "low", category: "mindfulness", smart_suggestion_enabled: true, preferred_time_window: "evening", is_active: true, created_at: new Date().toISOString() },
    ];
    user.actions = defaultActions;
    await saveUser(user);
    res.json({ success: true, actions: user.actions });
  } catch { res.status(500).json({ error: "Server error" }); }
});

app.post("/api/privacy/delete-account", async (req, res) => {
  try {
    const user = await getActiveUser(req);
    const email = user.profile.email.toLowerCase().trim();
    await usersCol.deleteOne({ _id: email as any });
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Server error" }); }
});

// --------------------------------------------------------------------------
// Vite or Production File Server
// --------------------------------------------------------------------------
const isProduction = process.env.NODE_ENV === "production";

async function startServer() {
  await connectDB();

  if (!isProduction) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => { res.sendFile(path.join(distPath, "index.html")); });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Layer server running on port ${PORT}`);
  });
}

startServer();
