// App.js - Local Loop Hub (FULL APP + Loop+ Upgrade Wall)
// -----------------------------------------------------------------------------------
// [x] Tabs: Feed, New, Chats, Loop+, Profile
// [x] Premium features (Free + Hire + Boost) live inside Loop+ tab
// [x] Loop+ shows an Upgrade Wall FIRST (monthly / yearly) until activated
// [x] AsyncStorage persistence + time-window posts
// [x] SafeAreaView via react-native-safe-area-context (no deprecated SafeAreaView)
// [x] Defensive store repair to avoid undefined errors
// [x] Bright gradient + floating orbs background
//
// Install deps:
//   npx expo install @react-native-async-storage/async-storage react-native-safe-area-context expo-linear-gradient
// Optional (permissions):
//   npx expo install expo-notifications
// Optional (real GPS):
//   npx expo install expo-location
// Optional (map view):
//   npx expo install react-native-maps
//
// Drop-in: replace your App.js with this file.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Modal,
  Alert,
  Animated,
  Easing,
  Linking,
  ImageBackground,
  Image,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Purchases from "react-native-purchases";
import Constants from "expo-constants";
import { createClient } from "@supabase/supabase-js";
import { Video } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Font fallback (no dependency install required)
const useFonts = () => [true];
const Sora_400Regular = "System";
const Sora_600SemiBold = "System";
const Sora_700Bold = "System";
const Sora_800ExtraBold = "System";

// Gradient fallback (no dependency install required)
const LinearGradient = ({ children, style, colors }) => (
  <View style={[style, colors?.length ? { backgroundColor: colors[0] } : null]}>{children}</View>
);

// Profanity list fallback (optional file may be missing)
const profanityList = [];

// Optional Notifications (won't crash if not installed)
let Notifications = null;
try {
  // eslint-disable-next-line global-require
  Notifications = require("expo-notifications");
  if (Notifications?.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  }
} catch (e) {
  Notifications = null;
}

// Optional TaskManager (background location)
let TaskManager = null;
try {
  // eslint-disable-next-line global-require
  TaskManager = require("expo-task-manager");
} catch (e) {
  TaskManager = null;
}

// Optional Location (won't crash if not installed)
let Location = null;
try {
  // eslint-disable-next-line global-require
  Location = require("expo-location");
} catch (e) {
  Location = null;
}

// Optional Image Picker (Loop+ photos)
let ImagePicker = null;
try {
  // eslint-disable-next-line global-require
  ImagePicker = require("expo-image-picker");
} catch (e) {
  ImagePicker = null;
}

// Optional FileSystem (uploads)
let FileSystem = null;
try {
  // eslint-disable-next-line global-require
  FileSystem = require("expo-file-system/legacy");
} catch (e) {
  FileSystem = null;
}

// Optional Maps (won't crash if not installed)
let MapView = null;
let Marker = null;
let PROVIDER_GOOGLE = null;
try {
  // eslint-disable-next-line global-require
  const maps = require("react-native-maps");
  MapView = maps.default ?? maps.MapView ?? maps;
  Marker = maps.Marker;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE ?? null;
} catch (e) {
  MapView = null;
  Marker = null;
  PROVIDER_GOOGLE = null;
}

// Optional Blur (glass effect)
let BlurView = null;
try {
  // eslint-disable-next-line global-require
  BlurView = require("expo-blur").BlurView;
} catch (e) {
  BlurView = null;
}
const APP_NAME = "Local Loop Hub";
const STORE_KEY = "LOCAL_LOOP_HUB_STORE_V5_CLEAN";
const LOCAL_DB_KEY = "LOCAL_LOOP_HUB_LOCAL_DB_V1";
const LOCAL_AUTH_KEY = "LOCAL_LOOP_HUB_LOCAL_AUTH_V1";
const FONT_REGULAR = "Sora_400Regular";
const FONT_SEMI = "Sora_600SemiBold";
const FONT_BOLD = "Sora_700Bold";
const FONT_EXTRA = "Sora_800ExtraBold";
const ALERTS_KEY = "LOCAL_LOOP_HUB_ALERTS_V1";
const ONBOARDING_KEY = "LOCAL_LOOP_HUB_ONBOARDING_V1";
const LOCAL_LOOPPLUS_KEY = "LOCAL_LOOPPLUS_OVERRIDE_V1";
const LOCAL_LOOPPLUS_PLAN_KEY = "LOCAL_LOOPPLUS_PLAN_V1";
const PROXIMITY_TASK = "loopplus-proximity";
const ALERT_COOLDOWN_MS = 60 * 1000;
const ALERT_RADIUS_OPTIONS = [0.5, 1, 2, 3];
const FREE_WEEKLY_BOOSTS = 1;
const LOOPPLUS_WEEKLY_BOOSTS = 3;
const FREE_POSTS_PER_DAY = 4;
const FREE_ACTIVE_LOOPS = 3;
const FREE_THREADS_PER_DAY = 3;
const DEFAULT_PRICING = { monthly: "$3.99 / month", yearly: "$39.99 / year" };
const ADMIN_UIDS = [
  "3685d902-4809-4ba7-a4f8-d68cae2134e0",
  "c0d61f7c-7609-4e6d-92e6-7eb9174527a2",
];
const BRAND_COLORS = {
  blue: "#2F7BEA",
  green: "#39C36E",
  yellow: "#F5C343",
  orange: "#FF8A3D",
  teal: "#2CC6C1",
};
const DISABLE_BOOST_SYNC = false;
const IAP_PRODUCTS = {
  monthly: "localloophub_monthly",
  yearly: "localloophub_yearly",
};
const BOOST_PACKS = [
  { key: "single", productId: "localloophub_boost_1", count: 1, fallbackPrice: "$0.99" },
  { key: "six", productId: "localloophub_boost_6", count: 6, fallbackPrice: "$4.99" },
  { key: "ten", productId: "localloophub_boost_10", count: 10, fallbackPrice: "$7.99" },
];
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true },
      })
    : null;
const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? "";
const REVENUECAT_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? "";
const REVENUECAT_ENTITLEMENT = "loop_plus";
const APP_VERSION =
  Constants?.expoConfig?.version ?? Constants?.manifest?.version ?? "unknown";
const IOS_BUILD_NUMBER =
  Constants?.expoConfig?.ios?.buildNumber ?? Constants?.manifest?.ios?.buildNumber ?? "unknown";
const TERMS_URL = "https://www.localloophub.com/terms.html";
const PRIVACY_URL = "https://www.localloophub.com/privacy.html";

const LEGAL_DOCS = {
  terms: {
    title: "Local Loop Hub — Terms of Service",
    body: `Effective Date: [Insert date]

Welcome to Local Loop Hub.
Local Loop Hub is a community app designed to help people share needs, offers, and local information in a simple, human way.

By using the app, you agree to these Terms.

1. Who Can Use Local Loop Hub

You must be 13 years or older to use the app.
If you’re under 18, you should have permission from a parent or guardian.

2. Your Account

You’re responsible for:

- Keeping access to your account secure
- Everything posted or done under your account
- Providing accurate information

If your account is used in a way that harms the community or violates these terms, we may limit or suspend access.

3. Community Content

You’re responsible for what you post, including:

- Loops (Needs, Offers, Info)
- Messages
- Profile details

Please don’t post content that is:

- Illegal or harmful
- Misleading or deceptive
- Abusive, harassing, or spammy

We may remove content or restrict accounts to keep the community healthy.

4. Community Disclaimer

Local Loop Hub is a connection platform, not a marketplace, employer, or service broker.

We don’t verify users, offers, or claims.
Any interactions you choose to have are your responsibility.

5. Account Changes

You may stop using the app at any time.
We may update, suspend, or end access if the app is misused or these terms are violated.

6. Updates

These terms may change as the app grows.
Continued use means you accept the updated terms.`,
  },
  privacy: {
    title: "Privacy Policy",
    body: `Effective Date: [Insert date]

Local Loop Hub is built around trust. Here’s how we handle your data.

1. What We Collect

We collect only what’s needed to run the app:

- Email address (for login)
- Profile info you choose to provide
- Content you post (loops, messages)
- Basic usage data to improve performance

We do not sell your personal data.

2. How We Use Your Info

Your information is used to:

- Authenticate your account
- Power app features
- Improve reliability and user experience
- Respond to support requests

3. Data Storage

Data is securely stored using trusted third-party infrastructure providers (such as Supabase).

4. Sharing

We don’t share your personal data with advertisers.
We may share data if legally required or to protect the community.

5. Your Rights

You can request:

- Access to your data
- Deletion of your account and data

Contact us at support@localloophub.com (or your chosen email).`,
  },
  eula: {
    title: "End User License Agreement (EULA)",
    body: `Local Loop Hub grants you a limited, personal, non-exclusive license to use the app.

You may not:

- Reverse engineer or modify the app
- Use the app for unlawful purposes
- Resell or redistribute the app

All app content, branding, and code belong to Local Loop Hub.`,
  },
  subscription: {
    title: "Loop+ Subscription Terms",
    body: `Loop+ is an optional upgrade that unlocks enhanced features for power users.

1. Plans

Loop+ may include:

- Monthly subscription
- Yearly subscription

Prices are shown in-app and may vary by region.

2. Billing

- Charged to your Apple ID (or Google account)
- Subscriptions auto-renew unless canceled at least 24 hours before renewal
- Manage or cancel anytime through your App Store account settings

3. What Loop+ Unlocks

Loop+ provides access to premium tools such as:

- Enhanced visibility
- Advanced posting tools
- Priority features

Features may evolve as the app grows.

4. No Outcome Guarantees

Loop+ unlocks features — not results.
We don’t guarantee responses, connections, or outcomes.`,
  },
  refunds: {
    title: "Refund Policy",
    body: `All payments are handled by the App Store platform.

We don’t process refunds directly.

To request a refund:

iOS: https://reportaproblem.apple.com

Android: Google Play → Order History

Refund approval is handled by Apple or Google.`,
  },
  support: {
    title: "Support Policy",
    body: `We provide support on a best-effort basis.

Contact

support@localloophub.com

Support includes:

- Login and access issues
- Bug reports
- Account questions

We don’t mediate disputes between users.`,
  },
  safety: {
    title: "Safety & Responsibility",
    body: `Local Loop Hub helps people connect locally, but:

- We don’t verify identities
- We don’t guarantee accuracy
- We don’t act as a middleman

Please use good judgment and common sense when interacting with others.`,
  },
};

function openExternalUrl(url, label) {
  if (!url) return;
  Linking.openURL(url).catch(() => {
    Alert.alert("Link unavailable", `Unable to open ${label || "this link"} on this device.`);
  });
}

const ABOUT_COPY = {
  title: "Local Loop Hub",
  body: `Local Loop Hub helps people connect with others nearby-right when it matters.

It's a location-based community app where posts are short-lived, local, and purposeful. Whether you need help, have something to offer, or want to know what's happening around you, everything you see is tied to time and place.

No endless feeds.
No viral pressure.
Just real people, nearby.

What you can do:
- Post Needs, Offers, or Local Info
- See posts around you on a map or feed
- Filter by distance, type, and time
- Chat privately with nearby neighbors
- Follow people you trust
- Get alerts when something relevant is close

Posts automatically expire, keeping the app fresh and relevant.

Loop+ (Optional Upgrade)
Loop+ unlocks advanced tools for power users, including:
- More active posts
- More daily posts and chats
- Premium sections like Hire and Boost
- Proximity alerts and enhanced visibility

Loop+ opens with an upgrade wall so you always know what's available before you dive in.

Why Local Loop Hub?
Most platforms are built to keep you scrolling.
Local Loop Hub is built around time, distance, and usefulness.

Short posts.
Local relevance.
Real outcomes.

Your loop is your area.
Your hub is where it all connects.

Keywords: local community, neighborhood app, local help, nearby services, community hub, local map, neighborhood network`,
};

const ONBOARDING_SCREENS = [
  {
    title: "Welcome to Local Loop Hub",
    body: "A real-time community hub for what's happening near you.",
  },
  {
    title: "Time & Distance Matter",
    body: "Posts are local and temporary. Everything you see is nearby-and automatically expires to stay relevant.",
  },
  {
    title: "Feed or Map",
    body: "Browse your way. View posts as a list or on the map. Filter by needs, offers, or info.",
  },
  {
    title: "Post a Loop",
    body: "Need something? Offer something? Create a short post with a distance range and time limit.",
  },
  {
    title: "Chat Privately",
    body: "Connect without noise. Tap a post to start a private chat-no public comment clutter.",
  },
  {
    title: "Loop+ (Optional)",
    body: "Unlock advanced tools. Upgrade for more posts, premium sections, and proximity alerts.",
  },
  {
    title: "You're In",
    body: "Your local loop is live. Jump in and see what's happening near you.",
  },
];

const TAB_TOOLTIPS = [
  { title: "Home", body: "Nearby activity, right now. See active local posts filtered by distance, time, and type." },
  { title: "Map", body: "See what's around you. View nearby loops on the map and tap to explore or get directions." },
  { title: "New", body: "Create a loop. Post a need, offer, or local update with a time window and radius." },
  { title: "Loop+", body: "Premium tools live here. Upgrade to unlock advanced posting, Hire, Boost, and alerts." },
  { title: "Profile", body: "Your account & settings. Manage your profile, notifications, subscription, and preferences." },
];

const TABS = [
  { key: "feed", label: "Home" },
  { key: "map", label: "Map" },
  { key: "new", label: "" },
  { key: "loopplus", label: "Loop+" },
  { key: "profile", label: "Profile" },
];

const LOOPPLUS_SECTIONS = [
  { key: "all", label: "All" },
  { key: "free", label: "Free" },
  { key: "hire", label: "Hire" },
  { key: "toolshare", label: "Tool Share" },
  { key: "urgent", label: "Urgent" },
  { key: "boost", label: "Boost" },
];
const LOOPPLUS_SECTION_META = {
  all: { icon: "grid-outline", color: BRAND_COLORS.blue },
  free: { icon: "gift-outline", color: BRAND_COLORS.green },
  hire: { icon: "briefcase-outline", color: BRAND_COLORS.orange },
  toolshare: { icon: "hammer-outline", color: BRAND_COLORS.blue },
  urgent: { icon: "alert-circle-outline", color: "#ff5c5c" },
  boost: { icon: "flash-outline", color: BRAND_COLORS.yellow },
};

const POST_TYPES = [
  { key: "need", label: "Need" },
  { key: "offer", label: "Offer" },
  { key: "info", label: "Info" },
];

const FEED_FILTERS = [
  { key: "all", label: "All" },
  { key: "need", label: "Needs" },
  { key: "offer", label: "Offers" },
  { key: "info", label: "Info" },
];

const RADIUS_OPTIONS = [1, 2, 5, 10];
const TIME_WINDOWS = [
  { key: "15m", label: "15m", ms: 15 * 60 * 1000 },
  { key: "1h", label: "1h", ms: 60 * 60 * 1000 },
  { key: "6h", label: "6h", ms: 6 * 60 * 60 * 1000 },
  { key: "24h", label: "24h", ms: 24 * 60 * 60 * 1000 },
];

function uid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;      
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function makeEmptyLocalDb() {
  return {
    users: [],
    profiles: [],
    loops: [],
    threads: [],
    messages: [],
    follows: [],
    loopplus_posts: [],
  };
}

function normalizeLocalDb(db) {
  const base = makeEmptyLocalDb();
  if (!db || typeof db !== "object") return base;
  return {
    users: Array.isArray(db.users) ? db.users : base.users,
    profiles: Array.isArray(db.profiles) ? db.profiles : base.profiles,
    loops: Array.isArray(db.loops) ? db.loops : base.loops,
    threads: Array.isArray(db.threads) ? db.threads : base.threads,
    messages: Array.isArray(db.messages) ? db.messages : base.messages,
    follows: Array.isArray(db.follows) ? db.follows : base.follows,
    loopplus_posts: Array.isArray(db.loopplus_posts) ? db.loopplus_posts : base.loopplus_posts,
  };
}

async function loadLocalDb() {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_DB_KEY);
    if (!raw) return makeEmptyLocalDb();
    const parsed = JSON.parse(raw);
    return normalizeLocalDb(parsed);
  } catch (e) {
    return makeEmptyLocalDb();
  }
}

async function saveLocalDb(db) {
  const next = normalizeLocalDb(db);
  await AsyncStorage.setItem(LOCAL_DB_KEY, JSON.stringify(next));
  return next;
}

async function updateLocalDb(updater) {
  const current = await loadLocalDb();
  const next = updater ? updater({ ...current }) : current;
  return saveLocalDb(next ?? current);
}

function makeSession(user, profile) {
  if (!user) return null;
  const displayName = profile?.display_name ?? user?.display_name ?? "";
  return {
    user: {
      id: user.id,
      email: user.email,
      user_metadata: { display_name: displayName },
    },
  };
}

async function loadLocalSession() {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.user?.id) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

async function saveLocalSession(session) {
  if (!session) {
    await AsyncStorage.removeItem(LOCAL_AUTH_KEY);
    return null;
  }
  await AsyncStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(session));
  return session;
}

const PROFANITY_PATTERNS = (Array.isArray(profanityList) ? profanityList : [])
  .map((word) => {
    const normalized = normalizeForFilter(word);
    if (!normalized) return null;
    return { normalized, compact: normalized.replace(/\s+/g, "") };
  })
  .filter(Boolean);

function normalizeForFilter(input) {
  if (!input) return "";
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function containsProfanity(input) {
  const normalized = normalizeForFilter(input);
  if (!normalized) return false;
  const compact = normalized.replace(/\s+/g, "");
  for (const entry of PROFANITY_PATTERNS) {
    if (!entry) continue;
    if (normalized.includes(entry.normalized)) return true;
    if (entry.compact && compact.includes(entry.compact)) return true;
  }
  return false;
}
function now() {
  return Date.now();
}
function looksLikeEmail(value) {
  return typeof value === "string" && value.includes("@");
}
function displayNameOrFallback(value) {
  if (!value || looksLikeEmail(value)) return "Neighbor";
  return value;
}
function dayKey(ts = now()) {
  return new Date(ts).toISOString().slice(0, 10);
}
function weekKey(ts = now()) {
  const d = new Date(ts);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
}
function formatTime(ts) {
  const d = new Date(ts);
  const hh = d.getHours();
  const mm = d.getMinutes().toString().padStart(2, "0");
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = ((hh + 11) % 12) + 1;
  return `${h12}:${mm} ${ampm}`;
}
function formatRelative(msAgo) {
  const s = Math.floor(msAgo / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
function sameDateKey(aTs, bTs) {
  const a = new Date(aTs);
  const b = new Date(bTs);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function prettyType(typeKey) {
  const found = POST_TYPES.find((t) => t.key === typeKey);
  return found?.label ?? "Info";
}
function typePillStyle(typeKey) {
  if (typeKey === "need")
    return { backgroundColor: "rgba(255, 138, 61, 0.22)", borderColor: "rgba(255,138,61,0.55)" };
  if (typeKey === "offer")
    return { backgroundColor: "rgba(47, 123, 234, 0.22)", borderColor: "rgba(47,123,234,0.55)" };
  return { backgroundColor: "rgba(57, 195, 110, 0.22)", borderColor: "rgba(57,195,110,0.55)" };
}

function loopPlusTypePillStyle(kind) {
  if (kind === "hire") return { backgroundColor: "rgba(255, 138, 61, 0.22)", borderColor: "rgba(255,138,61,0.55)" };
  if (kind === "toolshare") return { backgroundColor: "rgba(47, 123, 234, 0.22)", borderColor: "rgba(47,123,234,0.55)" };
  if (kind === "urgent") return { backgroundColor: "rgba(255, 120, 120, 0.24)", borderColor: "rgba(255,120,120,0.45)" };
  return { backgroundColor: "rgba(57, 195, 110, 0.22)", borderColor: "rgba(57,195,110,0.55)" };
}

function getTrustBadge(score) {
  const safeScore = typeof score === "number" ? score : 0;
  if (safeScore >= 80) return { label: "Top", tone: "sky" };
  if (safeScore >= 50) return { label: "Trusted", tone: "success" };
  if (safeScore >= 20) return { label: "Rising", tone: "peach" };
  return { label: "New", tone: "neutral" };
}

function mapLoopPlusRow(row) {
  if (!row) return null;
  const createdAt = row.created_at ? new Date(row.created_at).getTime() : now();
  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : createdAt + TIME_WINDOWS[3].ms;
  return {
    id: row.id,
    userId: row.user_id ?? null,
    title: row.title ?? "",
    details: row.details ?? "",
    createdAt,
    expiresAt,
    radiusMiles: row.radius_miles ?? 5,
    timeWindowKey: row.time_window_key ?? "24h",
    boostedAt: row.boosted_at ? new Date(row.boosted_at).getTime() : null,
    author: displayNameOrFallback(row.author ?? "Neighbor"),
    locationLabel: row.location_label ?? "Near you",
    images: Array.isArray(row.images) ? row.images : [],
    lat: row.lat ?? null,
    lon: row.lon ?? null,
    kind: row.kind ?? "free",
    trustScore: row.author_trust_score ?? 0,
  };
}

function loopPlusItemToLoop(item) {
  if (!item) return null;
  const createdAt = item.createdAt ?? now();
  const expiresAt = item.expiresAt ?? createdAt + TIME_WINDOWS[3].ms;
  const kind =
    item.kind === "hire"
      ? "hire"
      : item.kind === "toolshare"
      ? "toolshare"
      : item.kind === "urgent"
      ? "urgent"
      : "free";
  return {
    id: item.id,
    userId: item.userId ?? null,
    type:
      kind === "hire"
        ? "loopplus_hire"
        : kind === "toolshare"
        ? "loopplus_toolshare"
        : kind === "urgent"
        ? "loopplus_urgent"
        : "loopplus_free",
    title: item.title ?? "",
    details: item.details ?? "",
    createdAt,
    expiresAt,
    radiusMiles: item.radiusMiles ?? 5,
    timeWindowKey: item.timeWindowKey ?? "24h",
    boostedAt: item.boostedAt ?? null,
    distanceMiles: null,
    author: item.author ?? "Neighbor",
    locationLabel: item.locationLabel ?? "Near you",
    lat: item.lat ?? null,
    lon: item.lon ?? null,
    images: Array.isArray(item.images) ? item.images : [],
    isLoopPlus: true,
    loopPlusKind: kind,
    trustScore: item.trustScore ?? 0,
  };
}

function cleanExpiredLoops(loops) {
  const t = now();
  return (Array.isArray(loops) ? loops : []).filter((p) => (typeof p?.expiresAt === "number" ? p.expiresAt > t : true));
}

function normalizeUsage(usage, userId = null) {
  const key = dayKey();
  if (!usage || usage.dayKey !== key || usage.userId !== userId) {
    return { dayKey: key, postsToday: 0, threadsToday: 0, userId };
  }
  return { ...usage, userId };
}

function normalizeBoostStats(stats, ts = now()) {
  const key = weekKey(ts);
  if (!stats) {
    return { boostsUsedWeek: 0, lastBoostWeekKey: key, extraBoosts: 0 };
  }
  const lastKey = stats.lastBoostWeekKey ?? (stats.lastBoostDate ? weekKey(stats.lastBoostDate) : key);
  const used = lastKey === key ? stats.boostsUsedWeek ?? 0 : 0;
  return {
    ...stats,
    boostsUsedWeek: used,
    lastBoostWeekKey: key,
    extraBoosts: stats.extraBoosts ?? 0,
  };
}

function isValidCoord(n) {
  return typeof n === "number" && Number.isFinite(n);
}

function isUuid(value) {
  if (typeof value !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  );
}

function jitterCoords(lat, lon, meters = 120) {
  if (!isValidCoord(lat) || !isValidCoord(lon)) return { lat, lon };
  const latOffset = (Math.random() - 0.5) * (meters / 111320);
  const lonOffset = (Math.random() - 0.5) * (meters / (111320 * Math.cos((lat * Math.PI) / 180)));
  return { lat: lat + latOffset, lon: lon + lonOffset };
}

function distanceMilesBetween(aLat, aLon, bLat, bLon) {
  if (!isValidCoord(aLat) || !isValidCoord(aLon) || !isValidCoord(bLat) || !isValidCoord(bLon)) return null;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const a = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 3958.8 * c;
}

async function loadAlertTimes() {
  try {
    const raw = await AsyncStorage.getItem(ALERTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function saveAlertTimes(map) {
  try {
    await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(map ?? {}));
  } catch {}
}

async function handleProximityAlerts({ latitude, longitude, loops, radiusMiles }) {
  if (!Notifications) return;
  if (!isValidCoord(latitude) || !isValidCoord(longitude)) return;
  const active = cleanExpiredLoops(loops ?? []);
  if (!active.length) return;
  const alertMap = await loadAlertTimes();
  const nowTs = now();
  let updated = false;

  for (const loop of active) {
    const dist = distanceMilesBetween(latitude, longitude, loop.lat, loop.lon);
    if (typeof dist !== "number") continue;
    if (dist > radiusMiles) continue;
    if (alertMap[loop.id]) continue;

    alertMap[loop.id] = nowTs;
    updated = true;
    Notifications.scheduleNotificationAsync({
      content: {
        title: loop.isLoopPlus ? "Loop+ nearby" : "Loop nearby",
        body: `${loop.title ?? "A loop"} is about ${dist.toFixed(1)} mi away.`,
        data: { type: loop.isLoopPlus ? "loopplus" : "loop", loopId: loop.id },
        ...(loop.isLoopPlus ? { sound: "default" } : {}),
      },
      trigger: null,
    }).catch(() => {});
  }

  if (updated) await saveAlertTimes(alertMap);
}

if (TaskManager?.defineTask && Location) {
  try {
    TaskManager.defineTask(PROXIMITY_TASK, async ({ data, error }) => {
      if (error) return;
      const coords = data?.locations?.[0]?.coords;
      if (!coords) return;
      const raw = await AsyncStorage.getItem(STORE_KEY);
      if (!raw) return;
      let store = null;
      try {
        store = JSON.parse(raw);
      } catch {
        store = null;
      }
      if (!store?.settings?.loopPlus || !store?.settings?.proximityAlertsEnabled) return;
      const radiusMiles = store?.settings?.alertRadiusMiles ?? 1.5;
    const loopPlusItems = [
        ...(store?.loopPlusData?.freeItems ?? []),
        ...(store?.loopPlusData?.hireTasks ?? []),
        ...(store?.loopPlusData?.toolShareItems ?? []),
        ...(store?.loopPlusData?.urgentItems ?? []),
      ]
        .map(loopPlusItemToLoop)
        .filter(Boolean);
      await handleProximityAlerts({
        latitude: coords.latitude,
        longitude: coords.longitude,
        loops: [...(store?.loops ?? []), ...loopPlusItems],
        radiusMiles,
      });
    });
  } catch {}
}

function makeInitialStore() {
  const createdAt = now();
  const baseLocation = { label: "Near You", lat: null, lon: null, updatedAt: createdAt };

  return {
    version: 4,
    auth: { signedIn: false, userId: null, name: "", email: "" },
    settings: {
      loopPlus: false,
      notificationsEnabled: false,
      proximityAlertsEnabled: true,
      alertRadiusMiles: 1.5,
      pricing: DEFAULT_PRICING,
    },
    loopPlusUI: { section: "upgrade" }, // -> default wall
    location: baseLocation,
    feed: { filter: "all", radiusMiles: 5, sortMode: "near" }, // near|recent
    loops: [],
    chats: { threads: [], selectedThreadId: null },
    loopAccepts: {},
    stats: {
      helps: 0,
      loops: 0,
      badges: 0,
      postsCreated: 0,
      repliesSent: 0,
      boostsUsedToday: 0,
      lastBoostDate: null,
      boostsUsedWeek: 0,
      lastBoostWeekKey: weekKey(),
      extraBoosts: 0,
      activePlan: null, // "monthly" | "yearly"
    },
    usage: {
      dayKey: dayKey(),
      postsToday: 0,
      threadsToday: 0,
      userId: null,
    },
    loopPlusData: {
      freeItems: [],
      hireTasks: [],
      toolShareItems: [],
      urgentItems: [],
    },
  };
}

async function loadStore() {
  const raw = await AsyncStorage.getItem(STORE_KEY);
  if (!raw) return makeInitialStore();

  try {
    const parsed = JSON.parse(raw);
    const base = makeInitialStore();

    // Repair/migrate to prevent undefined property errors
    const repaired = {
      ...base,
      ...parsed,
      auth: { ...base.auth, ...(parsed?.auth ?? {}) },
      settings: { ...base.settings, ...(parsed?.settings ?? {}) },
      loopPlusUI: { ...base.loopPlusUI, ...(parsed?.loopPlusUI ?? {}) },
      location: { ...base.location, ...(parsed?.location ?? {}) },
      feed: { ...base.feed, ...(parsed?.feed ?? {}) },
      loops: Array.isArray(parsed?.loops) ? parsed.loops : base.loops,
        chats: {
          ...base.chats,
          ...(parsed?.chats ?? {}),
          threads: Array.isArray(parsed?.chats?.threads) ? parsed.chats.threads : base.chats.threads,
        },
        stats: { ...base.stats, ...(parsed?.stats ?? {}) },
        usage: { ...base.usage, ...(parsed?.usage ?? {}) },
      loopPlusData: { ...base.loopPlusData, ...(parsed?.loopPlusData ?? {}) },
        loopAccepts: { ...base.loopAccepts, ...(parsed?.loopAccepts ?? {}) },
      };

    if (typeof repaired.auth.signedIn !== "boolean") repaired.auth.signedIn = false;
    if (typeof repaired.settings.loopPlus !== "boolean") repaired.settings.loopPlus = false;
    if (typeof repaired.settings.notificationsEnabled !== "boolean") repaired.settings.notificationsEnabled = false;
    if (typeof repaired.settings.proximityAlertsEnabled !== "boolean") repaired.settings.proximityAlertsEnabled = true;
    if (typeof repaired.settings.alertRadiusMiles !== "number") repaired.settings.alertRadiusMiles = 1.5;
    if (!repaired.loopPlusUI || typeof repaired.loopPlusUI.section !== "string") repaired.loopPlusUI = { section: "upgrade" };
    if (
      !repaired.settings.pricing ||
      repaired.settings.pricing.monthly !== base.settings.pricing.monthly ||
      repaired.settings.pricing.yearly !== base.settings.pricing.yearly
    ) {
      repaired.settings.pricing = base.settings.pricing;
    }
      if (!("activePlan" in (repaired.stats ?? {}))) repaired.stats.activePlan = null;
      if (!("boostsUsedWeek" in (repaired.stats ?? {}))) repaired.stats.boostsUsedWeek = 0;
      if (!("lastBoostWeekKey" in (repaired.stats ?? {}))) repaired.stats.lastBoostWeekKey = weekKey();
      if (!("extraBoosts" in (repaired.stats ?? {}))) repaired.stats.extraBoosts = 0;
      if (!repaired.loopAccepts || typeof repaired.loopAccepts !== "object") repaired.loopAccepts = {};
      repaired.usage = normalizeUsage(repaired.usage, repaired?.auth?.userId ?? null);

    repaired.loops = cleanExpiredLoops(repaired.loops);

    return repaired;
  } catch (e) {
    return makeInitialStore();
  }
}

async function saveStore(store) {
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(store));
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Sora_400Regular,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
  });
  const [hydrating, setHydrating] = useState(true);
  const [store, setStore] = useState(null);
  const [activeTab, setActiveTab] = useState("feed");
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState("signIn");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authError, setAuthError] = useState("");
  const [profile, setProfile] = useState(null);
  const [localLoopPlus, setLocalLoopPlus] = useState(false);
  const [localPlanKey, setLocalPlanKey] = useState(null);
  const [feedScrollKey, setFeedScrollKey] = useState(0);

  // Feed "slider-ish" control animation: 0 near, 1 recent
  const sortAnim = useRef(new Animated.Value(0)).current;

  // New Loop form
  const [newType, setNewType] = useState("need");
  const [newTitle, setNewTitle] = useState("");
  const [newDetails, setNewDetails] = useState("");
  const [newTimeKey, setNewTimeKey] = useState("1h");
  const [newRadius, setNewRadius] = useState(5);
  const [editingLoop, setEditingLoop] = useState(null);

  // Chat
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [chatDraft, setChatDraft] = useState("");
  const [chatThreads, setChatThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [selectedThreadMessages, setSelectedThreadMessages] = useState([]);
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalDocKey, setLegalDocKey] = useState("terms");
  const [aboutVisible, setAboutVisible] = useState(false);
  const [tipsVisible, setTipsVisible] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerUri, setImageViewerUri] = useState(null);
  const modalsClearedRef = useRef(false);
  const [boostTargetId, setBoostTargetId] = useState(null);
  const [boostPickerVisible, setBoostPickerVisible] = useState(false);
  const proximityRef = useRef({ location: null, loops: [], radiusMiles: 1.5 });
  const pendingNotificationRef = useRef(null);

  // Map
  const [selectedMapLoopId, setSelectedMapLoopId] = useState(null);
  const [mapRegion, setMapRegion] = useState(null);
  const [followUser, setFollowUser] = useState(true);

  // Loop+ composer
  const [lpComposerVisible, setLpComposerVisible] = useState(false);
  const [lpComposerKind, setLpComposerKind] = useState("free"); // free|hire|toolshare|urgent
  const [lpTitle, setLpTitle] = useState("");
  const [lpDetails, setLpDetails] = useState("");
  const [lpTimeKey, setLpTimeKey] = useState("24h");
  const [lpRadius, setLpRadius] = useState(5);
  const [lpImages, setLpImages] = useState([]);
  const [lpExistingImages, setLpExistingImages] = useState([]);
  const [lpEditing, setLpEditing] = useState(null);
  const [lpUploading, setLpUploading] = useState(false);
  const [lpLoading, setLpLoading] = useState(false);
  const [followingIds, setFollowingIds] = useState([]);
  const [followingProfiles, setFollowingProfiles] = useState([]);
  const [lpUploadProgress, setLpUploadProgress] = useState({ index: 0, total: 0 });

  // Loop+ subscription modal
  const [lpPlansVisible, setLpPlansVisible] = useState(false);
  const [boostShopVisible, setBoostShopVisible] = useState(false);
  const [boostProducts, setBoostProducts] = useState({});
  const [rcConfigured, setRcConfigured] = useState(false);
  const [rcDebug, setRcDebug] = useState({
    offerings: [],
    entitlements: [],
    lastResult: null,
    lastError: null,
  });
  const [rcPricing, setRcPricing] = useState(DEFAULT_PRICING);
  const [rcPlanMeta, setRcPlanMeta] = useState({
    monthly: { title: "Loop+ Monthly", length: "1 month" },
    yearly: { title: "Loop+ Yearly", length: "12 months" },
  });

  // Orbs
  const orbA = useRef(new Animated.Value(0)).current;
  const orbB = useRef(new Animated.Value(0)).current;
  const orbC = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(LOCAL_LOOPPLUS_KEY)
      .then((value) => {
        if (!active) return;
        setLocalLoopPlus(value === "true");
      })
      .catch(() => {});
    AsyncStorage.getItem(LOCAL_LOOPPLUS_PLAN_KEY)
      .then((value) => {
        if (!active) return;
        setLocalPlanKey(value || null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    syncRevenueCatEntitlements("startup").catch(() => {});
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    syncRevenueCatEntitlements("session").catch(() => {});
  }, [session?.user?.id]);

  useEffect(() => {
    fetchBoostBalance().catch(() => {});
  }, [session?.user?.id]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        syncRevenueCatEntitlements("foreground").catch(() => {});
      }
    });
    return () => {
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!__DEV__) return;
    if (!lpPlansVisible) return;
    refreshRcDebug();
  }, [lpPlansVisible]);

  useEffect(() => {
    if (!boostShopVisible) return;
    refreshBoostProducts();
  }, [boostShopVisible]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const loaded = await loadStore();
      if (mounted) {
        setStore(loaded);
        setHydrating(false);
      }
      const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (!seen && mounted && !session?.user) {
        setOnboardingStep(0);
        setOnboardingVisible(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      if (!session?.user) {
        setProfile(null);
        return;
      }
      const db = await loadLocalDb();
      const fallbackName =
        session?.user?.user_metadata?.display_name ||
        session?.user?.email ||
        "Neighbor";
      let prof = (db.profiles ?? []).find((p) => p.id === session.user.id) ?? null;
      if (!prof) {
        prof = {
          id: session.user.id,
          display_name: fallbackName,
          is_loop_plus: false,
          plan_key: null,
          trust_score: 0,
        };
        await updateLocalDb((next) => ({
          ...next,
          profiles: [...(next.profiles ?? []), prof],
        }));
      }
      const desiredName =
        session?.user?.user_metadata?.display_name ||
        prof.display_name ||
        session?.user?.email ||
        "Neighbor";
      if (prof.display_name !== desiredName) {
        prof = { ...prof, display_name: desiredName };
        await updateLocalDb((next) => ({
          ...next,
          profiles: (next.profiles ?? []).map((p) => (p.id === prof.id ? prof : p)),
        }));
      }
      if (!active) return;
      setProfile(prof);
    };
    loadProfile();
    return () => {
      active = false;
    };
  }, [session?.user?.id, session?.user?.user_metadata?.display_name]);

  useEffect(() => {
    let mounted = true;
    const initSession = async () => {
      if (supabase) {
        try {
          const { data } = await supabase.auth.getSession();
          const user = data?.session?.user ?? null;
          if (user) {
            const profileRow = await fetchSupabaseProfile(user);
            const fallbackProfile = profileRow ?? {
              id: user.id,
              display_name: user.user_metadata?.display_name ?? user.email ?? "",
              is_loop_plus: false,
              plan_key: null,
              trust_score: 0,
            };
            const localProfile = await syncProfileToLocalDb(fallbackProfile);
            const sessionValue = makeSession(user, localProfile);
            await saveLocalSession(sessionValue);
            if (!mounted) return;
            setSession(sessionValue);
          } else {
            const localSession = await loadLocalSession();
            if (!mounted) return;
            setSession(localSession);
          }
        } catch {
          const localSession = await loadLocalSession();
          if (!mounted) return;
          setSession(localSession);
        }
      } else {
        const localSession = await loadLocalSession();
        if (!mounted) return;
        setSession(localSession);
      }
      if (mounted) setAuthLoading(false);
    };

    initSession();

    let authSub = null;
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (_event, authSession) => {
        const user = authSession?.user ?? null;
        if (user) {
          const profileRow = await fetchSupabaseProfile(user);
          const fallbackProfile = profileRow ?? {
            id: user.id,
            display_name: user.user_metadata?.display_name ?? user.email ?? "",
            is_loop_plus: false,
            plan_key: null,
            trust_score: 0,
          };
          const localProfile = await syncProfileToLocalDb(fallbackProfile);
          const sessionValue = makeSession(user, localProfile);
          await saveLocalSession(sessionValue);
          if (mounted) setSession(sessionValue);
        } else {
          await saveLocalSession(null);
          if (mounted) setSession(null);
        }
        if (mounted) setAuthLoading(false);
      });
      authSub = data?.subscription ?? null;
    }
    return () => {
      mounted = false;
      authSub?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    AsyncStorage.setItem(ONBOARDING_KEY, "done").catch(() => {});
    setOnboardingVisible(false);
    setChatModalVisible(false);
    setLpComposerVisible(false);
    setLpPlansVisible(false);
    setImageViewerVisible(false);
    setLegalModalVisible(false);
    setAboutVisible(false);
    setTipsVisible(false);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user || !store || modalsClearedRef.current) return;
    modalsClearedRef.current = true;
    setOnboardingVisible(false);
    setChatModalVisible(false);
    setLpComposerVisible(false);
    setLpPlansVisible(false);
    setImageViewerVisible(false);
    setLegalModalVisible(false);
    setAboutVisible(false);
    setTipsVisible(false);
  }, [session?.user?.id, store]);

  useEffect(() => {
    let isMounted = true;
    let watchSub = null;

    const startLocationWatch = async () => {
      if (!Location) return;
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm?.status !== "granted") return;

        watchSub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 15000,
            distanceInterval: 50,
          },
          (pos) => {
            if (!isMounted) return;
            const coords = pos?.coords;
            setStore((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                location: {
                  ...prev.location,
                  label: "",
                  updatedAt: now(),
                  lat: coords?.latitude ?? prev.location.lat ?? null,
                  lon: coords?.longitude ?? prev.location.lon ?? null,
                },
              };
            });
          }
        );
      } catch (e) {}
    };

    startLocationWatch();

    return () => {
      isMounted = false;
      if (watchSub && typeof watchSub.remove === "function") {
        watchSub.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (!store) return;
    const pricing = store.settings?.pricing ?? {};
    if (
      pricing.monthly !== DEFAULT_PRICING.monthly ||
      pricing.yearly !== DEFAULT_PRICING.yearly
    ) {
      setStore((prev) => ({
        ...prev,
        settings: { ...prev.settings, pricing: DEFAULT_PRICING },
      }));
    }
  }, [store?.settings?.pricing?.monthly, store?.settings?.pricing?.yearly]);

  useEffect(() => {
    let alive = true;
    const configureBackground = async () => {
      if (!alive || !Location || !TaskManager) return;
      const enabled = !!store?.settings?.proximityAlertsEnabled;
      if (!isLoopPlus || !enabled) {
        try {
          const started = await Location.hasStartedLocationUpdatesAsync(PROXIMITY_TASK);
          if (started) await Location.stopLocationUpdatesAsync(PROXIMITY_TASK);
        } catch {}
        return;
      }

      try {
        if (Notifications?.requestPermissionsAsync) {
          await Notifications.requestPermissionsAsync();
        }
        const fg = await Location.requestForegroundPermissionsAsync();
        if (fg?.status !== "granted") return;
        const bg = await Location.requestBackgroundPermissionsAsync();
        if (bg?.status !== "granted") return;
        const started = await Location.hasStartedLocationUpdatesAsync(PROXIMITY_TASK);
        if (!started) {
          await Location.startLocationUpdatesAsync(PROXIMITY_TASK, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: ALERT_COOLDOWN_MS,
            distanceInterval: 50,
            showsBackgroundLocationIndicator: true,
            pausesUpdatesAutomatically: false,
          });
        }
      } catch {}
    };
    configureBackground();
    return () => {
      alive = false;
    };
  }, [isLoopPlus, store?.settings?.proximityAlertsEnabled]);

  useEffect(() => {
    if (!isLoopPlus || !store?.settings?.proximityAlertsEnabled) return () => {};
    const tick = () => {
      const snapshot = proximityRef.current;
      const loc = snapshot?.location;
      if (!isValidCoord(loc?.lat) || !isValidCoord(loc?.lon)) return;
      handleProximityAlerts({
        latitude: loc.lat,
        longitude: loc.lon,
        loops: snapshot.loops ?? [],
        radiusMiles: snapshot.radiusMiles ?? 1.5,
      });
    };
    tick();
    const id = setInterval(tick, ALERT_COOLDOWN_MS);
    return () => clearInterval(id);
  }, [isLoopPlus, store?.settings?.proximityAlertsEnabled]);

  useEffect(() => {
    if (!followUser) return;
    const lat = store?.location?.lat;
    const lon = store?.location?.lon;
    if (!isValidCoord(lat) || !isValidCoord(lon)) return;
    setMapRegion({
      latitude: lat,
      longitude: lon,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    });
  }, [store?.location?.lat, store?.location?.lon, followUser]);

  useEffect(() => {
    let active = true;
    const fetchLoops = async () => {
      let data = [];
      let profilesById = {};
      let supabaseOk = false;
      if (supabase) {
        const { data: rows, error } = await supabase
          .from("loops")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error) {
          data = rows ?? [];
          supabaseOk = true;
        }
        const ids = [...new Set((data ?? []).map((row) => row.user_id).filter(Boolean))];
        if (ids.length) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id,display_name,trust_score")
            .in("id", ids);
          profilesById = (profiles ?? []).reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {});
        }
      }
      const db = await loadLocalDb();
      const local = [...(db.loops ?? [])].sort((a, b) => {
        const at = a?.created_at ? new Date(a.created_at).getTime() : 0;
        const bt = b?.created_at ? new Date(b.created_at).getTime() : 0;
        return bt - at;
      });
      if (!supabaseOk) {
        data = local;
      } else if (local.length) {
        const byId = new Map((data ?? []).map((row) => [row?.id, row]));
        local.forEach((row) => {
          if (!byId.has(row?.id)) byId.set(row?.id, row);
        });
        data = Array.from(byId.values());
      }
      const localProfiles = (db?.profiles ?? []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {});
      profilesById = { ...localProfiles, ...profilesById };
      if (!active) return;
      const baseLat = store?.location?.lat;
      const baseLon = store?.location?.lon;
      const mapped = (data ?? []).map((row) => {
        const normalizedType =
          typeof row.type === "string" ? row.type.toLowerCase() : "info";
        const dist = distanceMilesBetween(baseLat, baseLon, row.lat, row.lon);
        const authorProfile =
          profilesById[row.owner_id] ?? profilesById[row.user_id] ?? null;
        return {
          id: row.id,
          userId: row.owner_id ?? row.user_id ?? null,
          type: normalizedType,
          title: row.title,
          details: row.details ?? "",
          createdAt: row.created_at ? new Date(row.created_at).getTime() : now(),
          expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : now(),
          boostedAt: row.boosted_at ? new Date(row.boosted_at).getTime() : null,
          radiusMiles: row.radius_miles ?? 5,
          timeWindowKey: "1h",
          distanceMiles: typeof dist === "number" ? Math.round(dist * 10) / 10 : row.distance_miles ?? null,
          author: displayNameOrFallback(row.author ?? authorProfile?.display_name),
          trustScore: row.author_trust_score ?? authorProfile?.trust_score ?? 0,
          locationLabel: row.location_label ?? "Near you",
          lat: row.lat ?? null,
          lon: row.lon ?? null,
        };
      });
      setStore((prev) => {
        if (!prev) return prev;
        return { ...prev, loops: cleanExpiredLoops(mapped) };
      });
    };
    fetchLoops();
    return () => {
      active = false;
    };
  }, [session?.user?.id, store?.location?.lat, store?.location?.lon]);

  useEffect(() => {
    fetchThreads();
  }, [session?.user?.id]);

  useEffect(() => {
    let active = true;
    const loadMessages = async () => {
      if (!session?.user || !selectedThreadId) {
        setSelectedThreadMessages([]);
        return;
      }
      let data = [];
      if (supabase) {
        const { data: rows } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("thread_id", selectedThreadId)
          .order("created_at", { ascending: true });
        data = rows ?? [];
      } else {
        const db = await loadLocalDb();
        data = (db.messages ?? [])
          .filter((msg) => msg.thread_id === selectedThreadId)
          .sort((a, b) => {
            const at = a?.created_at ? new Date(a.created_at).getTime() : 0;
            const bt = b?.created_at ? new Date(b.created_at).getTime() : 0;
            return at - bt;
          });
      }
      if (!active) return;
      const mapped = (data ?? []).map((msg) => ({
        id: msg.id,
        fromMe: msg.sender_id === session.user.id,
        text: msg.body,
        at: msg.created_at ? new Date(msg.created_at).getTime() : now(),
      }));
      setSelectedThreadMessages(mapped);
    };
    loadMessages();
    return () => {
      active = false;
    };
  }, [session?.user?.id, selectedThreadId]);

  useEffect(() => {
    return () => {};
  }, [session?.user?.id, selectedThreadId]);

  useEffect(() => {
    const lat = store?.location?.lat;
    const lon = store?.location?.lon;
    if (!isValidCoord(lat) || !isValidCoord(lon)) return;
    setStore((prev) => {
      if (!prev) return prev;
      let updated = false;
      const loops = (prev.loops ?? []).map((loop) => {
        if (isValidCoord(loop.lat) && isValidCoord(loop.lon)) return loop;
        const jittered = jitterCoords(lat, lon);
        updated = true;
        return {
          ...loop,
          lat: isValidCoord(jittered.lat) ? jittered.lat : null,
          lon: isValidCoord(jittered.lon) ? jittered.lon : null,
          locationLabel: loop.locationLabel ?? prev.location?.label ?? "Near you",
        };
      });
      if (!updated) return prev;
      return { ...prev, loops };
    });
  }, [store?.location?.lat, store?.location?.lon]);

  useEffect(() => {
    if (!store || hydrating) return;
    saveStore(store).catch(() => {});
  }, [store, hydrating]);

  // Auto-expire loop cleanup
  useEffect(() => {
    if (!store) return;
    const id = setInterval(() => {
      setStore((prev) => {
        if (!prev) return prev;
        const cleaned = cleanExpiredLoops(prev.loops);
        if (cleaned.length === prev.loops.length) return prev;
        return { ...prev, loops: cleaned };
      });
    }, 15000);
    return () => clearInterval(id);
  }, [store?.loops?.length]);

  // Orb animation loops
  useEffect(() => {
    const loop = (val, dur) => {
      val.setValue(0);
      Animated.loop(
        Animated.timing(val, {
          toValue: 1,
          duration: dur,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        })
      ).start();
    };
    loop(orbA, 5200);
    loop(orbB, 7400);
    loop(orbC, 6100);
  }, [orbA, orbB, orbC]);

  // Keep sortAnim in sync
  useEffect(() => {
    if (!store) return;
    Animated.timing(sortAnim, { toValue: store.feed.sortMode === "recent" ? 1 : 0, duration: 220, useNativeDriver: false }).start();
  }, [store?.feed?.sortMode]);

  const signedIn = !!session?.user;
  const isAdmin = !!session?.user?.id && ADMIN_UIDS.includes(session.user.id);  
  const isLoopPlus = !!profile?.is_loop_plus || isAdmin || localLoopPlus;
  const lpSection = store?.loopPlusUI?.section ?? "upgrade";
  const storeReady = !!store;
  const followingSet = useMemo(() => new Set(followingIds ?? []), [followingIds]);

  const fetchFollowing = async () => {
    if (!session?.user) {
      setFollowingIds([]);
      setFollowingProfiles([]);
      return;
    }
    const db = await loadLocalDb();
    const data = (db.follows ?? []).filter((row) => row.follower_id === session.user.id);
    const ids = (data ?? []).map((row) => row.following_id);
    setFollowingIds(ids);
    if (!ids.length) {
      setFollowingProfiles([]);
      return;
    }
    const profileRows = (db.profiles ?? []).filter((p) => ids.includes(p.id));
    setFollowingProfiles(profileRows ?? []);
  };

  const fetchLoopPlusPosts = async () => {
    if (!session?.user || !store) return;
    setLpLoading(true);
    let data = [];
    let supabaseOk = false;
    if (supabase) {
      try {
        const { data: rows, error } = await supabase
          .from("loopplus_posts")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error) {
          data = rows ?? [];
          supabaseOk = true;
        }
      } catch {}
    }
    const db = await loadLocalDb();
    const local = [...(db.loopplus_posts ?? [])].sort((a, b) => {
      const at = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const bt = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return bt - at;
    });
    if (!supabaseOk) {
      data = local;
    } else if (local.length) {
      const byId = new Map((data ?? []).map((row) => [row?.id, row]));
      local.forEach((row) => {
        if (!byId.has(row?.id)) byId.set(row?.id, row);
      });
      data = Array.from(byId.values());
    }
    setLpLoading(false);
    const mapped = (data ?? []).map(mapLoopPlusRow).filter(Boolean);
    const freeItems = mapped.filter((it) => it.kind === "free");
    const hireTasks = mapped.filter((it) => it.kind === "hire");
    const toolShareItems = mapped.filter((it) => it.kind === "toolshare");
    const urgentItems = mapped.filter((it) => it.kind === "urgent");
    setStore((prev) => {
      if (!prev) return prev;
      return { ...prev, loopPlusData: { freeItems, hireTasks, toolShareItems, urgentItems } };
    });
  };

  useEffect(() => {
    setStore((prev) => {
      if (!prev) return prev;
      if (prev.settings.loopPlus === isLoopPlus) return prev;
      return { ...prev, settings: { ...prev.settings, loopPlus: isLoopPlus } };
    });
  }, [isLoopPlus]);

  useEffect(() => {
    if (!store) return;
    const userId = session?.user?.id ?? null;
    setStore((prev) => {
      if (!prev) return prev;
      const nextUsage = normalizeUsage(prev.usage, userId);
      if (
        nextUsage.dayKey === prev.usage?.dayKey &&
        nextUsage.postsToday === prev.usage?.postsToday &&
        nextUsage.threadsToday === prev.usage?.threadsToday &&
        nextUsage.userId === prev.usage?.userId
      ) {
        return prev;
      }
      return { ...prev, usage: nextUsage };
    });
  }, [session?.user?.id, store]);

  useEffect(() => {
    fetchLoopPlusPosts();
  }, [session?.user?.id, isLoopPlus, storeReady]);

  useEffect(() => {
    fetchFollowing();
  }, [session?.user?.id]);

  const selectedThread = useMemo(() => {
    if (!selectedThreadId) return null;
    return chatThreads.find((t) => t.id === selectedThreadId) ?? null;
  }, [selectedThreadId, chatThreads]);

  const loopsForFeed = useMemo(() => {
    if (!store) return [];
    const t = now();
    const lpItemsRaw = [
      ...(store?.loopPlusData?.freeItems ?? []),
      ...(store?.loopPlusData?.hireTasks ?? []),
      ...(store?.loopPlusData?.toolShareItems ?? []),
      ...(store?.loopPlusData?.urgentItems ?? []),
    ]
      .map(loopPlusItemToLoop)
      .filter(Boolean);
    const lpItems = lpItemsRaw.map((item) => ({
      ...item,
      isLocked: !isLoopPlus,
    }));
    let items = cleanExpiredLoops([...(store.loops ?? []), ...lpItems]);

    if (store.feed.filter !== "all")
      items = items.filter((p) => p.isLoopPlus || p.type === store.feed.filter);

    const rad = store.feed.radiusMiles ?? 5;
    items = items.filter((p) => (typeof p.distanceMiles === "number" ? p.distanceMiles <= rad : true));

    const boostedLast = (a, b) => (a.boostedAt ?? 0) - (b.boostedAt ?? 0);
    if (store.feed.sortMode === "recent") {
      items = [...items].sort((a, b) => boostedLast(a, b) || (b.createdAt ?? 0) - (a.createdAt ?? 0));
    } else {
      items = [...items].sort((a, b) => boostedLast(a, b) || (a.distanceMiles ?? 999) - (b.distanceMiles ?? 999));
    }

    return items.map((p) => ({ ...p, _age: t - (p.createdAt ?? t) }));
  }, [store?.loops, store?.loopPlusData, isLoopPlus, store?.feed?.filter, store?.feed?.radiusMiles, store?.feed?.sortMode]);

  const loopPlusMapItems = useMemo(() => {
    if (!store || !isLoopPlus) return [];
    const freeItems = store?.loopPlusData?.freeItems ?? [];
    const hireItems = store?.loopPlusData?.hireTasks ?? [];
    const toolShareItems = store?.loopPlusData?.toolShareItems ?? [];
    const urgentItems = store?.loopPlusData?.urgentItems ?? [];
    return [...freeItems, ...hireItems, ...toolShareItems, ...urgentItems]
      .map(loopPlusItemToLoop)
      .filter(Boolean);
  }, [store?.loopPlusData, isLoopPlus]);

  const mapLoops = useMemo(() => {
    if (!store) return [];
    if (!isLoopPlus) return store.loops ?? [];
    return [...(store.loops ?? []), ...loopPlusMapItems];
  }, [store?.loops, loopPlusMapItems, isLoopPlus]);

  const selectedMapLoop = useMemo(() => {
    if (!selectedMapLoopId) return null;
    return mapLoops?.find((l) => l.id === selectedMapLoopId) ?? null;
  }, [selectedMapLoopId, mapLoops]);

  useEffect(() => {
    if (selectedMapLoopId && !selectedMapLoop) {
      setSelectedMapLoopId(null);
    }
  }, [selectedMapLoopId, selectedMapLoop]);

  useEffect(() => {
    proximityRef.current = {
      location: store?.location ?? null,
      loops: mapLoops ?? [],
      radiusMiles: store?.settings?.alertRadiusMiles ?? 1.5,
    };
  }, [store?.location, mapLoops, store?.settings?.alertRadiusMiles]);

  useEffect(() => {
    if (!storeReady) return;
    const pending = pendingNotificationRef.current;
    if (!pending) return;
    applyNotificationRoute(pending);
    pendingNotificationRef.current = null;
  }, [storeReady, mapLoops]);

  useEffect(() => {
    if (!Notifications?.addNotificationResponseReceivedListener) return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data;
      handleNotificationData(data);
    });
    if (Notifications.getLastNotificationResponseAsync) {
      Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          const data = response?.notification?.request?.content?.data;
          if (data) handleNotificationData(data);
        })
        .catch(() => {});
    }
    return () => {
      sub.remove();
    };
  }, [storeReady]);

  function setTab(tabKey) {
    setActiveTab(tabKey);
  }

  function openLoopPlusSection(sectionKey) {
    setStore((prev) => {
      if (!prev) return prev;
      const unlocked = isLoopPlus;
      const nextSection = unlocked ? sectionKey : "upgrade";
      return { ...prev, loopPlusUI: { ...prev.loopPlusUI, section: nextSection } };
    });
    setActiveTab("loopplus");
  }

  function trackEvent(name, props = {}) {
    if (!supabase || !session?.user?.id) return;
    supabase
      .from("analytics_events")
      .insert({
        user_id: session.user.id,
        name,
        props,
      })
      .then(() => {})
      .catch(() => {});
  }

  function openPaywall(source) {
    openLoopPlusSection("upgrade");
    setLpPlansVisible(true);
    trackEvent("paywall_opened", { source });
  }

  function openBoostShop(source) {
    setBoostShopVisible(true);
    trackEvent("boost_shop_opened", { source });
  }

  async function fetchThreads() {
    if (!session?.user) return;
    if (supabase) {
      const me = session.user.id;
      const { data: threads } = await supabase
        .from("chat_threads")
        .select("*")
        .or(`a_id.eq.${me},b_id.eq.${me}`)
        .order("created_at", { ascending: false });
      const ids = (threads ?? []).map((t) => t.id);
      const loopIds = [...new Set((threads ?? []).map((t) => t.loop_id).filter(Boolean))];
      const loopPlusIds = [...new Set((threads ?? []).map((t) => t.loopplus_id).filter(Boolean))];
      let loopsById = {};
      if (loopIds.length) {
        const { data: loops } = await supabase
          .from("loops")
          .select("id,title,type")
          .in("id", loopIds);
        loopsById = (loops ?? []).reduce((acc, l) => {
          acc[l.id] = l;
          return acc;
        }, {});
      }
      let loopPlusById = {};
      if (loopPlusIds.length) {
        const { data: lp } = await supabase
          .from("loopplus_posts")
          .select("id,title,kind")
          .in("id", loopPlusIds);
        loopPlusById = (lp ?? []).reduce((acc, row) => {
          acc[row.id] = {
            id: row.id,
            title: row.title,
            type: `loopplus_${row.kind ?? "free"}`,
          };
          return acc;
        }, {});
      }
      let lastByThread = {};
      if (ids.length) {
        const { data: msgs } = await supabase
          .from("chat_messages")
          .select("*")
          .in("thread_id", ids)
          .order("created_at", { ascending: false });
        (msgs ?? []).forEach((m) => {
          if (!lastByThread[m.thread_id]) lastByThread[m.thread_id] = m;
        });
      }
      const data = (threads ?? []).map((t) => ({
        ...t,
        last_message: lastByThread[t.id]?.body ?? null,
        last_message_at: lastByThread[t.id]?.created_at ?? null,
        loops: loopsById[t.loop_id]
          ? { id: loopsById[t.loop_id].id, title: loopsById[t.loop_id].title, type: loopsById[t.loop_id].type }
          : loopPlusById[t.loopplus_id]
          ? { id: loopPlusById[t.loopplus_id].id, title: loopPlusById[t.loopplus_id].title, type: loopPlusById[t.loopplus_id].type }
          : null,
      }));
      setChatThreads(data ?? []);
      return;
    }
    const db = await loadLocalDb();
    const data = (db.threads ?? [])
      .filter((t) => t.a_id === session.user.id || t.b_id === session.user.id)
      .sort((a, b) => {
        const at = a?.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const bt = b?.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return bt - at;
      })
      .map((t) => {
        const loop = (db.loops ?? []).find((l) => l.id === t.loop_id);
        return {
          ...t,
          loops: loop ? { id: loop.id, title: loop.title, type: loop.type } : null,
        };
      });
    setChatThreads(data ?? []);
  }

  function updateFeed(patch) {
    setStore((prev) => {
      if (!prev) return prev;
      return { ...prev, feed: { ...prev.feed, ...patch } };
    });
  }

  function updateSettings(patch) {
    setStore((prev) => {
      if (!prev) return prev;
      return { ...prev, settings: { ...prev.settings, ...patch } };
    });
  }

  async function finishOnboarding() {
    await AsyncStorage.setItem(ONBOARDING_KEY, "done");
    setOnboardingVisible(false);
  }

  async function toggleFollow(userId) {
    if (!session?.user || !userId || userId === session.user.id) return;
    const isFollowing = followingSet.has(userId);
    if (isFollowing) {
      await updateLocalDb((next) => ({
        ...next,
        follows: (next.follows ?? []).filter(
          (row) => !(row.follower_id === session.user.id && row.following_id === userId)
        ),
      }));
    } else {
      await updateLocalDb((next) => ({
        ...next,
        follows: [
          ...(next.follows ?? []),
          { follower_id: session.user.id, following_id: userId },
        ],
      }));
    }
    fetchFollowing();
  }

  async function updateDisplayName(nextName) {
    if (!session?.user || !nextName) return;
    const db = await loadLocalDb();
    const currentProfile = (db.profiles ?? []).find((p) => p.id === session.user.id) ?? null;
    if (!currentProfile) {
      Alert.alert("Update failed", "Unable to check display name.");
      return;
    }
    if (currentProfile?.display_name && !looksLikeEmail(currentProfile.display_name)) {
      Alert.alert("Name locked", "Display names cannot be changed once set.");
      return;
    }
    const displayName = nextName.trim();
    if (!displayName) return;
    if (containsProfanity(displayName)) {
      Alert.alert("Name blocked", "Display name contains blocked words.");
      return;
    }
    const normalized = displayName.toLowerCase();
    const exists = (db.profiles ?? []).some(
      (p) => p.display_name?.toLowerCase?.() === normalized && p.id !== session.user.id
    );
    if (exists) {
      Alert.alert("Name taken", "That display name is already taken.");
      return;
    }
    await updateLocalDb((next) => ({
      ...next,
      profiles: (next.profiles ?? []).map((p) =>
        p.id === session.user.id ? { ...p, display_name: displayName } : p
      ),
    }));
    const nextSession = {
      ...session,
      user: {
        ...session.user,
        user_metadata: { ...(session.user.user_metadata ?? {}), display_name: displayName },
      },
    };
    await saveLocalSession(nextSession);
    setSession(nextSession);
    setProfile((prev) => (prev ? { ...prev, display_name: displayName } : prev));
    setStore((prev) => {
      if (!prev) return prev;
      const loops = (prev.loops ?? []).map((loop) =>
        loop.userId === session.user.id ? { ...loop, author: displayName } : loop
      );
      return { ...prev, loops };
    });
  }

  function toggleLoopAccept(loopId, key) {
    setStore((prev) => {
      if (!prev) return prev;
      const current = prev.loopAccepts?.[loopId] ?? { meAccepted: false, otherAccepted: false };
      return {
        ...prev,
        loopAccepts: {
          ...prev.loopAccepts,
          [loopId]: { ...current, [key]: !current[key] },
        },
      };
    });
  }

  function openDirections(loop) {
    const lat = loop?.lat;
    const lon = loop?.lon;
      if (!isValidCoord(lat) || !isValidCoord(lon)) {
        Alert.alert("Location unavailable", "This loop does not have a valid location yet.");
        return;
    }
    const url =
      Platform.OS === "ios"
        ? `http://maps.apple.com/?daddr=${lat},${lon}`
        : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Maps unavailable", "Unable to open directions on this device.");
    });
  }

  async function refreshLocation() {
    if (!Location) {
      Alert.alert(
        "Location not installed",
        "To request real location, install expo-location.\n\nRun:\n  npx expo install expo-location"
      );
      return;
    }

    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm?.status !== "granted") {
        Alert.alert("Location denied", "Enable location permissions to update your position.");
        return;
      }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = pos?.coords;

      setStore((prev) => {
        if (!prev) return prev;
        const updatedLocation = {
          ...prev.location,
          label: "Current location",
          updatedAt: now(),
          lat: coords?.latitude ?? prev.location.lat ?? null,
          lon: coords?.longitude ?? prev.location.lon ?? null,
        };
        return { ...prev, location: updatedLocation };
      });
    } catch (e) {
      Alert.alert("Location unavailable", "Unable to fetch your current location.");
      }
    }

    function deleteLoop(loop) {
      if (!loop?.id) return;
      Alert.alert("Delete loop?", "This removes your loop for everyone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (supabase && session?.user?.id) {
              const { error } = await supabase
                .from("loops")
                .delete()
                .eq("id", loop.id)
                .eq("user_id", session.user.id);
              if (error) {
                Alert.alert("Delete failed", "We couldn't delete that loop. Please try again.");
                return;
              }
            }
            await updateLocalDb((next) => ({
              ...next,
              loops: (next.loops ?? []).filter((l) => l.id !== loop.id),
            }));
            setStore((prev) => {
              if (!prev) return prev;
              const nextLoops = (prev.loops ?? []).filter((l) => l.id !== loop.id);
              return { ...prev, loops: nextLoops };
            });
            trackEvent("loop_deleted", { loopId: loop.id });
          },
        },
      ]);
    }

    function startEditLoop(loop) {
      if (!loop?.id) return;
      setEditingLoop(loop);
      setNewType(loop.type ?? "need");
      setNewTitle(loop.title ?? "");
      setNewDetails(loop.details ?? "");
      setNewTimeKey(loop.timeWindowKey ?? "1h");
      setNewRadius(loop.radiusMiles ?? 5);
      setActiveTab("new");
    }

    function cancelEditLoop() {
      setEditingLoop(null);
      setNewTitle("");
      setNewDetails("");
      setNewType("need");
      setNewTimeKey("1h");
      setNewRadius(5);
    }

    function cancelNewLoop() {
      setEditingLoop(null);
      setNewTitle("");
      setNewDetails("");
      setNewType("need");
      setNewTimeKey("1h");
      setNewRadius(5);
      setActiveTab("feed");
    }

    function openImageViewer(uri) {
      if (!uri) return;
      setImageViewerUri(uri);
      setImageViewerVisible(true);
    }

    function applyNotificationRoute(data) {
      if (!data) return;
      const kind = data?.type ?? "";
      if (kind === "chat" && data.threadId) {
        setActiveTab("chats");
        setSelectedThreadId(data.threadId);
        setChatModalVisible(true);
        return;
      }
      if ((kind === "loop" || kind === "loopplus") && data.loopId) {
        setActiveTab("map");
        setSelectedMapLoopId(data.loopId);
        return;
      }
      if (kind === "follow") {
        setActiveTab("profile");
        return;
      }
      if (data.loopId) {
        setActiveTab("map");
        setSelectedMapLoopId(data.loopId);
      }
    }

    function handleNotificationData(data) {
      if (!data) return;
      pendingNotificationRef.current = data;
      if (!storeReady) return;
      applyNotificationRoute(data);
      pendingNotificationRef.current = null;
    }

  function toggleSort() {
    if (!store) return;
    updateFeed({ sortMode: store.feed.sortMode === "near" ? "recent" : "near" });
  }

    async function postNewLoop() {
      if (!store) return;
      if (!session?.user) {
        Alert.alert("Sign in required", "Please sign in to post a loop.");
        return;
      }

      if (editingLoop?.id) {
        const title = newTitle.trim();
        const details = newDetails.trim();
        if (!title) return Alert.alert("Title needed", "Give your loop a short title so people can scan fast.");
        if (!details) return Alert.alert("Details needed", "Add a little context-people love context.");
        const tw = TIME_WINDOWS.find((t) => t.key === newTimeKey) ?? TIME_WINDOWS[1];
        const expiresAt = now() + tw.ms;
        let updatedRow = {
          id: editingLoop.id,
          type: newType,
          title,
          details,
          radius_miles: newRadius,
          expires_at: new Date(expiresAt).toISOString(),
        };
        if (supabase) {
          const { data, error } = await supabase
            .from("loops")
            .update({
              type: updatedRow.type,
              title: updatedRow.title,
              details: updatedRow.details,
              radius_miles: updatedRow.radius_miles,
              expires_at: updatedRow.expires_at,
            })
            .eq("id", editingLoop.id)
            .eq("user_id", session.user.id)
            .select()
            .single();
          if (error) {
            Alert.alert("Save failed", "We couldn't update your loop. Please try again.");
            return;
          }
          if (data?.id) {
            updatedRow = {
              ...updatedRow,
              id: data.id,
              created_at: data.created_at ?? updatedRow.created_at,
              expires_at: data.expires_at ?? updatedRow.expires_at,
            };
          }
        }
        await updateLocalDb((next) => ({
          ...next,
          loops: (next.loops ?? []).map((l) => (l.id === editingLoop.id ? { ...l, ...updatedRow } : l)),
        }));
        setStore((prev) => {
          if (!prev) return prev;
          const nextLoops = (prev.loops ?? []).map((l) =>
            l.id === editingLoop.id
              ? {
                  ...l,
                  type: typeof updatedRow.type === "string" ? updatedRow.type.toLowerCase() : newType,
                  title: updatedRow.title,
                  details: updatedRow.details ?? "",
                  radiusMiles: updatedRow.radius_miles ?? newRadius,
                  expiresAt: updatedRow.expires_at ? new Date(updatedRow.expires_at).getTime() : expiresAt,
                  timeWindowKey: newTimeKey,
                }
              : l
          );
          return { ...prev, loops: nextLoops };
        });
        setEditingLoop(null);
        setNewTitle("");
        setNewDetails("");
        setNewType("need");
        setNewTimeKey("1h");
        setNewRadius(5);
        trackEvent("loop_edited", {
          loopId: editingLoop.id,
          type: newType,
          radiusMiles: newRadius,
          timeWindowKey: newTimeKey,
        });
        setActiveTab("feed");
        return;
      }

      if (!isLoopPlus) {
        const usage = normalizeUsage(store.usage, session?.user?.id ?? null);
        const ownActive = cleanExpiredLoops(store.loops).filter((loop) => loop.userId === session.user.id).length;
        if (ownActive >= FREE_ACTIVE_LOOPS) {
          Alert.alert(
            "Loop+ required",
            `Free users can have up to ${FREE_ACTIVE_LOOPS} active loops at once.`,
            [
              { text: "Not now", style: "cancel" },
              {
                text: "Upgrade",
                onPress: () => {
                  openPaywall("post_limit_active");
                },
              },
            ]
          );
          return;
        }
        if (usage.postsToday >= FREE_POSTS_PER_DAY) {
          Alert.alert(
            "Loop+ required",
            `Free users can post up to ${FREE_POSTS_PER_DAY} loops per day.`,
            [
              { text: "Not now", style: "cancel" },
              {
                text: "Upgrade",
                onPress: () => {
                  openPaywall("post_limit_daily");
                },
              },
            ]
          );
          return;
        }
      }

    const title = newTitle.trim();
    const details = newDetails.trim();
    if (!title) return Alert.alert("Title needed", "Give your loop a short title so people can scan fast.");
    if (!details) return Alert.alert("Details needed", "Add a little context-people love context.");

    const tw = TIME_WINDOWS.find((t) => t.key === newTimeKey) ?? TIME_WINDOWS[1];
    const createdAt = now();
    const expiresAt = createdAt + tw.ms;
      const distanceMiles = Math.round((Math.random() * Math.max(0.4, newRadius - 0.2) + 0.2) * 10) / 10;
      const baseLat = store.location?.lat;
      const baseLon = store.location?.lon;
      const jittered = jitterCoords(baseLat, baseLon);
      if (!isValidCoord(baseLat) || !isValidCoord(baseLon)) {
        Alert.alert(
          "Location not ready",
          "Your loop will post, but it will not appear on the map until location is available."
        );
      }

    const baseRow = {
      user_id: session.user.id,
      type: newType,
      title,
      details,
      created_at: new Date(createdAt).toISOString(),
      expires_at: new Date(expiresAt).toISOString(),
      boosted_at: null,
      radius_miles: newRadius,
      is_public: true,
      location_label: store.location?.label ?? "Near you",
      lat: isValidCoord(jittered.lat) ? jittered.lat : null,
      lon: isValidCoord(jittered.lon) ? jittered.lon : null,
      author: displayNameOrFallback(
        profile?.display_name ?? session?.user?.user_metadata?.display_name ?? ""
      ),
      author_trust_score: profile?.trust_score ?? 0,
    };
    let newRow = { ...baseRow, id: uid("loop"), owner_id: session.user.id };
    if (supabase) {
      const { data, error } = await supabase
        .from("loops")
        .insert(baseRow)
        .select()
        .single();
      if (error || !data?.id) {
        Alert.alert("Post failed", error?.message ?? "We couldn't save your loop. Please try again.");
        return;
      }
      newRow = {
        ...baseRow,
        id: data.id,
        owner_id: data.user_id ?? baseRow.user_id,
        created_at: data.created_at ?? baseRow.created_at,
        expires_at: data.expires_at ?? baseRow.expires_at,
      };
    }
    await updateLocalDb((next) => ({
      ...next,
      loops: [newRow, ...(next.loops ?? [])],
    }));
    const post = {
      id: newRow.id,
      userId: newRow.owner_id ?? null,
      type: typeof newRow.type === "string" ? newRow.type.toLowerCase() : "info",
      title: newRow.title,
      details: newRow.details ?? "",
      createdAt: newRow.created_at ? new Date(newRow.created_at).getTime() : createdAt,
      expiresAt: newRow.expires_at ? new Date(newRow.expires_at).getTime() : expiresAt,
      boostedAt: newRow.boosted_at ? new Date(newRow.boosted_at).getTime() : null,
      radiusMiles: newRow.radius_miles ?? newRadius,
      timeWindowKey: newTimeKey,
      distanceMiles,
      lat: newRow.lat ?? null,
      lon: newRow.lon ?? null,
      author: displayNameOrFallback(
        profile?.display_name ?? session?.user?.user_metadata?.display_name ?? ""
      ),
      trustScore: profile?.trust_score ?? 0,
      locationLabel: newRow.location_label ?? store.location?.label ?? "Near you",
    };
    setStore((prev) => ({
      ...prev,
      loops: [post, ...(prev?.loops ?? [])],
      stats: { ...prev.stats, loops: (prev.stats.loops ?? 0) + 1, postsCreated: (prev.stats.postsCreated ?? 0) + 1 },
      usage: {
        ...normalizeUsage(prev?.usage, session?.user?.id ?? null),
        postsToday:
          (normalizeUsage(prev?.usage, session?.user?.id ?? null)?.postsToday ?? 0) + 1,
      },
    }));

    setNewTitle("");
    setNewDetails("");
    setNewType("need");
    setNewTimeKey("1h");
    setNewRadius(5);
    trackEvent("loop_posted", {
      loopId: post.id,
      type: post.type,
      radiusMiles: post.radiusMiles,
      timeWindowKey: post.timeWindowKey,
    });
    setActiveTab("feed");
  }

    async function ensureThreadForLoop(loop) {
      if (!session?.user) {
        Alert.alert("Sign in required", "Please sign in to message someone.");
        return;
      }
      if (!loop?.userId) {
        Alert.alert("Chat unavailable", "This post is missing an owner.");
        return;
    }
    const me = session.user.id;
    const other = loop.userId;
    let threadId = null;
    const isLoopPlusPost =
      !!loop?.isLoopPlus ||
      !!loop?.loopPlusKind ||
      String(loop?.type ?? "").startsWith("loopplus_");
    if (isLoopPlusPost && !isUuid(loop.id)) {
      Alert.alert("Chat unavailable", "This Loop+ post is still syncing. Please try again in a moment.");
      return;
    }
    if (supabase) {
      const baseQuery = supabase
        .from("chat_threads")
        .select("*")
        .or(`and(a_id.eq.${me},b_id.eq.${other}),and(a_id.eq.${other},b_id.eq.${me})`);
      const { data: existing } = isLoopPlusPost
        ? await baseQuery.eq("loopplus_id", loop.id).maybeSingle()
        : await baseQuery.eq("loop_id", loop.id).maybeSingle();
      threadId = existing?.id ?? null;
    } else {
      const db = await loadLocalDb();
      const existing = (db.threads ?? []).find(
        (t) =>
          (isLoopPlusPost ? t.loopplus_id === loop.id : t.loop_id === loop.id) &&
          ((t.a_id === me && t.b_id === other) || (t.a_id === other && t.b_id === me))
      );
      threadId = existing?.id ?? null;
    }
    if (!threadId) {
        if (!isLoopPlus) {
          const usage = normalizeUsage(store?.usage, session?.user?.id ?? null);
          if ((usage?.threadsToday ?? 0) >= FREE_THREADS_PER_DAY) {
            Alert.alert(
              "Loop+ required",
              `Free users can start up to ${FREE_THREADS_PER_DAY} new chats per day.`,
              [
                { text: "Not now", style: "cancel" },
                {
                text: "Upgrade",
                onPress: () => {
                  openPaywall("thread_limit_daily");
                },
              },
            ]
          );
            return;
          }
        }
        let createdId = uid("thread");
        if (supabase) {
          const { data: created, error: createError } = await supabase
            .from("chat_threads")
            .insert({
              loop_id: isLoopPlusPost ? null : loop.id,
              loopplus_id: isLoopPlusPost ? loop.id : null,
              a_id: me,
              b_id: other,
            })
            .select()
            .single();
          if (createError) {
            Alert.alert("Chat unavailable", createError.message ?? "Unable to start a thread yet.");
            return;
          }
          if (created?.id) createdId = created.id;
        }
        const newThread = {
          id: createdId,
          loop_id: isLoopPlusPost ? null : loop.id,
          loopplus_id: isLoopPlusPost ? loop.id : null,
          a_id: me,
          b_id: other,
          last_message: null,
          last_message_at: null,
        };
        await updateLocalDb((next) => ({
          ...next,
          threads: [newThread, ...(next.threads ?? [])],
        }));
        threadId = createdId;
        trackEvent("chat_thread_created", { loopId: loop.id, otherUserId: other });
        if (threadId) {
          setStore((prev) => ({
            ...prev,
            usage: {
              ...normalizeUsage(prev?.usage, session?.user?.id ?? null),
              threadsToday:
                (normalizeUsage(prev?.usage, session?.user?.id ?? null)?.threadsToday ?? 0) + 1,
            },
          }));
        }
      }
    if (!threadId) {
      Alert.alert("Chat unavailable", "Unable to start a thread yet.");
      return;
    }
    setChatThreads((prev) => {
      const baseThread = {
        id: threadId,
        loop_id: isLoopPlusPost ? null : loop.id,
        loopplus_id: isLoopPlusPost ? loop.id : null,
        a_id: me,
        b_id: other,
        last_message: null,
        last_message_at: null,
        loops: { id: loop.id, title: loop.title ?? "Thread", type: loop.type ?? "info" },
      };
      const filtered = (prev ?? []).filter((t) => t.id !== threadId);
      return [baseThread, ...filtered];
    });
    setSelectedThreadId(threadId);
    fetchThreads();
    setChatModalVisible(true);
    setActiveTab("chats");
  }

  function openThread(threadId) {
    setSelectedThreadId(threadId);
    setChatModalVisible(true);
    setActiveTab("chats");
  }

  async function sendChatReply() {
    if (!session?.user || !selectedThread) return;
    const text = chatDraft.trim();
    if (!text) return;
    const message = {
      id: uid("msg"),
      thread_id: selectedThread.id,
      sender_id: session.user.id,
      body: text,
      created_at: new Date().toISOString(),
    };
    const updatedAt = new Date().toISOString();
    if (supabase) {
      const { data } = await supabase
        .from("chat_messages")
        .insert({
          thread_id: selectedThread.id,
          sender_id: session.user.id,
          body: text,
          created_at: updatedAt,
        })
        .select()
        .single();
      if (data?.id) {
        message.id = data.id;
        message.created_at = data.created_at ?? updatedAt;
      }
    }
    await updateLocalDb((next) => ({
      ...next,
      messages: [...(next.messages ?? []), message],
      threads: (next.threads ?? []).map((t) =>
        t.id === selectedThread.id ? { ...t, last_message: text, last_message_at: updatedAt } : t
      ),
    }));
    setSelectedThreadMessages((prev) => [
      ...(prev ?? []),
      { id: message.id, fromMe: true, text, at: new Date(updatedAt).getTime() },
    ]);
    fetchThreads();
    setChatDraft("");
  }

  async function enableNotifications() {
    if (!store) return;
    let enabled = true;

    if (!Notifications) {
      Alert.alert(
        "Notifications not installed",
        "To request real permission, install expo-notifications.\n\nRun:\n  npx expo install expo-notifications"
      );
    } else {
      try {
        const perm = await Notifications.getPermissionsAsync();
        if (perm?.status !== "granted") {
          const req = await Notifications.requestPermissionsAsync();
          if (req?.status !== "granted") {
            Alert.alert("No permission", "Notifications permission wasn't granted.");
            enabled = false;
          }
        }
      } catch (e) {}
    }

    setStore((prev) => ({ ...prev, settings: { ...prev.settings, notificationsEnabled: enabled } }));
  }

  function signOut() {
    Alert.alert("Sign out", "Sign out of this device?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          if (supabase) {
            try {
              await supabase.auth.signOut();
            } catch {}
          }
          await saveLocalSession(null);
          setSession(null);
        },
      },
    ]);
  }

  function signIn() {
    setAuthMode("signIn");
  }

  async function syncProfileToLocalDb(profileRow) {
    if (!profileRow?.id) return null;
    const db = await loadLocalDb();
    const nextProfile = {
      id: profileRow.id,
      display_name: profileRow.display_name ?? "",
      is_loop_plus: !!profileRow.is_loop_plus,
      plan_key: profileRow.plan_key ?? null,
      trust_score: typeof profileRow.trust_score === "number" ? profileRow.trust_score : 0,
    };
    await saveLocalDb({
      ...db,
      profiles: [
        ...(db.profiles ?? []).filter((p) => p.id !== profileRow.id),
        nextProfile,
      ],
    });
    return nextProfile;
  }

  async function fetchSupabaseProfile(user) {
    if (!supabase || !user?.id) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (error) return null;
    return data ?? null;
  }

  async function handleAuthSubmit() {
    setAuthError("");
    const email = authEmail.trim();
    const password = authPassword;
    if (!email || !password) {
      setAuthError("Email and password are required.");
      return;
    }
    const normalizedEmail = normalizeEmail(email);
    if (authMode === "signUp") {
      const displayName = authDisplayName.trim();
      if (!displayName) {
        setAuthError("Display name is required.");
        return;
      }
      if (containsProfanity(displayName)) {
        setAuthError("Display name contains blocked words.");
        return;
      }
      if (supabase) {
        const { data: available, error: nameErr } = await supabase.rpc(
          "is_display_name_available",
          { name: displayName }
        );
        if (nameErr) {
          setAuthError("Unable to check display name. Try again.");
          return;
        }
        if (!available) {
          setAuthError("That display name is taken. Try another.");
          return;
        }
      }
      if (!supabase) {
        setAuthError("Supabase is not configured.");
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: { display_name: displayName } },
      });
      if (error) {
        setAuthError(error.message ?? "Unable to sign up.");
        return;
      }
      const user = data?.user ?? null;
      if (!user) {
        setAuthError("Check your email to confirm your account.");
        return;
      }
      const profileRow = await fetchSupabaseProfile(user);
      const fallbackProfile = profileRow ?? {
        id: user.id,
        display_name: displayName,
        is_loop_plus: false,
        plan_key: null,
        trust_score: 0,
      };
      const localProfile = await syncProfileToLocalDb(fallbackProfile);
      const sessionValue = makeSession(user, localProfile);
      await saveLocalSession(sessionValue);
      await AsyncStorage.setItem(ONBOARDING_KEY, "done");
      setOnboardingVisible(false);
      setSession(sessionValue);
    } else {
      if (!supabase) {
        setAuthError("Supabase is not configured.");
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) {
        setAuthError(error.message ?? "Invalid email or password.");
        return;
      }
      const user = data?.user ?? null;
      if (!user) {
        setAuthError("Unable to sign in.");
        return;
      }
      const profileRow = await fetchSupabaseProfile(user);
      const fallbackProfile = profileRow ?? {
        id: user.id,
        display_name: user.user_metadata?.display_name ?? user.email ?? "",
        is_loop_plus: false,
        plan_key: null,
        trust_score: 0,
      };
      const localProfile = await syncProfileToLocalDb(fallbackProfile);
      const sessionValue = makeSession(user, localProfile);
      await saveLocalSession(sessionValue);
      await AsyncStorage.setItem(ONBOARDING_KEY, "done");
      setOnboardingVisible(false);
      setSession(sessionValue);
    }
  }

  function getRevenueCatApiKey() {
    if (Platform.OS === "ios") return REVENUECAT_IOS_KEY;
    if (Platform.OS === "android") return REVENUECAT_ANDROID_KEY;
    return "";
  }

  const rcConfiguredRef = useRef(false);
  const rcConfigurePromiseRef = useRef(null);
  const rcUserIdRef = useRef(null);

  async function configureRevenueCat() {
    const apiKey = getRevenueCatApiKey();
    if (!apiKey) {
      setRcConfigured(false);
      return false;
    }
    try {
      if (rcConfiguredRef.current) {
        setRcConfigured(true);
        return true;
      }
      if (rcConfigurePromiseRef.current) {
        return await rcConfigurePromiseRef.current;
      }
      rcConfigurePromiseRef.current = (async () => {
        try {
          Purchases.configure({ apiKey });
          rcConfiguredRef.current = true;
          setRcConfigured(true);
          return true;
        } catch (err) {
          rcConfiguredRef.current = false;
          setRcConfigured(false);
          setRcDebug((prev) => ({
            ...prev,
            lastError: err?.message ?? String(err),
          }));
          return false;
        } finally {
          rcConfigurePromiseRef.current = null;
        }
      })();
      return await rcConfigurePromiseRef.current;
    } catch (err) {
      rcConfiguredRef.current = false;
      setRcConfigured(false);
      setRcDebug((prev) => ({
        ...prev,
        lastError: err?.message ?? String(err),
      }));
      return false;
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ready = await configureRevenueCat();
      if (!ready || cancelled) return;
      const nextUserId = session?.user?.id ?? null;
      if (rcUserIdRef.current === nextUserId) return;
      try {
        if (nextUserId) {
          await Purchases.logIn(nextUserId);
        } else {
          await Purchases.logOut();
        }
        rcUserIdRef.current = nextUserId;
      } catch (err) {
        if (!cancelled) {
          setRcDebug((prev) => ({
            ...prev,
            lastError: err?.message ?? String(err),
          }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  function applyRevenueCatEntitlements(customerInfo) {
    const activeEntitlement = customerInfo?.entitlements?.active?.[REVENUECAT_ENTITLEMENT] ?? null;
    const activeSubs = Array.isArray(customerInfo?.activeSubscriptions)
      ? customerInfo.activeSubscriptions
      : [];
    const subFromProduct = activeSubs.includes(IAP_PRODUCTS.yearly)
      ? "yearly"
      : activeSubs.includes(IAP_PRODUCTS.monthly)
      ? "monthly"
      : null;
    const planKey =
      activeEntitlement?.productIdentifier === IAP_PRODUCTS.yearly
        ? "yearly"
        : activeEntitlement?.productIdentifier === IAP_PRODUCTS.monthly
        ? "monthly"
        : subFromProduct;
    if (!planKey) {
      setLocalLoopPlus(false);
      setLocalPlanKey(null);
      AsyncStorage.setItem(LOCAL_LOOPPLUS_KEY, "false").catch(() => {});
      AsyncStorage.setItem(LOCAL_LOOPPLUS_PLAN_KEY, "").catch(() => {});
      if (session?.user?.id) {
        updateLocalDb((next) => ({
          ...next,
          profiles: (next.profiles ?? []).map((p) =>
            p.id === session.user.id ? { ...p, is_loop_plus: false, plan_key: null } : p
          ),
        })).catch(() => {});
      }
      return false;
    }
    setLocalLoopPlusActive(planKey);
    return true;
  }

  async function syncRevenueCatEntitlements(reason) {
    const ready = await configureRevenueCat();
    if (!ready) {
      return { active: false };
    }
    try {
      const offerings = await Purchases.getOfferings();
      const info = await Purchases.getCustomerInfo();
      const active = applyRevenueCatEntitlements(info);
      const monthlyPkg = getPackageForPlan("monthly", offerings);
      const yearlyPkg = getPackageForPlan("yearly", offerings);
      setRcPricing({
        monthly: formatPackagePrice(monthlyPkg) ?? DEFAULT_PRICING.monthly,
        yearly: formatPackagePrice(yearlyPkg) ?? DEFAULT_PRICING.yearly,
      });
      setRcPlanMeta({
        monthly: formatPlanMeta(monthlyPkg, "Loop+ Monthly"),
        yearly: formatPlanMeta(yearlyPkg, "Loop+ Yearly"),
      });
      const activeIds = Object.keys(info?.entitlements?.active ?? {});
      setRcDebug((prev) => ({
        ...prev,
        entitlements: activeIds,
        lastResult: { action: "entitlements", reason, activeIds },
      }));
      return { active, info };
    } catch (err) {
      setRcDebug((prev) => ({
        ...prev,
        lastError: err?.message ?? String(err),
      }));
      return { active: false, error: err };
    }
  }

  async function refreshRcDebug() {
    const ready = await configureRevenueCat();
    if (!ready) return;
    try {
      const offerings = await Purchases.getOfferings();
      const info = await Purchases.getCustomerInfo();
      const monthlyPkg = getPackageForPlan("monthly", offerings);
      const yearlyPkg = getPackageForPlan("yearly", offerings);
      const nextPricing = {
        monthly: formatPackagePrice(monthlyPkg) ?? DEFAULT_PRICING.monthly,
        yearly: formatPackagePrice(yearlyPkg) ?? DEFAULT_PRICING.yearly,
      };
      setRcPricing(nextPricing);
      setRcPlanMeta({
        monthly: formatPlanMeta(monthlyPkg, "Loop+ Monthly"),
        yearly: formatPlanMeta(yearlyPkg, "Loop+ Yearly"),
      });
      setRcDebug({
        offerings: offerings?.current?.availablePackages ?? [],
        entitlements: Object.keys(info?.entitlements?.active ?? {}),
        lastResult: null,
        lastError: null,
      });
    } catch (err) {
      setRcDebug((prev) => ({
        ...prev,
        lastError: err?.message ?? String(err),
      }));
    }
  }

  function getPackageForPlan(planKey, offerings) {
    const packages = offerings?.current?.availablePackages ?? [];
    const desiredId = planKey === "yearly" ? IAP_PRODUCTS.yearly : IAP_PRODUCTS.monthly;
    return packages.find((pkg) => pkg?.product?.identifier === desiredId) ?? null;
  }

  function formatPlanMeta(pkg, fallbackTitle) {
    const product = pkg?.product ?? null;
    const period = product?.subscriptionPeriod ?? null;
    const unitMap = {
      day: "day",
      week: "week",
      month: "month",
      year: "year",
    };
    const value = Number(period?.value ?? 1);
    const unitLabel = unitMap[period?.unit] ?? null;
    const length = unitLabel ? `${value} ${unitLabel}${value > 1 ? "s" : ""}` : null;
    return {
      title: product?.title ?? fallbackTitle,
      length: length ?? (fallbackTitle.toLowerCase().includes("year") ? "12 months" : "1 month"),
    };
  }

  function formatPackagePrice(pkg) {
    const product = pkg?.product;
    if (!product) return null;
    const price = product?.priceString ?? null;
    const period = product?.subscriptionPeriod ?? null;
    if (!price) return null;
    if (!period?.unit) return price;
    const unitMap = {
      day: "day",
      week: "week",
      month: "month",
      year: "year",
    };
    const unitLabel = unitMap[period.unit] ?? String(period.unit);
    const value = Number(period.value ?? 1);
    const suffix = value > 1 ? `${value} ${unitLabel}s` : unitLabel;
    return `${price} / ${suffix}`;
  }

  async function getAccessToken() {
    if (!supabase) return null;
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session ?? null;
    if (session?.access_token) {
      const payload = decodeJwtPayload(session.access_token);
      const expectedIss = `${SUPABASE_URL.replace(/\/$/, "")}/auth/v1`;
      if (payload?.iss && payload.iss !== expectedIss) {
        Alert.alert("Auth mismatch", "Please sign out and sign in again.");
        try {
          await supabase.auth.signOut();
        } catch {}
        return null;
      }
      const exp = typeof session.expires_at === "number" ? session.expires_at * 1000 : null;
      if (!exp || exp > Date.now() + 30 * 1000) return session.access_token;
    }
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (error) return null;
    return refreshed?.session?.access_token ?? null;
  }

  function decodeJwtPayload(token) {
    try {
      const payload = token.split(".")[1] ?? "";
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join("")
      );
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  function restorePurchases() {
    configureRevenueCat()
      .then((ready) => {
        if (!ready) {
          Alert.alert("RevenueCat not configured", "Add your RevenueCat API keys first.");
          return null;
        }
        return Purchases.restorePurchases();
      })
      .then((info) => {
        if (!info) return;
        const restored = applyRevenueCatEntitlements(info);
        setRcDebug((prev) => ({ ...prev, lastResult: { action: "restore" } }));
        if (restored) {
          Alert.alert("Restore complete", "Your Loop+ access has been restored.");
        } else {
          Alert.alert("No subscription found", "We didn't find an active Loop+ subscription for this account.");
        }
      })
      .catch((err) => {
        setRcDebug((prev) => ({
          ...prev,
          lastError: err?.message ?? String(err),
        }));
        Alert.alert("Restore failed", "Unable to restore your subscription yet.");
      });
  }

  async function setLocalLoopPlusActive(planKey) {
    setLocalLoopPlus(true);
    setLocalPlanKey(planKey);
    await AsyncStorage.setItem(LOCAL_LOOPPLUS_KEY, "true");
    await AsyncStorage.setItem(LOCAL_LOOPPLUS_PLAN_KEY, planKey ?? "");
    if (session?.user?.id) {
      await updateLocalDb((next) => ({
        ...next,
        profiles: (next.profiles ?? []).map((p) =>
          p.id === session.user.id ? { ...p, is_loop_plus: true, plan_key: planKey } : p
        ),
      }));
    }
  }

  function formatBoostPrice(pack) {
    const product = boostProducts?.[pack.productId];
    return product?.priceString ?? pack.fallbackPrice ?? "";
  }

  async function refreshBoostProducts() {
    const ready = await configureRevenueCat();
    if (!ready) return;
    try {
      const ids = BOOST_PACKS.map((p) => p.productId);
      const products = await Purchases.getProducts(ids);
      const byId = (products ?? []).reduce((acc, p) => {
        acc[p.identifier] = p;
        return acc;
      }, {});
      setBoostProducts(byId);
    } catch (err) {
      setRcDebug((prev) => ({
        ...prev,
        lastError: err?.message ?? String(err),
      }));
    }
  }

  async function purchaseBoostPack(pack) {
    try {
      const ready = await configureRevenueCat();
      if (!ready) {
        Alert.alert("RevenueCat not configured", "Add your RevenueCat API keys first.");
        return;
      }
      const result = await Purchases.purchaseProduct(pack.productId);
      setRcDebug((prev) => ({ ...prev, lastResult: result ?? null }));
      let synced = false;
      if (!DISABLE_BOOST_SYNC && supabase) {
        if (!session?.user?.id) {
          Alert.alert("Sign in required", "Please sign in again to sync your boost purchase.");
          return;
        }
        const headers = {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        };
        const res = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/grant-boosts`, {
          method: "POST",
          headers,
          body: JSON.stringify({ productId: pack.productId, appUserId: session.user.id }),
        });
        const rawText = await res.text();
        let data = {};
        try {
          data = rawText ? JSON.parse(rawText) : {};
        } catch {}
        if (!res.ok) {
          const detail =
            data?.reason ? `${data.error} (${data.reason})` : data?.error || rawText || `HTTP ${res.status}`;
          Alert.alert("Boost sync failed", detail);
        }
        if (res.ok && data?.extraBoosts !== undefined && data?.extraBoosts !== null) {
          setStore((prev) => {
            if (!prev) return prev;
            const stats = normalizeBoostStats(prev.stats, now());
            return {
              ...prev,
              stats: { ...stats, extraBoosts: data.extraBoosts },
            };
          });
          synced = true;
        }
      }
      if (DISABLE_BOOST_SYNC) {
        setStore((prev) => {
          if (!prev) return prev;
          const stats = normalizeBoostStats(prev.stats, now());
          return {
            ...prev,
            stats: { ...stats, extraBoosts: (stats.extraBoosts ?? 0) + pack.count },
          };
        });
        setBoostShopVisible(false);
        trackEvent("boost_purchase_success", {
          productId: pack.productId,
          count: pack.count,
          sync: "disabled",
        });
        Alert.alert("Purchase complete", `Added ${pack.count} boost${pack.count > 1 ? "s" : ""}.`);
      } else if (!synced) {
        setBoostShopVisible(false);
        trackEvent("boost_purchase_pending", {
          productId: pack.productId,
          count: pack.count,
        });
        Alert.alert(
          "Boosts pending",
          "Your purchase went through, but we couldn't sync boosts yet. Please try again in a minute."
        );
      } else {
        setBoostShopVisible(false);
        trackEvent("boost_purchase_success", {
          productId: pack.productId,
          count: pack.count,
          sync: "ok",
        });
        Alert.alert("Purchase complete", `Added ${pack.count} boost${pack.count > 1 ? "s" : ""}.`);
      }
    } catch (err) {
      setRcDebug((prev) => ({
        ...prev,
        lastError: err?.message ?? String(err),
      }));
      if (err?.userCancelled) {
        trackEvent("boost_purchase_canceled", { productId: pack.productId });
        Alert.alert("Purchase canceled", "No boosts were added.");
      } else {
        const msg = err?.message ?? err?.localizedDescription ?? String(err);
        trackEvent("boost_purchase_failed", { productId: pack.productId, message: msg });
        Alert.alert("Purchase failed", msg || "Please try again.");
      }
    }
  }

  async function fetchBoostBalance() {
    if (!supabase || !session?.user?.id) return;
    const { data, error } = await supabase
      .from("user_boosts")
      .select("extra_boosts")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error) return;
    const value = typeof data?.extra_boosts === "number" ? data.extra_boosts : 0;
    setStore((prev) => {
      if (!prev) return prev;
      const stats = normalizeBoostStats(prev.stats, now());
      if ((stats.extraBoosts ?? 0) === value) return prev;
      return { ...prev, stats: { ...stats, extraBoosts: value } };
    });
  }

  async function startCheckout(planKey) {
    Alert.alert("In-app purchase only", "Subscriptions are handled through in-app purchases.");
  }

  async function choosePlan(planKey) {
    // planKey: "monthly" | "yearly"
    setLpPlansVisible(false);
    try {
      const ready = await configureRevenueCat();
      if (!ready) {
        Alert.alert("RevenueCat not configured", "Add your RevenueCat API keys first.");
        return;
      }
      const offerings = await Purchases.getOfferings();
      const pkg = getPackageForPlan(planKey, offerings);
      if (!pkg) {
        Alert.alert("Plan unavailable", "That plan is not available right now.");
        return;
      }
      const result = await Purchases.purchasePackage(pkg);
      setRcDebug((prev) => ({ ...prev, lastResult: result ?? null }));
      await syncRevenueCatEntitlements("purchase");
      trackEvent("subscription_purchase_success", {
        plan: planKey,
        productId: pkg?.product?.identifier ?? null,
      });
      Alert.alert(
        "Loop+ activated",
        planKey === "yearly"
          ? "Yearly plan selected. You're all set."
          : "Monthly plan selected. You're all set."
      );
    } catch (err) {
      setRcDebug((prev) => ({
        ...prev,
        lastError: err?.message ?? String(err),
      }));
      if (err?.userCancelled) {
        trackEvent("subscription_purchase_canceled", { plan: planKey });
        Alert.alert("Purchase canceled", "Try again whenever you're ready.");
      } else {
        const errMsg = err?.message ?? err?.localizedDescription ?? String(err);
        trackEvent("subscription_purchase_failed", { plan: planKey, message: errMsg });
        Alert.alert("Purchase failed", errMsg || "Please try again in a moment.");
      }
    }
  }

  function openLpComposer(kind) {
    setLpComposerKind(kind);
    setLpTitle("");
    setLpDetails("");
    setLpTimeKey("24h");
    setLpRadius(5);
    setLpImages([]);
    setLpExistingImages([]);
    setLpEditing(null);
    setLpComposerVisible(true);
  }

  function editLoopPlusItem(item, kind) {
    if (!item?.id) return;
    setLpComposerKind(kind ?? item.kind ?? "free");
    setLpTitle(item.title ?? "");
    setLpDetails(item.details ?? "");
    setLpTimeKey(item.timeWindowKey ?? "24h");
    setLpRadius(typeof item.radiusMiles === "number" ? item.radiusMiles : 5);
    setLpImages([]);
    setLpExistingImages(Array.isArray(item.images) ? item.images : []);
    setLpEditing({ id: item.id, kind: kind ?? item.kind ?? "free" });
    setLpComposerVisible(true);
  }

    async function pickLoopPlusImages() {
      if (!ImagePicker) {
        Alert.alert(
          "Image picker missing",
          "Install expo-image-picker to add photos.\n\nRun:\n  npx expo install expo-image-picker"
        );
        return;
      }
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm?.status !== "granted") {
        Alert.alert("Permission needed", "Allow photo access to attach images.");
        return;
      }
      const maxRemaining = Math.max(0, 4 - (lpImages?.length ?? 0));
      if (maxRemaining <= 0) {
        Alert.alert("Limit reached", "You can attach up to 4 photos.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType?.Images ?? ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsMultipleSelection: true,
        selectionLimit: maxRemaining,
        base64: true,
      });
      if (result?.canceled) return;
      const assets = Array.isArray(result?.assets) ? result.assets : [];
      const next = assets
        .map((asset) => {
          const uri = asset?.uri ?? "";
          if (!uri) return null;
          return {
            uri,
            base64: asset?.base64 ?? null,
            fileName: asset?.fileName ?? "",
          };
        })
        .filter(Boolean);
      if (!next.length) return;
      setLpImages((prev) => [...(prev ?? []), ...next].slice(0, 4));
    }

    function removeLoopPlusImage(index) {
      setLpImages((prev) => (prev ?? []).filter((_, i) => i !== index));
    }

    async function uploadLoopPlusImages(itemId) {
      if (!lpImages?.length || !session?.user?.id) return [];
      const uploaded = [];
      setLpUploadProgress({ index: 0, total: lpImages.length });
      for (let i = 0; i < lpImages.length; i += 1) {
        const img = lpImages[i];
        const uri = img?.uri ?? "";
        if (!uri) {
          setLpUploadProgress({ index: i + 1, total: lpImages.length });
          continue;
        }
        if (!supabase) {
          uploaded.push(uri);
          setLpUploadProgress({ index: i + 1, total: lpImages.length });
          continue;
        }
        try {
          const ext = (img?.fileName ?? uri).split(".").pop() || "jpg";
          const path = `${session.user.id}/${itemId}/${Date.now()}_${i}.${ext}`;
          if (FileSystem?.uploadAsync) {
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData?.session?.access_token ?? null;
            if (!accessToken) {
              throw new Error("No auth token. Please sign in again.");
            }
            const uploadType = FileSystem?.FileSystemUploadType?.BINARY_CONTENT ?? null;
            const uploadUrl = `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/loop-images/${path}`;
            const result = await FileSystem.uploadAsync(uploadUrl, uri, {
              httpMethod: "POST",
              headers: {
                "Content-Type": "image/jpeg",
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${accessToken ?? SUPABASE_ANON_KEY}`,
                "x-upsert": "false",
              },
              ...(uploadType ? { uploadType } : {}),
            });
            if (!result || result.status >= 300) {
              throw new Error(`Upload failed (${result?.status ?? "unknown"}): ${result?.body ?? ""}`);
            }
          } else {
            const response = await fetch(uri);
            const blob = await response.blob();
            const { error } = await supabase.storage
              .from("loop-images")
              .upload(path, blob, { contentType: blob.type ?? "image/jpeg", upsert: false });
            if (error) throw error;
          }
          const { data } = supabase.storage.from("loop-images").getPublicUrl(path);
          if (data?.publicUrl) uploaded.push(data.publicUrl);
        } catch (err) {
          setLpUploadProgress({ index: i + 1, total: lpImages.length });
          continue;
        }
        setLpUploadProgress({ index: i + 1, total: lpImages.length });
      }
      setLpUploadProgress({ index: 0, total: 0 });
      return uploaded;
    }

    async function addLoopPlusItem() {
      if (!store) return;
      if (!isLoopPlus) {
        Alert.alert("Loop+ required", "Posting here requires Loop+.");
        return;
      }
      const title = lpTitle.trim();
      const details = lpDetails.trim();
      if (!title) return Alert.alert("Title needed", "Give it a short title.");
      if (!details) return Alert.alert("Details needed", "Add a little context.");

      const createdAt = now();
      const tw = TIME_WINDOWS.find((t) => t.key === lpTimeKey) ?? TIME_WINDOWS[3];
      const expiresAt = createdAt + tw.ms;
      const uploadId = lpEditing?.id ?? uid(lpComposerKind);
      setLpUploading(true);
      const uploaded = await uploadLoopPlusImages(uploadId);
      if (lpImages.length && uploaded.length === 0) {
        setLpUploading(false);
        Alert.alert(
          "Photo upload failed",
          "We couldn't upload your photos. Check storage policies and try again."
        );
        return;
      }
      const baseImages = Array.isArray(lpExistingImages) ? lpExistingImages : [];
      const imageUrls = lpImages.length ? [...baseImages, ...uploaded].slice(0, 4) : baseImages;
      const payload = {
        id: uploadId,
        user_id: session?.user?.id,
        kind: lpComposerKind,
        title,
        details,
        images: imageUrls,
        author: displayNameOrFallback(profile?.display_name ?? session?.user?.email),
        author_trust_score: profile?.trust_score ?? 0,
        location_label: store?.location?.label ?? "Near you",
        lat: store?.location?.lat ?? null,
        lon: store?.location?.lon ?? null,
        created_at: new Date(createdAt).toISOString(),
        expires_at: new Date(expiresAt).toISOString(),
        radius_miles: lpRadius,
        time_window_key: lpTimeKey,
      };
      let saved = null;
      if (lpEditing?.id) {
        if (supabase) {
          await supabase
            .from("loopplus_posts")
            .update({
              kind: lpComposerKind,
              title,
              details,
              images: imageUrls,
              expires_at: payload.expires_at,
              radius_miles: payload.radius_miles,
              time_window_key: payload.time_window_key,
            })
            .eq("id", lpEditing.id);
        }
        await updateLocalDb((next) => ({
          ...next,
          loopplus_posts: (next.loopplus_posts ?? []).map((row) =>
            row.id === lpEditing.id
              ? {
                  ...row,
                  kind: lpComposerKind,
                  title,
                  details,
                  images: imageUrls,
                  expires_at: payload.expires_at,
                  radius_miles: payload.radius_miles,
                  time_window_key: payload.time_window_key,
                }
              : row
          ),
        }));
        saved = { ...payload, id: lpEditing.id };
      } else {
        let createdRow = null;
        if (supabase) {
          const { data } = await supabase
            .from("loopplus_posts")
            .insert({
              user_id: payload.user_id,
              kind: payload.kind,
              title: payload.title,
              details: payload.details,
              images: payload.images,
              author: payload.author,
              author_trust_score: payload.author_trust_score,
              location_label: payload.location_label,
              lat: payload.lat,
              lon: payload.lon,
              created_at: payload.created_at,
              expires_at: payload.expires_at,
              radius_miles: payload.radius_miles,
              time_window_key: payload.time_window_key,
            })
            .select()
            .single();
          if (!data?.id) {
            setLpUploading(false);
            Alert.alert("Post failed", "We couldn't save your Loop+ post. Please try again.");
            return;
          }
          createdRow = data ?? null;
        }
        const rowToStore = createdRow ? { ...payload, id: createdRow.id } : payload;
        await updateLocalDb((next) => ({
          ...next,
          loopplus_posts: [rowToStore, ...(next.loopplus_posts ?? [])],
        }));
        saved = rowToStore;
      }
      const item = mapLoopPlusRow(saved);
      if (item) {
        setStore((prev) => {
          const next = { ...prev.loopPlusData };
          const keyForKind = (kind) =>
            kind === "free"
              ? "freeItems"
              : kind === "hire"
              ? "hireTasks"
              : kind === "toolshare"
              ? "toolShareItems"
              : "urgentItems";
          if (lpEditing?.id) {
            const prevKind = lpEditing.kind ?? lpComposerKind;
            if (prevKind !== lpComposerKind) {
              const fromKey = keyForKind(prevKind);
              const toKey = keyForKind(lpComposerKind);
              next[fromKey] = (next[fromKey] ?? []).filter((it) => it.id !== item.id);
              next[toKey] = [item, ...(next[toKey] ?? [])];
            } else {
              const key = keyForKind(lpComposerKind);
              next[key] = (next[key] ?? []).map((it) => (it.id === item.id ? item : it));
            }
          } else {
            const key = keyForKind(lpComposerKind);
            next[key] = [item, ...(next[key] ?? [])];
          }
          return { ...prev, loopPlusData: next };
        });
      }

      setLpUploading(false);
      setLpComposerVisible(false);
      setLpEditing(null);
      setLpExistingImages([]);
      setLpImages([]);
    }

    function messageLoopPlusItem(item, kind) {
      const fallbackExpiresAt = (item?.createdAt ?? now()) + TIME_WINDOWS[3].ms;
    const loop = {
      id: item.id,
      userId: item.userId ?? session?.user?.id ?? null,
      type:
        kind === "hire"
          ? "loopplus_hire"
          : kind === "toolshare"
          ? "loopplus_toolshare"
          : kind === "urgent"
          ? "loopplus_urgent"
          : "loopplus_free",
      title: item.title,
      details: item.details,
      createdAt: item.createdAt ?? now(),
      expiresAt: item.expiresAt ?? fallbackExpiresAt,
      author: item.author ?? "Neighbor",
      locationLabel: item.locationLabel ?? "Near you",
      isLoopPlus: true,
      loopPlusKind: kind,
    };
      ensureThreadForLoop(loop);
    }

    function deleteLoopPlusItem(item, kind) {
      if (!item?.id) return;
      const ownerId = item.userId ?? null;
      if (!session?.user?.id || (!isAdmin && ownerId !== session.user.id)) return;
      const key = kind === "free" ? "freeItems" : "hireTasks";
      if (supabase) {
        supabase.from("loopplus_posts").delete().eq("id", item.id).then(() => {});
      }
      updateLocalDb((next) => ({
        ...next,
        loopplus_posts: (next.loopplus_posts ?? []).filter((row) => row.id !== item.id),
      })).then(() => {
        setStore((prev) => {
          if (!prev) return prev;
          const next = { ...prev.loopPlusData };
          next[key] = (next[key] ?? []).filter((it) => it.id !== item.id);
          return { ...prev, loopPlusData: next };
        });
      });
    }

    function useBoost() {
      if (!store) return;
      const t = now();
      const stats = normalizeBoostStats(store.stats, t);
      const weeklyLimit = isLoopPlus ? LOOPPLUS_WEEKLY_BOOSTS : FREE_WEEKLY_BOOSTS;
      const usedWeek = stats.boostsUsedWeek ?? 0;
      const extraBoosts = stats.extraBoosts ?? 0;
      const hasWeekly = usedWeek < weeklyLimit;
      const hasExtra = extraBoosts > 0;

      if (!hasWeekly && !hasExtra) {
        return Alert.alert(
          "No boosts left",
          `You've used your ${weeklyLimit} weekly boost${weeklyLimit > 1 ? "s" : ""}. Buy more to keep boosting.`
        );
      }

      const loopPlusItems = [
        ...(store?.loopPlusData?.freeItems ?? []),
        ...(store?.loopPlusData?.hireTasks ?? []),
      ]
        .map(loopPlusItemToLoop)
        .filter(Boolean);
      const activeLoops = cleanExpiredLoops([...(store.loops ?? []), ...loopPlusItems]).filter(
        (loop) => loop.userId === currentUserId
      );
      if (!activeLoops.length) {
        Alert.alert("No loops to boost", "Post a loop first, then choose one to boost.");
        return;
      }

      setBoostTargetId(null);
      setBoostPickerVisible(true);
    }

    async function applyBoost(targetId) {
      if (!store || !targetId) return;
      const t = now();
      const stats = normalizeBoostStats(store.stats, t);
      const weeklyLimit = isLoopPlus ? LOOPPLUS_WEEKLY_BOOSTS : FREE_WEEKLY_BOOSTS;
      const usedWeek = stats.boostsUsedWeek ?? 0;
      const extraBoosts = stats.extraBoosts ?? 0;
      const hasWeekly = usedWeek < weeklyLimit;
      const hasExtra = extraBoosts > 0;

      if (!hasWeekly && !hasExtra) {
        return Alert.alert(
          "No boosts left",
          `You've used your ${weeklyLimit} weekly boost${weeklyLimit > 1 ? "s" : ""}. Buy more to keep boosting.`
        );
      }

      const loopPlusItems = [
        ...(store?.loopPlusData?.freeItems ?? []),
        ...(store?.loopPlusData?.hireTasks ?? []),
      ]
        .map(loopPlusItemToLoop)
        .filter(Boolean);
      const activeLoops = cleanExpiredLoops([...(store.loops ?? []), ...loopPlusItems]).filter(
        (loop) => loop.userId === currentUserId
      );
      const selectedLoop = activeLoops.find((loop) => loop.id === targetId) ?? null;
      if (!selectedLoop) {
        Alert.alert("Loop not found", "Choose a loop to boost.");
        return;
      }

      let serverExtraBoosts = null;
      const usePaid = usedWeek >= weeklyLimit && extraBoosts > 0;
      if (usePaid && !DISABLE_BOOST_SYNC && supabase) {
        if (!session?.user?.id) {
          Alert.alert("Sign in required", "Please sign in again to use paid boosts.");
          return;
        }
        const headers = {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        };
        const res = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/consume-boost`, {
          method: "POST",
          headers,
          body: JSON.stringify({ appUserId: session.user.id }),
        });
        const rawText = await res.text();
        let data = {};
        try {
          data = rawText ? JSON.parse(rawText) : {};
        } catch {}
        if (!res.ok) {
          const detail =
            data?.reason ? `${data.error} (${data.reason})` : data?.error || rawText || `HTTP ${res.status}`;
          Alert.alert("Boost sync failed", detail);
        }
        if (res.ok && data?.extraBoosts !== undefined && data?.extraBoosts !== null) {
          serverExtraBoosts = data.extraBoosts;
        }
      }

      setStore((prev) => {
        const normalized = normalizeBoostStats(prev.stats, t);
        const prevUsed = normalized.boostsUsedWeek ?? 0;
        const prevExtra = normalized.extraBoosts ?? 0;
        const applyPaid = usePaid && prevExtra > 0;
        const nextLoops = (prev.loops ?? []).map((loop) =>
          loop.id === selectedLoop.id ? { ...loop, boostedAt: t } : loop
        );
        const nextLoopPlus = {
          freeItems: (prev.loopPlusData?.freeItems ?? []).map((item) =>
            item.id === selectedLoop.id ? { ...item, boostedAt: t } : item
          ),
          hireTasks: (prev.loopPlusData?.hireTasks ?? []).map((item) =>
            item.id === selectedLoop.id ? { ...item, boostedAt: t } : item
          ),
          toolShareItems: (prev.loopPlusData?.toolShareItems ?? []).map((item) =>
            item.id === selectedLoop.id ? { ...item, boostedAt: t } : item
          ),
          urgentItems: (prev.loopPlusData?.urgentItems ?? []).map((item) =>
            item.id === selectedLoop.id ? { ...item, boostedAt: t } : item
          ),
        };
        return {
          ...prev,
          loops: nextLoops,
          loopPlusData: nextLoopPlus,
          stats: {
            ...normalized,
            boostsUsedWeek: applyPaid ? prevUsed : prevUsed + 1,
            extraBoosts: DISABLE_BOOST_SYNC
              ? applyPaid
                ? prevExtra - 1
                : prevExtra
              : serverExtraBoosts !== null
              ? serverExtraBoosts
              : applyPaid
              ? prevExtra - 1
              : prevExtra,
            lastBoostDate: t,
            lastBoostWeekKey: weekKey(t),
          },
        };
      });
      if (selectedLoop.isLoopPlus) {
        updateLocalDb((next) => ({
          ...next,
          loopplus_posts: (next.loopplus_posts ?? []).map((row) =>
            row.id === selectedLoop.id ? { ...row, boosted_at: new Date(t).toISOString() } : row
          ),
        })).catch(() => {});
        if (supabase) {
          supabase
            .from("loopplus_posts")
            .update({ boosted_at: new Date(t).toISOString() })
            .eq("id", selectedLoop.id)
            .then(() => {})
            .catch(() => {});
        }
      } else {
        updateLocalDb((next) => ({
          ...next,
          loops: (next.loops ?? []).map((loop) =>
            loop.id === selectedLoop.id ? { ...loop, boosted_at: new Date(t).toISOString() } : loop
          ),
        })).catch(() => {});
        if (supabase) {
          supabase
            .from("loops")
            .update({ boosted_at: new Date(t).toISOString() })
            .eq("id", selectedLoop.id)
            .then(() => {})
            .catch(() => {});
        }
      }
      setFeedScrollKey((k) => k + 1);
      setBoostPickerVisible(false);
      trackEvent("boost_applied", {
        loopId: selectedLoop.id,
        paid: usePaid,
        isLoopPlus: !!selectedLoop.isLoopPlus,
      });
      Alert.alert("Boost applied", `Boosted: ${selectedLoop.title}`);
      return;
  }

  const currentUserId = session?.user?.id ?? profile?.id ?? store?.auth?.userId ?? null;
  const normalizedBoostStats = normalizeBoostStats(store?.stats ?? {}, now());
  const weeklyBoostLimit = isLoopPlus ? LOOPPLUS_WEEKLY_BOOSTS : FREE_WEEKLY_BOOSTS;
  const boostsUsedWeek = normalizedBoostStats.boostsUsedWeek ?? 0;
  const extraBoosts = normalizedBoostStats.extraBoosts ?? 0;
  const boostsRemaining = Math.max(0, weeklyBoostLimit - boostsUsedWeek);
  const boostsAvailable = boostsRemaining + extraBoosts;

  if (!fontsLoaded || authLoading || hydrating || !store) {
    return (
      <ImageBackground
        source={null}
        resizeMode="cover"
        style={{ flex: 1 }}
        pointerEvents="box-none"
      >
        <View pointerEvents="none" style={styles.appBgOverlay} />
        <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 22, fontWeight: "900", color: "#2b2b2b" }}>{APP_NAME}</Text>
          <Text style={{ marginTop: 10, color: "rgba(43,43,43,0.65)" }}>Loading...</Text>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  if (!session) {
    return (
      <AuthScreen
        mode={authMode}
        email={authEmail}
        password={authPassword}
        displayName={authDisplayName}
        error={authError}
        onChangeEmail={setAuthEmail}
        onChangePassword={setAuthPassword}
        onChangeDisplayName={setAuthDisplayName}
        onToggleMode={() => setAuthMode((m) => (m === "signIn" ? "signUp" : "signIn"))}
        onSubmit={handleAuthSubmit}
      />
    );
  }

  // Orbs transforms
  const aY = orbA.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const bY = orbB.interpolate({ inputRange: [0, 1], outputRange: [0, 22] });
  const cY = orbC.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const myBoostLoops = store
    ? cleanExpiredLoops([
        ...(store.loops ?? []),
        ...(store?.loopPlusData?.freeItems ?? []).map(loopPlusItemToLoop),
        ...(store?.loopPlusData?.hireTasks ?? []).map(loopPlusItemToLoop),
        ...(store?.loopPlusData?.toolShareItems ?? []).map(loopPlusItemToLoop),
        ...(store?.loopPlusData?.urgentItems ?? []).map(loopPlusItemToLoop),
      ]).filter((loop) => loop.userId === currentUserId)
    : [];

  return (
      <View style={{ flex: 1 }}>
      <ImageBackground
        source={null}
        resizeMode="cover"
        style={{ flex: 1 }}
        pointerEvents="box-none"
      >
          <View pointerEvents="none" style={styles.appBgOverlay} />
          {/* Floating orbs */}
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Animated.View
            style={[
              styles.orb,
              {
                width: 220,
                height: 220,
                borderRadius: 220,
                left: -60,
                top: 40,
                backgroundColor: "rgba(120, 178, 255, 0.45)",
                transform: [{ translateY: aY }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.orb,
              {
                width: 260,
                height: 260,
                borderRadius: 260,
                right: -90,
                top: 130,
                backgroundColor: "rgba(120, 214, 255, 0.35)",
                transform: [{ translateY: bY }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.orb,
              {
                width: 240,
                height: 240,
                borderRadius: 240,
                right: -70,
                bottom: 140,
                backgroundColor: "rgba(152, 255, 220, 0.30)",
                transform: [{ translateY: cY }],
              },
            ]}
          />
          <View style={[styles.miniOrb, { left: 22, bottom: 170, backgroundColor: "rgba(180, 220, 255, 0.50)" }]} />
          <View style={[styles.miniOrb, { right: 28, bottom: 240, backgroundColor: "rgba(200, 210, 255, 0.45)" }]} />
          <View style={[styles.miniOrb, { left: 80, top: 120, backgroundColor: "rgba(170, 255, 235, 0.35)" }]} />
        </View>

        <SafeAreaView style={{ flex: 1 }}>
          {/* Top header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.appTitle}>{APP_NAME}</Text>
                <Text style={styles.subTitle}>
                  {signedIn
                    ? profile?.display_name || session?.user?.user_metadata?.display_name
                      ? `Hi, ${profile?.display_name ?? session?.user?.user_metadata?.display_name}`
                      : "Signed in"
                    : "Signed out"}
                </Text>
                {null}
            </View>

            <View style={{ alignItems: "flex-end", maxWidth: "48%", marginLeft: -2 }}>
              <Text style={styles.locationLine} numberOfLines={2}>
              Location-{store.location.label}updated {formatRelative(now() - (store.location.updatedAt ?? now()))}
              </Text>
              <View style={{ flexDirection: "row", gap: 4, marginTop: 2 }}>
                <Pressable
                  onPress={() => {
                    openPaywall("header_pill");
                  }}
                >
                  <Pill tiny text={isLoopPlus ? "Loop+ 🔓" : "Loop+ 🔒"} tone={isLoopPlus ? "sky" : "danger"} />
                </Pressable>
              </View>
            </View>
          </View>

          {/* Content */}
          <View
            pointerEvents="auto"
            style={{ flex: 1, paddingHorizontal: 14, position: "relative", zIndex: 1, elevation: 1 }}
          >
            {null}
              {activeTab === "feed" && (
                <FeedScreen
                  store={store}
                  loops={loopsForFeed}
                  sortAnim={sortAnim}
                  scrollToTopKey={feedScrollKey}
                  isLoopPlus={isLoopPlus}
                  boostsUsedWeek={boostsUsedWeek}
                  weeklyBoostLimit={weeklyBoostLimit}
                  extraBoosts={extraBoosts}
                  boostsAvailable={boostsAvailable}
                  onOpenPlans={() => {
                    openPaywall("feed_paywall");
                  }}
                  onUseBoost={useBoost}
                  onOpenBoostShop={() => openBoostShop("feed")}
                  onSetFilter={(key) => updateFeed({ filter: key })}
                  onSetRadius={(miles) => updateFeed({ radiusMiles: miles })}
                  onRefreshLocation={refreshLocation}
                  onToggleSort={toggleSort}
                  onOpenChats={() => setActiveTab("chats")}
                  onMessage={(loop) => ensureThreadForLoop(loop)}
                  onDelete={(loop) => deleteLoop(loop)}
                  onEdit={(loop) => startEditLoop(loop)}
                  onOpenImage={openImageViewer}
                  onToggleFollow={toggleFollow}
                  currentUserId={session?.user?.id ?? null}
                  isAdmin={isAdmin}
                  followingSet={followingSet}
                />
              )}

            {activeTab === "new" && (
              <NewScreen
                signedIn={signedIn}
                onSignIn={signIn}
                newType={newType}
                setNewType={setNewType}
                newTitle={newTitle}
                setNewTitle={setNewTitle}
                newDetails={newDetails}
                setNewDetails={setNewDetails}
                newTimeKey={newTimeKey}
                setNewTimeKey={setNewTimeKey}
                newRadius={newRadius}
                setNewRadius={setNewRadius}
                editingLoop={editingLoop}
                onCancelEdit={cancelEditLoop}
                onCancelNew={cancelNewLoop}
                onPost={postNewLoop}
              />
            )}

            {activeTab === "map" && (
              <MapScreen
                isLoopPlus={isLoopPlus}
                loops={mapLoops}
                location={store.location}
                radiusMiles={store.feed.radiusMiles}
                mapRegion={mapRegion}
                followUser={followUser}
                onToggleFollow={() => setFollowUser((v) => !v)}
                onRegionChange={(region) => {
                  setMapRegion(region);
                  if (followUser) setFollowUser(false);
                }}
                onRecenter={() => {
                  if (isValidCoord(store.location?.lat) && isValidCoord(store.location?.lon)) {
                    setMapRegion({
                      latitude: store.location.lat,
                      longitude: store.location.lon,
                      latitudeDelta: 0.03,
                      longitudeDelta: 0.03,
                    });
                    setFollowUser(true);
                  }
                }}
                selectedLoop={selectedMapLoop}
                onSelectLoop={(loopId) => setSelectedMapLoopId(loopId)}
                onMessageLoop={(loop) => ensureThreadForLoop(loop)}
                onToggleAccept={(loopId, key) => toggleLoopAccept(loopId, key)}
                loopAccepts={store.loopAccepts}
                onOpenDirections={(loop) => openDirections(loop)}
                onUpgrade={() => openLoopPlusSection("upgrade")}
              />
            )}

            {activeTab === "chats" && (
              <ChatsScreen threads={chatThreads} onOpenThread={openThread} onFindLoops={() => setActiveTab("feed")} />
            )}

            {activeTab === "loopplus" && (
                <LoopPlusHub
                  isLoopPlus={isLoopPlus}
                  isAdmin={isAdmin}
                  section={lpSection}
                  onSetSection={(s) => openLoopPlusSection(s)}
                  onOpenPlans={() => openPaywall("loopplus_hub")}
                  onRestore={restorePurchases}
                  loopPlusData={store.loopPlusData}
                  loopPlusLoading={lpLoading}
                  onOpenComposer={openLpComposer}
                  onUseBoost={useBoost}
                  boostsUsedWeek={boostsUsedWeek}
                  weeklyBoostLimit={weeklyBoostLimit}
                  extraBoosts={extraBoosts}
                  boostsAvailable={boostsAvailable}
                  loops={store.loops}
                  boostTargetId={boostTargetId}
                  onSetBoostTarget={setBoostTargetId}
                  boostPickerVisible={boostPickerVisible}
                  onSetBoostPickerVisible={setBoostPickerVisible}
                  onOpenBoostShop={() => openBoostShop("loopplus_hub")}
                  activePlan={profile?.plan_key ?? localPlanKey ?? null}
                  onMessageLoopPlus={(item, kind) => messageLoopPlusItem(item, kind)}
                  onDeleteLoopPlus={(item, kind) => deleteLoopPlusItem(item, kind)}
                  onEditLoopPlus={(item, kind) => editLoopPlusItem(item, kind)}
                  onOpenImage={openImageViewer}
                  currentUserId={session?.user?.id ?? null}
                  onToggleFollow={toggleFollow}
                  followingSet={followingSet}
                />
              )}

              {activeTab === "profile" && (
                <ProfileScreen
                  store={store}
                  profile={profile}
                  userEmail={session?.user?.email}
                  userDisplayName={session?.user?.user_metadata?.display_name}
                  signedIn={signedIn}
                  onSignIn={signIn}
                  onSignOut={signOut}
                  onEnableNotifications={enableNotifications}
                  onUpdateDisplayName={updateDisplayName}
                  alertRadiusMiles={store?.settings?.alertRadiusMiles ?? 1.5}
                  proximityAlertsEnabled={!!store?.settings?.proximityAlertsEnabled}
                  onToggleProximityAlerts={() =>
                    updateSettings({ proximityAlertsEnabled: !store?.settings?.proximityAlertsEnabled })
                  }
                  onSetAlertRadius={(miles) => updateSettings({ alertRadiusMiles: miles })}
                  onOpenLegal={(key) => {
                    setLegalDocKey(key);
                    setLegalModalVisible(true);
                  }}
                  onOpenLoopPlusUpgrade={() => openPaywall("profile")}
                  followingProfiles={followingProfiles}
                  onToggleFollow={toggleFollow}
                  onOpenAbout={() => setAboutVisible(true)}
                  onOpenTips={() => setTipsVisible(true)}
                />
              )}
          </View>

          {/* Bottom tabs */}
          <BottomTabs activeTab={activeTab} setTab={setTab} isLoopPlus={isLoopPlus} />
        </SafeAreaView>
      </ImageBackground>

      {/* Image Viewer Modal */}
      <Modal
        visible={imageViewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageViewerVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setImageViewerVisible(false)}>
          <View style={styles.imageViewerCard}>
            {imageViewerUri ? (
              <Image source={{ uri: imageViewerUri }} style={styles.imageViewerImage} resizeMode="contain" />
            ) : null}
          </View>
        </Pressable>
      </Modal>

      {/* Chat Modal */}
        <Modal visible={chatModalVisible} animationType="slide" onRequestClose={() => setChatModalVisible(false)}>
          <ImageBackground
            source={null}
            resizeMode="cover"
            style={{ flex: 1 }}
            pointerEvents="box-none"
          >
            <View pointerEvents="none" style={styles.appBgOverlay} />
            <SafeAreaView style={{ flex: 1 }}>
              <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
              >
                <View style={styles.chatHeader}>
              <Pressable style={styles.chatHeaderBtn} onPress={() => setChatModalVisible(false)}>
                <Text style={styles.chatHeaderBtnText}>Back</Text>
              </Pressable>

              <View style={{ flex: 1 }}>
                <Text style={styles.chatTitle} numberOfLines={1}>
                  {selectedThread?.title ?? "Chat"}
                </Text>
                <Text style={styles.chatSub} numberOfLines={1}>
                  Thread - replies sync to your account
                </Text>
              </View>

              <View style={{ width: 56 }} />
            </View>

            {!selectedThread ? (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 18 }}>
                <Text style={{ fontSize: 18, fontWeight: "900", color: "#2b2b2b" }}>No thread selected</Text>
                <Text style={{ marginTop: 8, color: "rgba(43,43,43,0.65)", textAlign: "center" }}>
                  Open a thread from Chats, or tap "Message" on a loop in Feed.
                </Text>
              </View>
            ) : (
            <View style={{ flex: 1 }}>
                <FlatList
                  contentContainerStyle={{ padding: 14, paddingBottom: 90 }}
                  data={selectedThreadMessages}
                  keyExtractor={(m) => m.id}
                  renderItem={({ item }) => <MessageBubble msg={item} />}
                  keyboardShouldPersistTaps="handled"
                />

                <View style={styles.chatComposer}>
                  <TextInput
                    value={chatDraft}
                    onChangeText={setChatDraft}
                    placeholder="Type a reply..."
                    placeholderTextColor="rgba(43,43,43,0.35)"
                    style={styles.chatInput}
                    multiline
                  />
                  <Pressable style={styles.sendBtn} onPress={sendChatReply}>
                    <Text style={styles.sendBtnText}>Send</Text>
                  </Pressable>
                </View>
              </View>
            )}
              </KeyboardAvoidingView>
            </SafeAreaView>
          </ImageBackground>
        </Modal>

      {/* Loop+ Add Item Modal */}
      <Modal
        visible={lpComposerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLpComposerVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setLpComposerVisible(false)}>
          <KeyboardAvoidingView
            style={{ width: "100%" }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
          >
            <Pressable style={styles.gateCard} onPress={() => {}}>
              <ScrollView contentContainerStyle={{ paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
                <Text style={styles.gateTitle}>
                  {lpComposerKind === "free"
                    ? "Add Free item"
                    : lpComposerKind === "hire"
                    ? "Post Hire task"
                    : lpComposerKind === "toolshare"
                    ? "Share a tool"
                    : "Post urgent request"}
                </Text>
                <Text style={styles.gateText}>Saved to the Loop+ feed.</Text>

            <Text style={[styles.label, { marginTop: 12 }]}>Title</Text>
            <TextInput
              value={lpTitle}
              onChangeText={setLpTitle}
              placeholder="Short + scannable"
              placeholderTextColor="rgba(43,43,43,0.35)"
              style={styles.input}
            />

            <Text style={[styles.label, { marginTop: 10 }]}>Details</Text>
            <TextInput
              value={lpDetails}
              onChangeText={setLpDetails}
              placeholder="Add context..."
              placeholderTextColor="rgba(43,43,43,0.35)"
              style={[styles.input, { height: 110, textAlignVertical: "top" }]}
              multiline
            />

            <Text style={[styles.label, { marginTop: 12 }]}>Time window</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
              {TIME_WINDOWS.map((w) => {
                const on = lpTimeKey === w.key;
                return (
                  <Pressable key={w.key} onPress={() => setLpTimeKey(w.key)} style={[styles.radiusBtn, on && styles.radiusBtnOn]}>
                    <Text style={[styles.radiusBtnText, on && styles.radiusBtnTextOn]}>{w.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, { marginTop: 12 }]}>Radius</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              {RADIUS_OPTIONS.map((r) => {
                const on = lpRadius === r;
                return (
                  <Pressable key={r} onPress={() => setLpRadius(r)} style={[styles.radiusBtn, on && styles.radiusBtnOn]}>
                    <Text style={[styles.radiusBtnText, on && styles.radiusBtnTextOn]}>{r}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Photos (Loop+ only, up to 4)</Text>
              {lpEditing?.id && lpExistingImages.length ? (
                <Text style={[styles.miniNote, { marginTop: 4 }]}>
                  Existing photos stay. Add more to append.
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {lpImages.map((img, idx) => (
                  <Pressable key={img?.uri ?? `lp-${idx}`} onPress={() => removeLoopPlusImage(idx)}>
                    <Image source={{ uri: img?.uri }} style={styles.loopImageThumb} />
                    <View style={styles.removePhotoBadge}>
                      <Text style={styles.removePhotoText}>x</Text>
                    </View>
                  </Pressable>
                ))}
                {lpImages.length < 4 ? (
                  <Pressable style={styles.addPhotoBtn} onPress={pickLoopPlusImages}>
                    <Text style={styles.addPhotoBtnText}>+ Add photo</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <Pressable
                style={[styles.primaryBtn, { flex: 1, opacity: lpUploading ? 0.7 : 1 }]}
                onPress={addLoopPlusItem}
                disabled={lpUploading}
              >
                <Text style={styles.primaryBtnText}>
                  {lpUploading
                    ? lpUploadProgress.total
                      ? `Uploading ${lpUploadProgress.index}/${lpUploadProgress.total}`
                      : "Uploading..."
                    : "Save"}
                </Text>
              </Pressable>
              <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => setLpComposerVisible(false)}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
            </View>
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Boost Pack Modal */}
      <Modal visible={boostShopVisible} animationType="slide" onRequestClose={() => setBoostShopVisible(false)}>
        <ImageBackground
          source={null}
          resizeMode="cover"
          style={{ flex: 1 }}
          pointerEvents="box-none"
        >
          <View pointerEvents="none" style={styles.appBgOverlay} />
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.chatHeader}>
              <Pressable style={styles.chatHeaderBtn} onPress={() => setBoostShopVisible(false)}>
                <Text style={styles.chatHeaderBtnText}>Back</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.chatTitle} numberOfLines={1}>Boost packs</Text>
                <Text style={styles.chatSub} numberOfLines={1}>Buy extra boosts anytime</Text>
              </View>
              <View style={{ width: 56 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
              <View style={[styles.card, { marginTop: 6 }]}>
                <Text style={styles.sectionTitle}>Extra Boosts</Text>
                <Text style={styles.helper}>Spotlight a loop near the top of Loop+ posts.</Text>
                {BOOST_PACKS.map((pack) => (
                  <View key={pack.key} style={[styles.perkBox, { marginTop: 12 }]}>
                    <Text style={styles.perkTitle}>
                      {pack.count} Boost{pack.count > 1 ? "s" : ""}
                    </Text>
                    <Text style={styles.perkLine}>{formatBoostPrice(pack)}</Text>
                    <Pressable
                      style={[styles.primaryBtn, { marginTop: 12 }]}
                      onPress={() => purchaseBoostPack(pack)}
                    >
                      <Text style={styles.primaryBtnText}>
                        Buy {pack.count} boost{pack.count > 1 ? "s" : ""}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </ScrollView>
          </SafeAreaView>
        </ImageBackground>
      </Modal>

      {/* Boost Picker Modal */}
      <Modal
        visible={boostPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBoostPickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setBoostPickerVisible(false)} />
          <View style={styles.planCard}>
            <Text style={styles.planTitle}>Choose a loop to boost</Text>
            <Text style={styles.planSub}>Pick one of your active loops.</Text>
            <ScrollView style={{ maxHeight: 280 }} contentContainerStyle={{ gap: 10, marginTop: 12 }}>
              {myBoostLoops.length ? (
                myBoostLoops
                  .slice()
                  .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
                  .map((loop) => {
                    const selected = loop.id === boostTargetId;
                    return (
                      <Pressable
                        key={loop.id}
                        onPress={() => setBoostTargetId(loop.id)}
                        style={[styles.radiusBtn, selected && styles.radiusBtnOn, { alignSelf: "flex-start" }]}
                      >
                        <Text style={[styles.radiusBtnText, selected && styles.radiusBtnTextOn]}>
                          {loop.title || "Untitled loop"}
                        </Text>
                      </Pressable>
                    );
                  })
              ) : (
                <Text style={styles.miniNote}>No active loops found for your account.</Text>
              )}
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => setBoostPickerVisible(false)}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryBtn, { flex: 1, opacity: boostTargetId ? 1 : 0.6 }]}
                onPress={() => {
                  setBoostPickerVisible(false);
                  if (boostTargetId) applyBoost(boostTargetId);
                }}
                disabled={!boostTargetId}
              >
                <Text style={styles.primaryBtnText}>Boost selected</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loop+ Plans Modal */}
      <Modal
        visible={lpPlansVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLpPlansVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setLpPlansVisible(false)}>
          <Pressable style={styles.planCard} onPress={() => {}}>
            <Text style={styles.planTitle}>Choose your plan</Text>
            <Text style={styles.planSub}>Simple pricing. Cancel anytime.</Text>

            <View style={[styles.perkBox, { marginTop: 12 }]}>
              <Text style={styles.perkTitle}>Includes</Text>
              <Text style={styles.perkLine}>- More active posts</Text>
              <Text style={styles.perkLine}>- More daily posts and chats</Text>
            <Text style={styles.perkLine}>- Premium sections like Hire and Boost</Text>
              <Text style={styles.perkLine}>- Proximity alerts and enhanced visibility</Text>
              <Text style={styles.perkLine}>- Map access with pin drops for offers/help</Text>
            </View>

            <Pressable style={styles.planOption} onPress={() => choosePlan("monthly")}>
              <View style={{ flex: 1 }}>
                <Text style={styles.planOptionTitle}>{rcPlanMeta.monthly?.title ?? "Loop+ Monthly"}</Text>
                <Text style={styles.planOptionDesc}>
                  Length: {rcPlanMeta.monthly?.length ?? "1 month"} • Auto-renews
                </Text>
              </View>
              <Text style={styles.planOptionPrice}>{rcPricing.monthly}</Text>
            </Pressable>

            <Pressable style={[styles.planOption, styles.planOptionBest]} onPress={() => choosePlan("yearly")}>
              <View style={{ flex: 1 }}>
                <Text style={styles.planOptionTitle}>{rcPlanMeta.yearly?.title ?? "Loop+ Yearly"}</Text>
                <Text style={styles.planOptionDesc}>
                  Length: {rcPlanMeta.yearly?.length ?? "12 months"} • Auto-renews
                </Text>
              </View>
              <Text style={styles.planOptionPrice}>{rcPricing.yearly}</Text>
            </Pressable>

            <Text style={styles.planLegalText}>
              Subscriptions auto-renew unless canceled at least 24 hours before renewal. Manage or cancel anytime in your
              App Store account settings.
            </Text>
            <View style={styles.planLegalLinks}>
              <Pressable onPress={() => openExternalUrl(TERMS_URL, "Terms of Use")}>
                <Text style={styles.planLegalLink}>Terms of Use (EULA)</Text>
              </Pressable>
              <Pressable onPress={() => openExternalUrl(PRIVACY_URL, "Privacy Policy")}>
                <Text style={styles.planLegalLink}>Privacy Policy</Text>
              </Pressable>
            </View>

            <Pressable style={[styles.secondaryBtn, { marginTop: 12 }]} onPress={() => setLpPlansVisible(false)}>
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Legal Modal */}
      <Modal visible={legalModalVisible} animationType="slide" onRequestClose={() => setLegalModalVisible(false)}>
        <ImageBackground
          source={null}
          resizeMode="cover"
          style={{ flex: 1 }}
          pointerEvents="box-none"
        >
          <View pointerEvents="none" style={styles.appBgOverlay} />
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.chatHeader}>
              <Pressable style={styles.chatHeaderBtn} onPress={() => setLegalModalVisible(false)}>
                <Text style={styles.chatHeaderBtnText}>Back</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.chatTitle} numberOfLines={1}>
                  {LEGAL_DOCS[legalDocKey]?.title ?? "Legal"}
                </Text>
              </View>
              <View style={{ width: 56 }} />
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
              <Text style={styles.legalBody}>
                {LEGAL_DOCS[legalDocKey]?.body ?? ""}
              </Text>
            </ScrollView>
          </SafeAreaView>
        </ImageBackground>
      </Modal>

      {/* About Modal */}
      <Modal visible={aboutVisible} animationType="slide" onRequestClose={() => setAboutVisible(false)}>
        <ImageBackground
          source={null}
          resizeMode="cover"
          style={{ flex: 1 }}
          pointerEvents="box-none"
        >
          <View pointerEvents="none" style={styles.appBgOverlay} />
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.chatHeader}>
              <Pressable style={styles.chatHeaderBtn} onPress={() => setAboutVisible(false)}>
                <Text style={styles.chatHeaderBtnText}>Back</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.chatTitle} numberOfLines={1}>{ABOUT_COPY.title}</Text>
              </View>
              <View style={{ width: 56 }} />
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
              <Text style={styles.legalBody}>{ABOUT_COPY.body}</Text>
            </ScrollView>
          </SafeAreaView>
        </ImageBackground>
      </Modal>

      {/* Tab Tips Modal */}
      <Modal visible={tipsVisible} animationType="slide" onRequestClose={() => setTipsVisible(false)}>
        <ImageBackground
          source={null}
          resizeMode="cover"
          style={{ flex: 1 }}
          pointerEvents="box-none"
        >
          <View pointerEvents="none" style={styles.appBgOverlay} />
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.chatHeader}>
              <Pressable style={styles.chatHeaderBtn} onPress={() => setTipsVisible(false)}>
                <Text style={styles.chatHeaderBtnText}>Back</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.chatTitle} numberOfLines={1}>Tab tooltips</Text>
              </View>
              <View style={{ width: 56 }} />
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
              {TAB_TOOLTIPS.map((tip) => (
                <View key={tip.title} style={[styles.card, { marginTop: 10 }]}>
                  <Text style={styles.sectionTitle}>{tip.title}</Text>
                  <Text style={styles.helper}>{tip.body}</Text>
                </View>
              ))}
            </ScrollView>
          </SafeAreaView>
        </ImageBackground>
      </Modal>

      {/* Onboarding Modal */}
      <Modal
        visible={onboardingVisible && !session?.user}
        animationType="fade"
        transparent
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.planCard}>
            <Text style={styles.planTitle}>{ONBOARDING_SCREENS[onboardingStep]?.title ?? "Welcome"}</Text>
            <Text style={styles.planSub}>
              {ONBOARDING_SCREENS[onboardingStep]?.body ?? ""}
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              {onboardingStep > 0 ? (
                <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => setOnboardingStep((s) => Math.max(0, s - 1))}>
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </Pressable>
              ) : null}
              {onboardingStep < ONBOARDING_SCREENS.length - 1 ? (
                <Pressable style={[styles.primaryBtn, { flex: 1 }]} onPress={() => setOnboardingStep((s) => Math.min(ONBOARDING_SCREENS.length - 1, s + 1))}>
                  <Text style={styles.primaryBtnText}>Next</Text>
                </Pressable>
              ) : (
                <Pressable style={[styles.primaryBtn, { flex: 1 }]} onPress={finishOnboarding}>
                  <Text style={styles.primaryBtnText}>Get started</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* -------------------------------- Screens -------------------------------- */

function AuthScreen({
  mode,
  email,
  password,
  displayName,
  error,
  onChangeEmail,
  onChangePassword,
  onChangeDisplayName,
  onToggleMode,
  onSubmit,
}) {
  const isSignIn = mode === "signIn";
  const introAnim = useRef(new Animated.Value(0)).current;
  const videoRef = useRef(null);
  const [authCardVisible, setAuthCardVisible] = useState(false);

  useEffect(() => {
    Animated.timing(introAnim, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const introY = introAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  return (
    <ImageBackground
      source={null}
      resizeMode="cover"
      style={{ flex: 1 }}
      pointerEvents="box-none"
    >
      <LinearGradient
        colors={["#e7f2ff", "#cfe4ff", "#ffe0c4"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Video
        ref={videoRef}
        source={require("./assets/videos/auth-bg.mp4")}
        style={styles.authVideo}
        resizeMode="cover"
        isLooping
        isMuted
        shouldPlay
      />
      <View pointerEvents="none" style={styles.authGlowA} />
      <View pointerEvents="none" style={styles.authGlowB} />
      <View pointerEvents="none" style={styles.authGlowC} />
      <View pointerEvents="none" style={styles.authBgOverlay} />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        >
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
            <Animated.View style={{ opacity: introAnim, transform: [{ translateY: introY }] }}>
              <Text style={styles.authLeadTitle}>Welcome to LocalLoop</Text>
              <Text style={styles.authLeadText}>
                Bringing community together again. Share what you need, offer help, and find nearby
                neighbors fast. Post a loop, chat instantly, and get things done together.
              </Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
        <View style={styles.authTabs}>
          <Pressable
            style={[styles.authTabBtn, isSignIn && styles.authTabBtnActive]}
            onPress={() => {
              if (!isSignIn) onToggleMode();
              setAuthCardVisible(true);
            }}
          >
            <Text style={[styles.authTabText, isSignIn && styles.authTabTextActive]}>Sign in</Text>
          </Pressable>
          <Pressable
            style={[styles.authTabBtn, !isSignIn && styles.authTabBtnActive]}
            onPress={() => {
              if (isSignIn) onToggleMode();
              setAuthCardVisible(true);
            }}
          >
            <Text style={[styles.authTabText, !isSignIn && styles.authTabTextActive]}>Sign up</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <Modal
        visible={authCardVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAuthCardVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.card, { marginHorizontal: 16 }]}>
            <Text style={styles.sectionTitle}>{isSignIn ? "Sign in" : "Create account"}</Text>
            <Text style={styles.helper}>
              {isSignIn ? "Sign in to access your community." : "Create an account to post and chat."}
            </Text>

            <Text style={[styles.label, { marginTop: 12 }]}>Email</Text>
            <TextInput
              value={email}
              onChangeText={onChangeEmail}
              placeholder="you@example.com"
              placeholderTextColor="rgba(43,43,43,0.35)"
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={[styles.label, { marginTop: 10 }]}>Password</Text>
            <TextInput
              value={password}
              onChangeText={onChangePassword}
              placeholder="Password"
              placeholderTextColor="rgba(43,43,43,0.35)"
              style={styles.input}
              secureTextEntry
            />
            {!isSignIn ? (
              <>
                <Text style={[styles.label, { marginTop: 10 }]}>Display name</Text>
                <TextInput
                  value={displayName}
                  onChangeText={onChangeDisplayName}
                  placeholder="Your name"
                  placeholderTextColor="rgba(43,43,43,0.35)"
                  style={styles.input}
                />
              </>
            ) : null}

            {error ? (
              <Text style={[styles.helper, { color: "#a23a2a" }]}>{error}</Text>
            ) : null}

            <Pressable style={[styles.primaryBtn, { marginTop: 14 }]} onPress={onSubmit}>
              <Text style={styles.primaryBtnText}>{isSignIn ? "Sign in" : "Create account"}</Text>
            </Pressable>

            <Pressable style={[styles.secondaryBtn, { marginTop: 10 }]} onPress={() => setAuthCardVisible(false)}>
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

function FeedScreen({ store, loops, sortAnim, scrollToTopKey, isLoopPlus, boostsUsedWeek, weeklyBoostLimit, extraBoosts, boostsAvailable, onOpenPlans, onUseBoost, onOpenBoostShop, onSetFilter, onSetRadius, onRefreshLocation, onToggleSort, onOpenChats, onMessage, onDelete, onEdit, onOpenImage, onToggleFollow, currentUserId, isAdmin, followingSet }) {
  const activeFilter = store.feed.filter;
  const activeRadius = store.feed.radiusMiles;
  const [actionLoopId, setActionLoopId] = useState(null);
  const listRef = useRef(null);
  const LockedOverlay = BlurView ?? View;
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRange = Math.max(0, headerHeight + 12);
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerHidden = useRef(false);
  const [headerHiddenState, setHeaderHiddenState] = useState(false);
  const upAccumRef = useRef(0);
  const downAccumRef = useRef(0);
  const isDraggingRef = useRef(false);

  const showHeader = () => {
    if (!headerHidden.current) return;
    headerHidden.current = false;
    setHeaderHiddenState(false);
    Animated.timing(headerTranslateY, {
      toValue: 0,
      duration: 420,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const hideHeader = () => {
    if (headerHidden.current) return;
    headerHidden.current = true;
    setHeaderHiddenState(true);
    Animated.timing(headerTranslateY, {
      toValue: -headerRange,
      duration: 420,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const nearW = 90;
  const recentW = 96;
  const chatsW = 84;
  const knobLeft = sortAnim.interpolate({ inputRange: [0, 1], outputRange: [0, nearW] });

  useEffect(() => {
    if (!scrollToTopKey) return;
    const id = setTimeout(() => {
      listRef.current?.scrollToEnd?.({ animated: true });
    }, 0);
    return () => clearTimeout(id);
  }, [scrollToTopKey]);

  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        style={[
          styles.card,
          {
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            zIndex: 10,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Text style={styles.sectionTitle}>Nearby loops</Text>
          <Pressable style={styles.smallBtn} onPress={onRefreshLocation}>
            <Text style={styles.smallBtnText}>Refresh location</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12, gap: 10 }}>
          {FEED_FILTERS.map((c) => (
            <Pressable key={c.key} onPress={() => onSetFilter(c.key)} style={[styles.chip, activeFilter === c.key && styles.chipActive]}>
              <Text style={[styles.chipText, activeFilter === c.key && styles.chipTextActive]}>{c.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={styles.label}>Radius</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {RADIUS_OPTIONS.map((r) => {
              const on = activeRadius === r;
              return (
                <Pressable key={r} onPress={() => onSetRadius(r)} style={[styles.radiusBtn, on && styles.radiusBtnOn]}>
                  <Text style={[styles.radiusBtnText, on && styles.radiusBtnTextOn]}>{r}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

          <View style={{ marginTop: 14 }}>
            <Text style={styles.label}>Sort</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 }}>
              <View style={styles.sortTrack}>
                <Animated.View style={[styles.sortKnob, { left: knobLeft, width: nearW }]} />
                <View style={{ flexDirection: "row" }}>
                  <Pressable style={[styles.sortSlot, { width: nearW }]} onPress={onToggleSort}>
                    <Text style={styles.sortText}>Near</Text>
                  </Pressable>
                  <Pressable style={[styles.sortSlot, { width: recentW }]} onPress={onToggleSort}>
                    <Text style={styles.sortText}>Recent</Text>
                  </Pressable>
                  <Pressable style={[styles.sortSlot, styles.sortSlotChats, { width: chatsW }]} onPress={onOpenChats}>
                    <Text style={[styles.sortText, styles.sortTextChats]}>Chats</Text>
                  </Pressable>
                </View>
              </View>
            </View>
            <Text style={styles.sortHint}>Tap to toggle</Text>
          </View>

          <View style={{ marginTop: 14 }}>
            <Text style={styles.label}>Boosts</Text>
            <Text style={styles.helper}>
              {isLoopPlus
                ? `Loop+ includes ${LOOPPLUS_WEEKLY_BOOSTS} boosts per week. Buy more anytime.`
                : `Free users get ${FREE_WEEKLY_BOOSTS} boost per week. Buy more anytime.`}
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <Pressable
                style={[styles.primaryBtn, { flex: 1, opacity: boostsAvailable > 0 ? 1 : 0.6 }]}
                onPress={onUseBoost}
                disabled={boostsAvailable <= 0}
              >
                <Text style={styles.primaryBtnText}>
                  {boostsAvailable > 0 ? "Use a boost" : "No boosts left"}
                </Text>
              </Pressable>
              <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={onOpenBoostShop}>
                <Text style={styles.secondaryBtnText}>Get more boosts</Text>
              </Pressable>
            </View>
            <Text style={styles.miniNote}>
              This week: {boostsUsedWeek}/{weeklyBoostLimit} used
              {extraBoosts > 0 ? ` • ${extraBoosts} extra` : ""}
            </Text>
          </View>

        {/* Promo card removed to prioritize the feed */}
      </Animated.View>

      <Animated.FlatList
        ref={listRef}
        data={loops}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingBottom: 18,
          paddingTop: headerHiddenState ? 12 : headerHeight ? headerHeight + 12 : 12,
        }}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          const dy = y - lastScrollY.current;
          lastScrollY.current = y;
          if (y <= 0 && !headerHidden.current) {
            showHeader();
            return;
          }
          if (dy > 0) {
            upAccumRef.current += dy;
            downAccumRef.current = 0;
            if (!headerHidden.current && upAccumRef.current >= 40) {
              hideHeader();
              upAccumRef.current = 0;
            }
          } else if (dy < 0) {
            if (!isDraggingRef.current) return;
            downAccumRef.current += Math.abs(dy);
            upAccumRef.current = 0;
            if (headerHidden.current && downAccumRef.current >= 40) {
              showHeader();
              downAccumRef.current = 0;
            }
          }
        }}
        onScrollBeginDrag={() => {
          isDraggingRef.current = true;
        }}
        onScrollEndDrag={() => {
          isDraggingRef.current = false;
          upAccumRef.current = 0;
          downAccumRef.current = 0;
        }}
        onMomentumScrollBegin={() => {
          isDraggingRef.current = false;
        }}
        onMomentumScrollEnd={() => {
          isDraggingRef.current = false;
          upAccumRef.current = 0;
          downAccumRef.current = 0;
        }}
        ListEmptyComponent={
          <View style={[styles.card, { marginTop: 12 }]}>
            <Text style={{ fontSize: 18, fontWeight: "900", color: "#2b2b2b" }}>No loops in range</Text>
            <Text style={{ marginTop: 0, color: "rgba(43,43,43,0.65)" }}>Try a bigger radius, refresh location, or post a new loop.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const actionsVisible = actionLoopId === item.id;
          const canEdit = !!item.userId && (currentUserId === item.userId || isAdmin);
          const locked = item.isLoopPlus && !isLoopPlus;
          return (
            <Pressable
              style={[styles.loopCard, { marginTop: 12 }]}
              onLongPress={locked ? undefined : () => setActionLoopId(item.id)}
              onPress={() => {
                if (locked) return onOpenPlans?.();
                if (actionsVisible) setActionLoopId(null);
              }}
              delayLongPress={250}
            >
              {locked ? (
                <LockedOverlay
                  pointerEvents="none"
                  style={styles.lockedOverlay}
                  intensity={BlurView ? 28 : undefined}
                  tint={BlurView ? "light" : undefined}
                >
                  <View style={styles.lockedBadge}>
                    <Text style={styles.lockedBadgeText}>Loop+ locked</Text>
                  </View>
                  <Text style={styles.lockedText}>Unlock Loop+ to view and message.</Text>
                </LockedOverlay>
              ) : null}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.loopTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    <View
                      style={[
                        styles.typePill,
                        item.type === "loopplus_free" || item.type === "loopplus_hire"
                          ? loopPlusTypePillStyle(item.loopPlusKind ?? (item.type === "loopplus_hire" ? "hire" : "free"))
                          : typePillStyle(item.type),
                      ]}
                    >
                      <Text style={styles.typePillText}>
                        {item.type === "loopplus_free"
                          ? "Free"
                          : item.type === "loopplus_hire"
                          ? "Hire"
                          : item.type === "loopplus_toolshare"
                          ? "Tool Share"
                          : item.type === "loopplus_urgent"
                          ? "Urgent"
                          : prettyType(item.type)}
                      </Text>
                    </View>
                    {item.boostedAt ? (
                      <View style={[styles.typePill, styles.boostPill]}>
                        <Text style={[styles.typePillText, styles.boostPillText]}>Boosted</Text>
                      </View>
                    ) : null}
                    <Text style={styles.loopMeta}>
                      {typeof item.distanceMiles === "number" ? `${item.distanceMiles.toFixed(1)} mi` : "Nearby"} - {item.locationLabel ?? "Near you"}
                    </Text>
                  </View>
                </View>

                <View style={{ alignItems: "flex-end", gap: 6, alignSelf: "center" }}>
                  {actionsVisible && !locked ? (
                    <>
                      {canEdit ? (
                        <Pressable style={styles.editBtn} onPress={() => onEdit?.(item)}>
                          <Text style={styles.editBtnText}>Edit</Text>
                        </Pressable>
                      ) : null}
                      {item.userId && (currentUserId === item.userId || isAdmin) ? (
                        <Pressable style={styles.deleteBtn} onPress={() => onDelete(item)}>
                          <Text style={styles.deleteBtnText}>Delete</Text>
                        </Pressable>
                      ) : null}
                      <Pressable style={styles.messageBtn} onPress={() => onMessage(item)}>
                        <Text style={styles.messageBtnText}>Message</Text>
                      </Pressable>
                    </>
                  ) : null}
                  {item.userId && currentUserId && item.userId !== currentUserId && !locked ? (
                    <Pressable
                      style={[styles.followBtn, followingSet?.has(item.userId) && styles.followBtnOn]}
                      onPress={() => onToggleFollow?.(item.userId)}
                    >
                      <Text style={[styles.followBtnText, followingSet?.has(item.userId) && styles.followBtnTextOn]}>
                        {followingSet?.has(item.userId) ? "Following" : "Follow"}
                      </Text>
                    </Pressable>
                  ) : null}
                  <Pill text={item.author ?? "Neighbor"} tone="peach" />
                  <Pill tiny text={getTrustBadge(item.trustScore).label} tone={getTrustBadge(item.trustScore).tone} />
                </View>
              </View>

              <Text style={styles.loopDetails} numberOfLines={4}>
                {item.details}
              </Text>

                {Array.isArray(item.images) && item.images.length && !locked ? (
                  <View style={styles.loopImageRow}>
                    {item.images.slice(0, 4).map((uri) => (
                      <Pressable key={uri} onPress={() => onOpenImage?.(uri)}>
                        <Image source={{ uri }} style={styles.loopImage} />
                      </Pressable>
                    ))}
                  </View>
                ) : null}

              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                <Text style={styles.loopMeta}>
                  Posted {formatRelative(now() - (item.createdAt ?? now()))} - Ends {formatTime(item.expiresAt ?? now())}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function MapScreen({
  isLoopPlus,
  loops,
  location,
  radiusMiles,
  mapRegion,
  followUser,
  onToggleFollow,
  onRegionChange,
  onRecenter,
  selectedLoop,
  onSelectLoop,
  onMessageLoop,
  onToggleAccept,
  loopAccepts,
  onOpenDirections,
  onUpgrade,
}) {
  if (!isLoopPlus) {
    return (
      <View style={[styles.card, { marginTop: 10 }]}>
        <Text style={styles.sectionTitle}>Map</Text>
        <Text style={styles.helper}>Live map access is available for Loop+ members.</Text>
        <Pressable style={[styles.primaryBtn, { marginTop: 12 }]} onPress={onUpgrade}>
          <Text style={styles.primaryBtnText}>Upgrade to Loop+</Text>
        </Pressable>
        <Text style={[styles.miniNote, { marginTop: 8 }]}>Non-members can coordinate through chat.</Text>
      </View>
    );
  }

  if (!MapView || !Marker) {
    return (
      <View style={[styles.card, { marginTop: 10 }]}>
        <Text style={styles.sectionTitle}>Map unavailable</Text>
        <Text style={styles.helper}>Install react-native-maps to enable the Loop+ map.</Text>
      </View>
    );
  }

  const activeLoops = cleanExpiredLoops(loops);
  const loopsWithCoords = activeLoops.filter((l) => isValidCoord(l.lat) && isValidCoord(l.lon));
  const baseLat = location?.lat;
  const baseLon = location?.lon;
  const hasBase = isValidCoord(baseLat) && isValidCoord(baseLon);
  const mapRadius = typeof radiusMiles === "number" ? radiusMiles : 10;
  const loopsInRange = hasBase
    ? loopsWithCoords.filter((l) => {
        const dist = distanceMilesBetween(baseLat, baseLon, l.lat, l.lon);
        return dist === null || dist <= mapRadius;
      })
    : loopsWithCoords;

  const acceptState = selectedLoop ? loopAccepts?.[selectedLoop.id] ?? { meAccepted: false, otherAccepted: false } : null;
  const readyForDirections = !!acceptState?.meAccepted && !!acceptState?.otherAccepted;

  const region =
    mapRegion ??
    (hasBase
      ? { latitude: baseLat, longitude: baseLon, latitudeDelta: 0.03, longitudeDelta: 0.03 }
      : { latitude: 0, longitude: 0, latitudeDelta: 30, longitudeDelta: 30 });

  const typeLabel = (typeKey) => {
    if (typeKey === "loopplus_free") return "Loop+ Free";
    if (typeKey === "loopplus_hire") return "Loop+ Hire";
    return prettyType(typeKey);
  };

  return (
    <View style={{ flex: 1, marginTop: 10 }}>
      <View style={styles.mapTopRow}>
        <Text style={styles.sectionTitle}>Live map</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable style={styles.smallBtn} onPress={onRecenter}>
            <Text style={styles.smallBtnText}>Center</Text>
          </Pressable>
          <Pressable style={[styles.smallBtn, followUser && styles.smallBtnOn]} onPress={onToggleFollow}>
            <Text style={[styles.smallBtnText, followUser && styles.smallBtnTextOn]}>{followUser ? "Following" : "Follow"}</Text>
          </Pressable>
        </View>
      </View>

      {!hasBase ? (
        <View style={[styles.perkBox, { marginTop: 10 }]}>
          <Text style={styles.perkTitle}>Location needed</Text>
          <Text style={styles.perkLine}>Enable location to see nearby loops on the map.</Text>
        </View>
      ) : null}

      <View style={{ flex: 1, marginTop: 10, borderRadius: 16, overflow: "hidden" }}>
        <MapView
          style={{ flex: 1 }}
          provider={PROVIDER_GOOGLE ?? undefined}
          region={region}
          onRegionChangeComplete={onRegionChange}
          showsUserLocation
          followsUserLocation={followUser}
          showsMyLocationButton
          onPress={(e) => {
            if (e?.nativeEvent?.action === "marker-press") return;
            onSelectLoop(null);
          }}
        >
            {loopsInRange.map((loop) => {
              const typeKey = typeof loop.type === "string" ? loop.type.toLowerCase() : "info";
              const pinColor =
                typeKey === "loopplus_free"
                  ? BRAND_COLORS.yellow
                  : typeKey === "loopplus_hire"
                  ? BRAND_COLORS.teal
                  : typeKey === "need"
                  ? BRAND_COLORS.orange
                  : typeKey === "offer"
                  ? BRAND_COLORS.blue
                  : BRAND_COLORS.green;
              return (
                <Marker
                key={loop.id}
                coordinate={{ latitude: loop.lat, longitude: loop.lon }}
                pinColor={pinColor}
                onPress={() => onSelectLoop(loop.id)}
              />
            );
          })}
        </MapView>
      </View>

      {selectedLoop ? (
        <View style={styles.mapSheet}>
          <Text style={styles.mapSheetTitle} numberOfLines={2}>
            {selectedLoop.title}
          </Text>
          <Text style={styles.mapSheetMeta}>
            {typeLabel(selectedLoop.type)} - {selectedLoop.author ?? "Neighbor"}
          </Text>
          <Text style={styles.mapSheetDetails} numberOfLines={3}>
            {selectedLoop.details}
          </Text>
          <View style={styles.mapSheetRow}>
            <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => onMessageLoop(selectedLoop)}>
              <Text style={styles.secondaryBtnText}>Message</Text>
            </Pressable>
            <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => onToggleAccept(selectedLoop.id, "meAccepted")}>
              <Text style={styles.secondaryBtnText}>{acceptState?.meAccepted ? "Help offered" : "Offer help"}</Text>
            </Pressable>
          </View>
          <View style={styles.mapSheetRow}>
            <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => onToggleAccept(selectedLoop.id, "otherAccepted")}>
              <Text style={styles.secondaryBtnText}>{acceptState?.otherAccepted ? "Accepted" : "Mark accepted"}</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, { flex: 1, opacity: readyForDirections ? 1 : 0.6 }]}
              onPress={() => (readyForDirections ? onOpenDirections(selectedLoop) : null)}
              disabled={!readyForDirections}
            >
              <Text style={styles.primaryBtnText}>Directions</Text>
            </Pressable>
          </View>
          <Text style={styles.miniNote}>Directions unlock after both sides accept.</Text>
        </View>
      ) : null}
    </View>
  );
}

function NewScreen({
  signedIn,
  onSignIn,
  newType,
  setNewType,
  newTitle,
  setNewTitle,
  newDetails,
  setNewDetails,
  newTimeKey,
  setNewTimeKey,
  newRadius,
  setNewRadius,
  editingLoop,
  onCancelEdit,
  onCancelNew,
  onPost,
}) {
  if (!signedIn) {
    return (
      <View style={[styles.card, { marginTop: 10 }]}>
        <Text style={{ fontSize: 20, fontWeight: "900", color: "#2b2b2b" }}>You're signed out</Text>
        <Text style={{ marginTop: 8, color: "rgba(43,43,43,0.65)" }}>Sign in to post loops and start chats.</Text>
        <Pressable style={[styles.primaryBtn, { marginTop: 14 }]} onPress={onSignIn}>
          <Text style={styles.primaryBtnText}>Sign in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, styles.newLoopCard, { marginTop: 10 }]}>
          <Text style={styles.sectionTitle}>{editingLoop?.id ? "Edit loop" : "Post a loop"}</Text>
          <Text style={styles.helper}>
            {editingLoop?.id
              ? "Update your loop details and save changes."
              : "Pick a type, add details, choose a time window, then post."}
          </Text>

          <Text style={styles.label}>Type</Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
            {POST_TYPES.map((t) => {
              const on = newType === t.key;
              return (
                <Pressable key={t.key} onPress={() => setNewType(t.key)} style={[styles.typeBtn, on && styles.typeBtnOn]}>
                  <Text style={[styles.typeBtnText, on && styles.typeBtnTextOn]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { marginTop: 14 }]}>Title</Text>
          <TextInput
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="Short + scannable"
            placeholderTextColor="rgba(43,43,43,0.35)"
            style={styles.input}
            autoCorrect
            spellCheck
            autoComplete="off"
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Details</Text>
          <TextInput
            value={newDetails}
            onChangeText={setNewDetails}
            placeholder="Add context (where, when, what)..."
            placeholderTextColor="rgba(43,43,43,0.35)"
            style={[styles.input, { height: 110, textAlignVertical: "top" }]}
            multiline
            autoCorrect
            spellCheck
            autoComplete="off"
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Time window</Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
            {TIME_WINDOWS.map((w) => {
              const on = newTimeKey === w.key;
              return (
                <Pressable key={w.key} onPress={() => setNewTimeKey(w.key)} style={[styles.radiusBtn, on && styles.radiusBtnOn]}>
                  <Text style={[styles.radiusBtnText, on && styles.radiusBtnTextOn]}>{w.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Radius</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            {RADIUS_OPTIONS.map((r) => {
              const on = newRadius === r;
              return (
                <Pressable key={r} onPress={() => setNewRadius(r)} style={[styles.radiusBtn, on && styles.radiusBtnOn]}>
                  <Text style={[styles.radiusBtnText, on && styles.radiusBtnTextOn]}>{r}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={[styles.primaryBtn, { marginTop: 16 }]} onPress={onPost}>
            <Text style={styles.primaryBtnText}>{editingLoop?.id ? "Save changes" : "Post loop"}</Text>
          </Pressable>
          {editingLoop?.id ? (
            <Pressable style={[styles.secondaryBtn, { marginTop: 10 }]} onPress={onCancelEdit}>
              <Text style={styles.secondaryBtnText}>Cancel edit</Text>
            </Pressable>
          ) : (
            <Pressable style={[styles.secondaryBtn, { marginTop: 10 }]} onPress={onCancelNew}>
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </Pressable>
          )}

          <Text style={styles.miniNote}>Posts expire after the time window you choose.</Text>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ChatsScreen({ threads, onOpenThread, onFindLoops }) {
  const sorted = [...(threads ?? [])].sort(
    (a, b) => new Date(b.last_message_at ?? 0) - new Date(a.last_message_at ?? 0)
  );
  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.card, { marginTop: 10 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Text style={styles.sectionTitle}>Chats</Text>
          <Pressable style={styles.smallBtn} onPress={onFindLoops}>
            <Text style={styles.smallBtnText}>Find loops</Text>
          </Pressable>
        </View>
        <Text style={styles.helper}>Your chats are synced to your account. Tap one to open.</Text>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingBottom: 18 }}
        ListEmptyComponent={
          <View style={[styles.card, { marginTop: 12 }]}>
            <Text style={{ fontSize: 18, fontWeight: "900", color: "#2b2b2b" }}>No chats yet</Text>
            <Text style={{ marginTop: 8, color: "rgba(43,43,43,0.65)" }}>Go to Feed and tap "Message" on a loop to start a thread.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => onOpenThread(item.id)} style={[styles.threadRow, { marginTop: 12 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.threadTitle} numberOfLines={1}>
                {item.loops?.title ?? "Thread"}
              </Text>
              <Text style={styles.threadMeta} numberOfLines={1}>
                {(item.last_message ?? "No messages") +
                  " - " +
                  formatRelative(now() - (item.last_message_at ? new Date(item.last_message_at).getTime() : now()))}
              </Text>
            </View>
            <Text style={styles.threadChevron}>{'>'}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function LoopPlusHub({
  isLoopPlus,
  isAdmin,
  section,
  onSetSection,
  onOpenPlans,
  onRestore,
  loopPlusData,
  loopPlusLoading,
  onOpenComposer,
  onUseBoost,
  boostsUsedWeek,
  weeklyBoostLimit,
  extraBoosts,
  boostsAvailable,
  loops,
  boostTargetId,
  onSetBoostTarget,
  boostPickerVisible,
  onSetBoostPickerVisible,
  onOpenBoostShop,
  activePlan,
  onMessageLoopPlus,
  onDeleteLoopPlus,
  onEditLoopPlus,
  onOpenImage,
  currentUserId,
  onToggleFollow,
  followingSet,
}) {
  const unlocked = isLoopPlus;
  const allowedSections = new Set(["all", "free", "hire", "toolshare", "urgent", "boost"]);
  const safeSection = unlocked && allowedSections.has(section) ? section : "all";
  const showUpgradeWall = !unlocked;
  const myLoops = unlocked
    ? cleanExpiredLoops(loops ?? []).filter((loop) => loop.userId === currentUserId)
    : [];
  const selectedBoostLoop = boostTargetId ? myLoops.find((loop) => loop.id === boostTargetId) : null;

  const openBoostPicker = () => {
    if (!myLoops.length) {
      Alert.alert("No loops to boost", "Post a loop first, then choose one to boost.");
      return;
    }
    const choices = myLoops
      .slice()
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, 6)
      .map((loop) => ({
        text: loop.title?.slice(0, 48) || "Untitled loop",
        onPress: () => onSetBoostTarget?.(loop.id),
      }));
    Alert.alert("Choose a loop", "Select the loop to boost.", [
      ...choices,
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 18 }}>
      <View style={[styles.card, { marginTop: 10 }]}>
        <Text style={styles.sectionTitle}>Loop+</Text>
          <Text style={styles.helper}>All premium features in one clean space.</Text>
          {unlocked ? (
            <Text style={[styles.miniNote, { marginTop: 6 }]}>
              Active plan: {activePlan ? (activePlan === "yearly" ? "Yearly" : "Monthly") : "None"}
            </Text>
          ) : (
            <View style={{ marginTop: 6 }}>
              <Text style={styles.miniNote}>Unlock with Loop+:</Text>
              <Text style={styles.miniNote}>• All tab: everything in one premium feed</Text>
              <Text style={styles.miniNote}>• Free: giveaways + mutual aid</Text>
              <Text style={styles.miniNote}>• Hire: quick local help & tasks</Text>
              <Text style={styles.miniNote}>• Weekly Boosts: spotlight up to 3 loops per week</Text>
            </View>
          )}
          {loopPlusLoading ? (
            <Text style={[styles.miniNote, { marginTop: 6 }]}>Syncing Loop+ posts...</Text>
          ) : null}
          {!unlocked ? (
            <View style={{ marginTop: 8, flexDirection: "row", gap: 8 }}>
              <Pressable onPress={onOpenPlans}>
                <Pill tiny text="Upgrade to Loop+" tone="danger" />
              </Pressable>
              <Pressable onPress={onRestore}>
                <Pill tiny text="Restore purchases" tone="sky" />
              </Pressable>
            </View>
          ) : null}
          {!unlocked ? (
            <>
              <Text style={styles.planLegalText}>
                Terms and privacy links for Loop+ subscriptions:
              </Text>
              <View style={styles.planLegalLinks}>
                <Pressable onPress={() => openExternalUrl(TERMS_URL, "Terms of Use")}>
                  <Text style={styles.planLegalLink}>Terms of Use (EULA)</Text>
                </Pressable>
                <Pressable onPress={() => openExternalUrl(PRIVACY_URL, "Privacy Policy")}>
                  <Text style={styles.planLegalLink}>Privacy Policy</Text>
                </Pressable>
              </View>
            </>
          ) : null}
      </View>

      {unlocked && (
        <>
          {/* Section pills */}
          <View style={[styles.card, { marginTop: 12 }]}>
            <Text style={styles.label}>Inside Loop+</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
              {LOOPPLUS_SECTIONS.map((s) => {
                const on = safeSection === s.key;
                const meta = LOOPPLUS_SECTION_META[s.key] ?? {};
                return (
                  <Pressable key={s.key} onPress={() => onSetSection(s.key)} style={[styles.radiusBtn, on && styles.radiusBtnOn]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name={meta.icon ?? "ellipse-outline"} size={14} color={meta.color ?? BRAND_COLORS.blue} />
                      <Text style={[styles.radiusBtnText, on && styles.radiusBtnTextOn]}>{s.label}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

      {/* Upgrade wall (below Inside Loop+ card) */}
      {showUpgradeWall && (
        <View style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.upgradeTitle}>Unlock Loop+</Text>
          <Text style={styles.helper}>
            Find help faster, surface what you need, and stay safe on the road with live proximity alerts.
          </Text>

          <View style={[styles.perkBox, { marginTop: 12 }]}>
            <Text style={styles.perkTitle}>Included</Text>
            <Text style={styles.perkLine}>- Live map with colored pins while you drive</Text>
            <Text style={styles.perkLine}>- Proximity alerts when you're near an active loop</Text>
            <Text style={styles.perkLine}>- Post in Free + Hire sections</Text>
            <Text style={styles.perkLine}>- Three weekly Boosts to lift loops</Text>
            <Text style={styles.perkLine}>- Community-powered listings, not an app-run service</Text>
          </View>

          <Pressable style={[styles.primaryBtn, { marginTop: 14 }]} onPress={onOpenPlans}>
            <Text style={styles.primaryBtnText}>View plans</Text>
          </Pressable>

          <Pressable style={[styles.secondaryBtn, { marginTop: 10 }]} onPress={onRestore}>
            <Text style={styles.secondaryBtnText}>Restore purchases</Text>
          </Pressable>

          <Text style={styles.planLegalText}>
            Terms and privacy links are available here before purchase, as required for auto-renewable subscriptions.
          </Text>
          <View style={styles.planLegalLinks}>
            <Pressable onPress={() => openExternalUrl(TERMS_URL, "Terms of Use")}>
              <Text style={styles.planLegalLink}>Terms of Use (EULA)</Text>
            </Pressable>
            <Pressable onPress={() => openExternalUrl(PRIVACY_URL, "Privacy Policy")}>
              <Text style={styles.planLegalLink}>Privacy Policy</Text>
            </Pressable>
          </View>
        </View>
      )}

        {(safeSection === "all" || safeSection === "free") && (
          <LoopPlusListSection
            locked={!unlocked}
            kind="free"
            title="Free"
            subtitle="Giveaways + mutual aid in a calm, opt-in space."
            previewText="Preview: browse items, but posting requires Loop+."
            items={loopPlusData?.freeItems ?? []}
            onAdd={() => onOpenComposer("free")}
            onMessage={(item) => onMessageLoopPlus?.(item, "free")}
            onDelete={(item) => onDeleteLoopPlus?.(item, "free")}
            onEdit={(item) => onEditLoopPlus?.(item, "free")}
            onOpenImage={onOpenImage}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onToggleFollow={onToggleFollow}
            followingSet={followingSet}
          />
        )}

        {(safeSection === "all" || safeSection === "hire") && (
          <LoopPlusListSection
            locked={!unlocked}
            kind="hire"
            title="Hire"
            subtitle="Quick local help for small tasks."
            previewText="Preview: browse tasks, but posting requires Loop+."
            items={loopPlusData?.hireTasks ?? []}
            onAdd={() => onOpenComposer("hire")}
            onMessage={(item) => onMessageLoopPlus?.(item, "hire")}
            onDelete={(item) => onDeleteLoopPlus?.(item, "hire")}
            onEdit={(item) => onEditLoopPlus?.(item, "hire")}
            onOpenImage={onOpenImage}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onToggleFollow={onToggleFollow}
            followingSet={followingSet}
          />
        )}

        {(safeSection === "all" || safeSection === "toolshare") && (
          <LoopPlusListSection
            locked={!unlocked}
            kind="toolshare"
            title="Tool Share"
            subtitle="Borrow or lend tools with trusted neighbors."
            previewText="Preview: browse tools, but posting requires Loop+."
            items={loopPlusData?.toolShareItems ?? []}
            onAdd={() => onOpenComposer("toolshare")}
            onMessage={(item) => onMessageLoopPlus?.(item, "toolshare")}
            onDelete={(item) => onDeleteLoopPlus?.(item, "toolshare")}
            onEdit={(item) => onEditLoopPlus?.(item, "toolshare")}
            onOpenImage={onOpenImage}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onToggleFollow={onToggleFollow}
            followingSet={followingSet}
          />
        )}

        {(safeSection === "all" || safeSection === "urgent") && (
          <LoopPlusListSection
            locked={!unlocked}
            kind="urgent"
            title="Urgent"
            subtitle="Time‑sensitive requests that need fast replies."
            previewText="Preview: browse urgent needs, but posting requires Loop+."
            items={loopPlusData?.urgentItems ?? []}
            onAdd={() => onOpenComposer("urgent")}
            onMessage={(item) => onMessageLoopPlus?.(item, "urgent")}
            onDelete={(item) => onDeleteLoopPlus?.(item, "urgent")}
            onEdit={(item) => onEditLoopPlus?.(item, "urgent")}
            onOpenImage={onOpenImage}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onToggleFollow={onToggleFollow}
            followingSet={followingSet}
          />
        )}

      {(safeSection === "all" || safeSection === "boost") && (
        <View style={[styles.card, { marginTop: 12 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name={LOOPPLUS_SECTION_META.boost.icon} size={16} color={LOOPPLUS_SECTION_META.boost.color} />
            <Text style={styles.sectionTitle}>Boost</Text>
          </View>
          <Text style={styles.helper}>Weekly boosts let you spotlight a loop near Loop+ posts.</Text>

          {!unlocked ? (
            <View style={[styles.perkBox, { marginTop: 12 }]}>
              <Text style={styles.perkTitle}>Locked</Text>
              <Text style={styles.perkLine}>Upgrade to Loop+ to use Boost.</Text>
              <Pressable style={[styles.primaryBtn, { marginTop: 12 }]} onPress={onOpenPlans}>
                <Text style={styles.primaryBtnText}>View plans</Text>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.perkBox, { marginTop: 12 }]}>
              <Text style={styles.perkTitle}>Today</Text>
              <Text style={styles.perkLine}>Tap “Use a boost” to choose which loop to boost.</Text>
              <Text style={styles.perkLine}>Boosts used this week: {boostsUsedWeek}/{weeklyBoostLimit}</Text>
              {extraBoosts > 0 ? (
                <Text style={styles.perkLine}>Extra boosts available: {extraBoosts}</Text>
              ) : null}
              <Pressable
                style={[styles.primaryBtn, { marginTop: 12, opacity: boostsAvailable > 0 ? 1 : 0.7 }]}
                onPress={() => onSetBoostPickerVisible?.(true)}
                disabled={boostsAvailable <= 0}
              >
                <Text style={styles.primaryBtnText}>
                  {boostsAvailable <= 0 ? "No boosts left" : "Use a boost"}
                </Text>
              </Pressable>
              {boostsAvailable <= 0 ? (
                <Pressable style={[styles.secondaryBtn, { marginTop: 10 }]} onPress={onOpenBoostShop}>
                  <Text style={styles.secondaryBtnText}>Get more boosts</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>
      )}

        </>
      )}
    </ScrollView>
  );
}

function LoopPlusListSection({ locked, kind, title, subtitle, previewText, items, onAdd, onMessage, onDelete, onEdit, onOpenImage, currentUserId, isAdmin, onToggleFollow, followingSet }) {
  const sorted = [...(items ?? [])].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  const [actionItemId, setActionItemId] = useState(null);
  return (
    <View style={[styles.card, { marginTop: 12 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons
              name={(LOOPPLUS_SECTION_META[kind]?.icon ?? "sparkles-outline")}
              size={16}
              color={LOOPPLUS_SECTION_META[kind]?.color ?? BRAND_COLORS.blue}
            />
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
          <Text style={styles.helper}>{subtitle}</Text>
        </View>
        <Pressable
          style={[styles.smallBtn, { opacity: locked ? 0.7 : 1 }]}
          onPress={() => (locked ? Alert.alert("Loop+ required", previewText) : onAdd())}
        >
          <Text style={styles.smallBtnText}>+ Add</Text>
        </Pressable>
      </View>

      {locked ? (
        <View style={[styles.perkBox, { marginTop: 12 }]}>
          <Text style={styles.perkTitle}>Preview</Text>
          <Text style={styles.perkLine}>{previewText}</Text>
        </View>
      ) : null}

      <View style={{ marginTop: 12 }}>
        {sorted.length ? (
          sorted.map((it) => {
            const expiresAt = it.expiresAt ?? (it.createdAt ?? now()) + TIME_WINDOWS[3].ms;
            const canDelete = !!it.userId && (currentUserId === it.userId || isAdmin);
            const actionsVisible = actionItemId === it.id;
            return (
              <Pressable
                key={it.id}
                style={[styles.loopCard, { marginTop: 10 }]}
                onLongPress={() => setActionItemId(it.id)}
                onPress={() => actionsVisible && setActionItemId(null)}
                delayLongPress={250}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.loopTitle} numberOfLines={2}>
                      {it.title}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                      <View style={[styles.typePill, loopPlusTypePillStyle(kind)]}>
                        <Text style={styles.typePillText}>{title}</Text>
                      </View>
                      <Text style={styles.loopMeta}>{it.locationLabel ?? "Near you"}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 6, alignSelf: "center" }}>
                    {actionsVisible ? (
                      <>
                        {canDelete ? (
                          <Pressable style={styles.editBtn} onPress={() => onEdit?.(it)}>
                            <Text style={styles.editBtnText}>Edit</Text>
                          </Pressable>
                        ) : null}
                        {canDelete ? (
                          <Pressable style={styles.deleteBtn} onPress={() => onDelete?.(it)}>
                            <Text style={styles.deleteBtnText}>Delete</Text>
                          </Pressable>
                        ) : null}
                        <Pressable style={styles.messageBtn} onPress={() => onMessage?.(it)}>
                          <Text style={styles.messageBtnText}>Message</Text>
                        </Pressable>
                      </>
                    ) : null}
                    {it.userId && currentUserId && it.userId !== currentUserId ? (
                      <Pressable
                        style={[styles.followBtn, followingSet?.has(it.userId) && styles.followBtnOn]}
                        onPress={() => onToggleFollow?.(it.userId)}
                      >
                        <Text style={[styles.followBtnText, followingSet?.has(it.userId) && styles.followBtnTextOn]}>
                          {followingSet?.has(it.userId) ? "Following" : "Follow"}
                        </Text>
                      </Pressable>
                    ) : null}
                    <Pill text={it.author ?? "Neighbor"} tone="peach" />
                    <Pill tiny text={getTrustBadge(it.trustScore).label} tone={getTrustBadge(it.trustScore).tone} />
                  </View>
                </View>

                <Text style={styles.loopDetails} numberOfLines={4}>
                  {it.details}
                </Text>

                {Array.isArray(it.images) && it.images.length ? (
                  <View style={styles.loopImageRow}>
                    {it.images.slice(0, 4).map((uri) => (
                      <Pressable key={uri} onPress={() => onOpenImage?.(uri)}>
                        <Image source={{ uri }} style={styles.loopImage} />
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                  <Text style={styles.loopMeta}>
                    Posted {formatRelative(now() - (it.createdAt ?? now()))} - Ends {formatTime(expiresAt)}
                  </Text>
                </View>
              </Pressable>
            );
          })
        ) : (
          <View style={[styles.perkBox, { marginTop: 12 }]}>
            <Text style={styles.perkTitle}>Nothing yet</Text>
            <Text style={styles.perkLine}>Add your first {title.toLowerCase()} item.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function ProfileScreen({
  store,
  profile,
  userEmail,
  userDisplayName,
  signedIn,
  onSignIn,
  onSignOut,
  onEnableNotifications,
  onUpdateDisplayName,
  alertRadiusMiles,
  proximityAlertsEnabled,
  onToggleProximityAlerts,
  onSetAlertRadius,
  onOpenLegal,
  onOpenLoopPlusUpgrade,
  followingProfiles,
  onToggleFollow,
  onOpenAbout,
  onOpenTips,
}) {
  const name = signedIn
    ? displayNameOrFallback(profile?.display_name || userDisplayName)
    : "Guest";
  const email = signedIn ? (userEmail || "Email not set") : "Signed out";

  const helps = store?.stats?.helps ?? 0;
  const loops = store?.stats?.loops ?? 0;
  const badges = store?.stats?.badges ?? 0;
  const notificationsOn = !!store?.settings?.notificationsEnabled;

  const isLoopPlus = !!profile?.is_loop_plus;
  const radius = typeof alertRadiusMiles === "number" ? alertRadiusMiles : 1.5;
  const [nameDraft, setNameDraft] = useState(name);

  useEffect(() => {
    setNameDraft(name);
  }, [name]);

  return (
    <ImageBackground
      source={null}
      resizeMode="cover"
      style={{ flex: 1 }}
      pointerEvents="box-none"
    >
      <View pointerEvents="none" style={styles.profileOverlay} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 18 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.profileHeader}>your Loop</Text>
        <Text style={styles.profileSub}>Keep your neighborhood profile fresh.</Text>

        <View style={[styles.card, { marginTop: 12 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text style={styles.profileName}>{name}</Text>
            <Pill tiny text={getTrustBadge(profile?.trust_score ?? 0).label} tone={getTrustBadge(profile?.trust_score ?? 0).tone} />
          </View>
          <Text style={styles.profileEmail}>{email}</Text>

          <View style={styles.profileStatsRow}>
            <ProfileStat label="Helps" value={helps} />
            <ProfileStat label="Loops" value={loops} />
            <ProfileStat label="Badges" value={badges} />
          </View>
        </View>

      <View style={[styles.card, { marginTop: 12, padding: 12 }]}>
        {signedIn ? (
          <Pressable style={styles.signOutBtn} onPress={onSignOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.signOutBtn} onPress={onSignIn}>
            <Text style={styles.signOutText}>Sign in</Text>
          </Pressable>
        )}

        {!isLoopPlus ? (
          <Pressable style={[styles.secondaryBtn, { marginTop: 12 }]} onPress={onOpenLoopPlusUpgrade}>
            <Text style={styles.secondaryBtnText}>Open upgrade wall</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.card, { marginTop: 12 }]}>
        <Text style={styles.sectionTitle}>Following</Text>
        <Text style={styles.helper}>Neighbors you follow show up here.</Text>
        {followingProfiles?.length ? (
          <View style={{ marginTop: 10, gap: 8 }}>
            {followingProfiles.map((person) => (
              <View key={person.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Text style={styles.loopMeta}>{displayNameOrFallback(person.display_name)}</Text>
                  <Pill tiny text={getTrustBadge(person.trust_score).label} tone={getTrustBadge(person.trust_score).tone} />
                </View>
                <Pressable style={[styles.followBtn, styles.followBtnOn]} onPress={() => onToggleFollow?.(person.id)}>
                  <Text style={[styles.followBtnText, styles.followBtnTextOn]}>Unfollow</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.miniNote, { marginTop: 8 }]}>No follows yet.</Text>
        )}
      </View>

      <View style={[styles.card, { marginTop: 12 }]}>
        <Text style={styles.sectionTitle}>Push notifications</Text>
        <Text style={styles.helper}>Get alerts when a neighbor replies to your loop.</Text>

        <Pressable style={[styles.signOutBtn, { marginTop: 12, opacity: notificationsOn ? 0.78 : 1 }]} onPress={onEnableNotifications}>
          <Text style={styles.signOutText}>{notificationsOn ? "Notifications enabled" : "Enable notifications"}</Text>
        </Pressable>
      </View>

      <View style={[styles.card, { marginTop: 12 }]}>
        <Text style={styles.sectionTitle}>Proximity alerts</Text>
        <Text style={styles.helper}>Loop+ only. Get a ping when you are near an active loop.</Text>

        {!isLoopPlus ? (
          <Pressable style={[styles.secondaryBtn, { marginTop: 12 }]} onPress={onOpenLoopPlusUpgrade}>
            <Text style={styles.secondaryBtnText}>Upgrade to Loop+</Text>
          </Pressable>
        ) : (
          <>
            <Pressable style={[styles.signOutBtn, { marginTop: 12 }]} onPress={onToggleProximityAlerts}>
              <Text style={styles.signOutText}>{proximityAlertsEnabled ? "Alerts on" : "Alerts off"}</Text>
            </Pressable>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Alert radius (miles)</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                {ALERT_RADIUS_OPTIONS.map((miles) => {
                  const on = radius === miles;
                  return (
                    <Pressable key={miles} onPress={() => onSetAlertRadius(miles)} style={[styles.radiusBtn, on && styles.radiusBtnOn]}>
                      <Text style={[styles.radiusBtnText, on && styles.radiusBtnTextOn]}>{miles}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </View>

      <View style={[styles.promoCard, { marginTop: 14 }]}>
        <Text style={styles.promoTitle}>Loop+ VIP</Text>
        <Text style={styles.promoText}>Boost up to 3 loops per week, priority placement, and premium spaces like Free + Hire.</Text>
      </View>
      <View style={[styles.card, { marginTop: 14 }]}>
        <Text style={styles.sectionTitle}>Legal</Text>
        <Text style={styles.helper}>External policy links for App Store subscription review.</Text>
        <View style={styles.planLegalLinks}>
          <Pressable onPress={() => openExternalUrl(TERMS_URL, "Terms of Use")}>
            <Text style={styles.planLegalLink}>Terms of Use (EULA)</Text>
          </Pressable>
          <Pressable onPress={() => openExternalUrl(PRIVACY_URL, "Privacy Policy")}>
            <Text style={styles.planLegalLink}>Privacy Policy</Text>
          </Pressable>
        </View>
        <View style={{ marginTop: 10, gap: 8 }}>
          <Pressable style={styles.smallBtn} onPress={() => onOpenLegal("terms")}>
            <Text style={styles.smallBtnText}>Terms of service</Text>
          </Pressable>
          <Pressable style={styles.smallBtn} onPress={() => onOpenLegal("privacy")}>
            <Text style={styles.smallBtnText}>Privacy policy</Text>
          </Pressable>
          <Pressable style={styles.smallBtn} onPress={() => onOpenLegal("eula")}>
            <Text style={styles.smallBtnText}>EULA</Text>
          </Pressable>
          <Pressable style={styles.smallBtn} onPress={() => onOpenLegal("subscription")}>
            <Text style={styles.smallBtnText}>Subscription terms</Text>
          </Pressable>
          <Pressable style={styles.smallBtn} onPress={() => onOpenLegal("refunds")}>
            <Text style={styles.smallBtnText}>Refund policy</Text>
          </Pressable>
          <Pressable style={styles.smallBtn} onPress={() => onOpenLegal("support")}>
            <Text style={styles.smallBtnText}>Support policy</Text>
          </Pressable>
          <Pressable style={styles.smallBtn} onPress={() => onOpenLegal("safety")}>
            <Text style={styles.smallBtnText}>Safety & responsibility</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.card, { marginTop: 14 }]}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.helper}>What Local Loop Hub is and how it works.</Text>
        <View style={{ marginTop: 10, gap: 8 }}>
          <Pressable style={styles.smallBtn} onPress={onOpenAbout}>
            <Text style={styles.smallBtnText}>Full description</Text>
          </Pressable>
          <Pressable style={styles.smallBtn} onPress={onOpenTips}>
            <Text style={styles.smallBtnText}>Tab tooltips</Text>
          </Pressable>
        </View>
      </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

function ProfileStat({ label, value }) {
  return (
    <View style={styles.profileStat}>
      <Text style={styles.profileStatValue}>{value}</Text>
      <Text style={styles.profileStatLabel}>{label}</Text>
    </View>
  );
}

/* -------------------------------- UI bits -------------------------------- */

  function BottomTabs({ activeTab, setTab, isLoopPlus }) {
    const TabShell = BlurView ?? View;
    const scaleMap = useRef(
      TABS.reduce((acc, t) => {
        acc[t.key] = new Animated.Value(1);
        return acc;
      }, {})
    ).current;

    useEffect(() => {
      TABS.forEach((t) => {
        Animated.spring(scaleMap[t.key], {
          toValue: activeTab === t.key ? 1.08 : 1,
          useNativeDriver: true,
          friction: 7,
          tension: 90,
        }).start();
      });
    }, [activeTab, scaleMap]);

    return (
      <TabShell
        intensity={BlurView ? 20 : undefined}
        tint={BlurView ? "light" : undefined}
        style={styles.tabBar}
      >
        {TABS.map((t) => {
          const on = activeTab === t.key;
          const isAdd = t.key === "new";
          const iconName =
            t.key === "feed"
              ? on
                ? "home"
                : "home-outline"
              : t.key === "map"
              ? on
                ? "map"
                : "map-outline"
              : t.key === "loopplus"
              ? on
                ? "sparkles"
                : "sparkles-outline"
              : t.key === "profile"
              ? on
                ? "person"
                : "person-outline"
              : "add";
          const iconColor = on || isAdd ? "#fff" : "rgba(28,35,51,0.65)";
          const iconGradient = isAdd
            ? [BRAND_COLORS.orange, BRAND_COLORS.yellow]
            : on
            ? [BRAND_COLORS.blue, BRAND_COLORS.green]
            : ["rgba(255,255,255,0.85)", "rgba(220,235,255,0.65)"];
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tabBtn, on && styles.tabBtnOn]}>
              <Animated.View style={{ transform: [{ scale: scaleMap[t.key] }, { translateY: -6 }] }}>
                <LinearGradient
                  colors={iconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.tabIcon, isAdd && styles.tabIconAdd, on && styles.tabIconOn]}
                >
                  <Ionicons name={iconName} size={isAdd ? 28 : 22} color={iconColor} />
                </LinearGradient>
              </Animated.View>
              {t.label ? (
                <Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1}>
                  {t.label}
                </Text>
              ) : null}
              {t.key === "loopplus" && isLoopPlus ? <View style={styles.tabDot} /> : null}
            </Pressable>
          );
        })}
      </TabShell>
    );
  }

  function Pill({ text, tone = "neutral", tiny = false }) {
    const toneStyle =
      tone === "peach"
        ? { backgroundColor: "rgba(255, 198, 140, 0.24)", borderColor: "rgba(255,198,140,0.45)" }
      : tone === "sky"
        ? { backgroundColor: "rgba(120, 178, 255, 0.22)", borderColor: "rgba(120,178,255,0.45)" }
      : tone === "success"
        ? { backgroundColor: "rgba(57, 195, 110, 0.22)", borderColor: "rgba(57,195,110,0.45)" }
      : tone === "danger"
        ? { backgroundColor: "rgba(255, 120, 120, 0.24)", borderColor: "rgba(255,120,120,0.45)" }
      : { backgroundColor: "rgba(255,255,255,0.50)", borderColor: "rgba(255,255,255,0.60)" };

  return (
    <View style={[styles.pill, toneStyle, tiny && { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 }]}>
      <Text style={[styles.pillText, tiny && { fontSize: 11 }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function MessageBubble({ msg }) {
  const mine = !!msg.fromMe;
  return (
    <View style={{ marginBottom: 10, alignItems: mine ? "flex-end" : "flex-start" }}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={styles.bubbleText}>{msg.text}</Text>
        <Text style={styles.bubbleTime}>{formatTime(msg.at ?? now())}</Text>
      </View>
    </View>
  );
}

/* -------------------------------- Styles -------------------------------- */

const styles = StyleSheet.create({
    header: {
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
      alignItems: "flex-end",
    },
    appTitle: { fontSize: 22, fontWeight: "800", color: "#1c2333", fontFamily: FONT_EXTRA },
    subTitle: { marginTop: 2, color: "rgba(28,35,51,0.62)", fontWeight: "600", fontFamily: FONT_SEMI },
    locationLine: { color: "rgba(28,35,51,0.58)", fontWeight: "600", fontSize: 12, fontFamily: FONT_SEMI },

    card: {
      backgroundColor: "rgba(255,255,255,0.62)",
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.55)",
      shadowColor: "#0b1b3a",
      shadowOpacity: 0.10,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    newLoopCard: {
      padding: 18,
      minHeight: 520,
    },

    sectionTitle: { fontSize: 17, fontWeight: "800", color: "#1c2333", fontFamily: FONT_BOLD },
    helper: { marginTop: 6, color: "rgba(28,35,51,0.60)", lineHeight: 18, fontWeight: "600", fontFamily: FONT_REGULAR },
    label: { color: "rgba(28,35,51,0.70)", fontWeight: "700", marginTop: 2, fontFamily: FONT_SEMI },
    upgradeTitle: { fontSize: 22, fontWeight: "800", color: "#1c2333", fontFamily: FONT_EXTRA },

    chip: {
      paddingVertical: 5,
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.55)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.60)",
      shadowColor: "#0b1b3a",
      shadowOpacity: 0.16,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    chipActive: { backgroundColor: "rgba(47, 123, 234, 0.20)", borderColor: "rgba(47,123,234,0.50)" },
    chipText: { color: "rgba(28,35,51,0.75)", fontWeight: "700", fontFamily: FONT_SEMI },
    chipTextActive: { color: BRAND_COLORS.blue },

    smallBtn: {
      paddingVertical: 8,
      paddingHorizontal: 2,
      borderRadius: 12,
      backgroundColor: "rgba(47, 123, 234, 0.16)",
      borderWidth: 1,
      borderColor: "rgba(47,123,234,0.45)",
      shadowColor: "#0b1b3a",
      shadowOpacity: 0.18,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    smallBtnText: { fontWeight: "700", color: BRAND_COLORS.blue, fontSize: 12, fontFamily: FONT_SEMI },
    smallBtnOn: { backgroundColor: "rgba(57, 195, 110, 0.20)", borderColor: "rgba(57,195,110,0.55)" },
    smallBtnTextOn: { color: BRAND_COLORS.green },

    radiusBtn: {
      paddingVertical: 4,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: "rgba(255,255,255,0.55)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.55)",
      shadowColor: "#0b1b3a",
      shadowOpacity: 0.16,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    radiusBtnOn: { backgroundColor: "rgba(57, 195, 110, 0.22)", borderColor: "rgba(57,195,110,0.55)" },
    radiusBtnText: { fontWeight: "700", color: "rgba(28,35,51,0.72)", fontFamily: FONT_SEMI },
    radiusBtnTextOn: { color: BRAND_COLORS.green },

    sortTrack: {
      marginTop: 0,
      borderRadius: 16,
      backgroundColor: "rgba(255,255,255,0.55)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.65)",
      overflow: "hidden",
      alignSelf: "flex-start",
      shadowColor: "#0b1b3a",
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    sortKnob: {
      position: "absolute",
      top: 0,
      bottom: 0,
      backgroundColor: "rgba(47, 123, 234, 0.20)",
      borderRightWidth: 1,
      borderRightColor: "rgba(47,123,234,0.45)",
    },
      sortSlot: { paddingVertical: 8, alignItems: "center", justifyContent: "center" },
      sortText: { fontWeight: "800", color: "rgba(28,35,51,0.72)", fontFamily: FONT_SEMI },
      sortSlotChats: {
        backgroundColor: "rgba(255, 138, 61, 0.22)",
        borderLeftWidth: 1,
        borderLeftColor: "rgba(255,138,61,0.55)",
      },
      sortTextChats: { color: BRAND_COLORS.orange },
    sortHint: { marginTop: 6, color: "rgba(28,35,51,0.50)", fontWeight: "600", fontSize: 12, fontFamily: FONT_REGULAR },

    loopCard: {
      backgroundColor: "rgba(255,255,255,0.66)",
      borderRadius: 18,
      padding: 4,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.60)",
      shadowColor: "#0b1b3a",
      shadowOpacity: 0.10,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    loopTitle: { fontSize: 16, fontWeight: "800", color: "#1c2333", fontFamily: FONT_BOLD },
    loopDetails: { marginTop: 0, color: "rgba(28,35,51,0.72)", lineHeight:19, fontWeight: "600", fontFamily: FONT_REGULAR },
    loopMeta: { color: "rgba(28,35,51,0.55)", fontWeight: "600", fontSize: 12, fontFamily: FONT_REGULAR },

    typePill: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      borderWidth: 1,
      shadowColor: "#0b1b3a",
      shadowOpacity: 0.18,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    typePillText: { fontWeight: "800", color: "rgba(28,35,51,0.78)", fontSize: 12, fontFamily: FONT_SEMI },
    boostPill: { backgroundColor: "rgba(255, 214, 138, 0.35)", borderColor: "rgba(255, 167, 38, 0.55)" },
    boostPillText: { color: "#7a4a12" },

    messageBtn: {
      paddingVertical: 6,
      paddingHorizontal: 7,
      borderRadius: 14,
      backgroundColor: "rgba(47, 123, 234, 0.18)",
      borderWidth: 1,
      borderColor: "rgba(47,123,234,0.45)",
      shadowColor: "#1a4ea6",
      shadowOpacity: 0.22,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    messageBtnText: { fontWeight: "800", color: BRAND_COLORS.blue, fontFamily: FONT_SEMI, fontSize: 12 },
    editBtn: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 14,
      backgroundColor: "rgba(57, 195, 110, 0.18)",
      borderWidth: 1,
      borderColor: "rgba(57,195,110,0.45)",
      shadowColor: "#1b6d3d",
      shadowOpacity: 0.2,
      shadowRadius: 7,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    editBtnText: { fontWeight: "800", color: BRAND_COLORS.green, fontFamily: FONT_SEMI, fontSize: 12 },
    followBtn: {
      paddingVertical: 6,
      paddingHorizontal: 7,
      borderRadius: 14,
      backgroundColor: "rgba(57, 195, 110, 0.18)",
      borderWidth: 1,
      borderColor: "rgba(57,195,110,0.45)",
      shadowColor: "#1b6d3d",
      shadowOpacity: 0.2,
      shadowRadius: 7,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    followBtnOn: {
      backgroundColor: "rgba(47, 123, 234, 0.16)",
      borderColor: "rgba(47,123,234,0.45)",
      shadowColor: "#1a4ea6",
    },
    followBtnText: { fontWeight: "800", color: BRAND_COLORS.green, fontFamily: FONT_SEMI, fontSize: 12 },
    followBtnTextOn: { color: BRAND_COLORS.blue },
    deleteBtn: {
      paddingVertical: 6,
      paddingHorizontal: 15,
      borderRadius: 14,
      backgroundColor: "rgba(255, 120, 120, 0.20)",
      borderWidth: 1,
      borderColor: "rgba(255,120,120,0.40)",
      shadowColor: "#7a1c1c",
      shadowOpacity: 0.2,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    deleteBtnText: { fontWeight: "800", color: "#7a1c1c", fontFamily: FONT_SEMI, fontSize: 12 },

    loopImageRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 10,
    },
    loopImage: {
      width: 86,
      height: 86,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.6)",
    },
    loopImageThumb: {
      width: 64,
      height: 64,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.6)",
    },
    lockedOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(255,255,255,0.58)",
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
      zIndex: 2,
    },
    lockedBadge: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: "rgba(255, 138, 61, 0.18)",
      borderWidth: 1,
      borderColor: "rgba(255,138,61,0.45)",
      marginBottom: 6,
    },
    lockedBadgeText: { fontWeight: "800", color: BRAND_COLORS.orange, fontFamily: FONT_SEMI },
    lockedText: { color: "rgba(28,35,51,0.70)", fontWeight: "600", textAlign: "center" },
    removePhotoBadge: {
      position: "absolute",
      top: -6,
      right: -6,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: "rgba(255, 120, 120, 0.9)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.6)",
      shadowColor: "#7a1c1c",
      shadowOpacity: 0.3,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    removePhotoText: { color: "#fff", fontWeight: "800", fontSize: 14, fontFamily: FONT_SEMI },
    addPhotoBtn: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: "rgba(57, 195, 110, 0.18)",
      borderWidth: 1,
      borderColor: "rgba(57,195,110,0.55)",
      alignItems: "center",
      justifyContent: "center",
    },
    addPhotoBtnText: { fontWeight: "800", color: BRAND_COLORS.green, fontFamily: FONT_SEMI },

    typeBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: "rgba(255,255,255,0.55)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.60)",
      alignItems: "center",
      shadowColor: "#0b1b3a",
      shadowOpacity: 0.16,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    typeBtnOn: { backgroundColor: "rgba(47, 123, 234, 0.20)", borderColor: "rgba(47,123,234,0.50)" },
    typeBtnText: { fontWeight: "800", color: "rgba(28,35,51,0.70)", fontFamily: FONT_SEMI },
    typeBtnTextOn: { color: BRAND_COLORS.blue },

  input: {
    marginTop: 8,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderWidth: 1,
    borderColor: "rgba(43,43,43,0.10)",
    color: "#2b2b2b",
    fontWeight: "750",
  },

  primaryBtn: {
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(47, 123, 234, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(47,123,234,0.90)",
    alignItems: "center",
    shadowColor: "#1a4ea6",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  primaryBtnText: { fontWeight: "950", color: "white", fontSize: 15 },
  secondaryBtn: {
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(57, 195, 110, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(57,195,110,0.55)",
    alignItems: "center",
    shadowColor: "#0f6b35",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  secondaryBtnText: { fontWeight: "950", color: BRAND_COLORS.green, fontSize: 15 },
  miniNote: { marginTop: 10, color: "rgba(43,43,43,0.55)", fontWeight: "650", fontSize: 12, lineHeight: 16 },

  perkBox: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(245, 195, 67, 0.20)",
    borderWidth: 1,
    borderColor: "rgba(245,195,67,0.55)",
    shadowColor: "#7a5a12",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  perkTitle: { fontWeight: "950", color: "#4a3522", marginBottom: 8, fontSize: 14 },
  perkLine: { color: "rgba(74,53,34,0.78)", fontWeight: "750", lineHeight: 18 },

    pill: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
      shadowColor: "#0b1b3a",
      shadowOpacity: 0.18,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    pillText: { fontWeight: "800", color: "rgba(28,35,51,0.75)", fontSize: 12, fontFamily: FONT_SEMI },

    tabBar: {
      flexDirection: "row",
      paddingHorizontal: 14,
      paddingTop: 6,
      paddingBottom: 0,
      marginBottom: 16,
      marginHorizontal: 8,
      gap: 10,
      backgroundColor: "transparent",
      position: "relative",
      zIndex: 10,
      elevation: 10,
      pointerEvents: "auto",
    },
    tabBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 0,
      borderColor: "transparent",
      backgroundColor: "transparent",
      position: "relative",
      gap: 4,
      shadowColor: "#0b1b3a",
      shadowOpacity: 0.1,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    tabBtnOn: { backgroundColor: "transparent", borderColor: "transparent" },
    tabIcon: {
      width: 44,
      height: 44,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.25)",
      shadowColor: "#0b1b3a",
      shadowOpacity: 0.6,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 14 },
      elevation: 14,
    },
    tabIconOn: { borderColor: "rgba(255,255,255,0.8)", shadowOpacity: 0.7, shadowRadius: 26, elevation: 16 },
    tabIconAdd: {
      width: 54,
      height: 54,
      borderRadius: 999,
      borderColor: "rgba(255,255,255,0.75)",
      shadowColor: "#7a3b12",
      shadowOpacity: 0.35,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 7,
    },
    tabText: { fontWeight: "700", color: "rgba(28,35,51,0.65)", fontSize: 10, letterSpacing: 0.2, fontFamily: FONT_REGULAR },
    tabTextOn: { color: BRAND_COLORS.blue },
  tabDot: { position: "absolute", top: 6, right: 8, width: 8, height: 8, borderRadius: 8, backgroundColor: BRAND_COLORS.green },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", padding: 18, justifyContent: "center" },
  gateCard: { backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "rgba(43,43,43,0.10)", maxHeight: "92%", minHeight: 520, width: "100%", alignSelf: "center" },
  imageViewerCard: {
    width: "92%",
    height: "80%",
    backgroundColor: "rgba(10,15,25,0.92)",
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignSelf: "center",
  },
  imageViewerImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
    gateTitle: { fontSize: 18, fontWeight: "800", color: "#1c2333", fontFamily: FONT_BOLD },
    gateText: { marginTop: 8, color: "rgba(28,35,51,0.70)", lineHeight: 19, fontWeight: "600", fontFamily: FONT_REGULAR },

  chatHeader: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingTop: 80,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(43,43,43,0.10)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.75)",
  },
    chatHeaderBtn: {
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: "rgba(255, 138, 61, 0.22)",
      borderWidth: 1,
      borderColor: "rgba(255,138,61,0.55)",
      shadowColor: "#7a3b12",
      shadowOpacity: 0.22,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    chatHeaderBtnText: { fontWeight: "800", color: BRAND_COLORS.orange, fontFamily: FONT_SEMI },
    chatTitle: { fontSize: 16, fontWeight: "800", color: "#1c2333", fontFamily: FONT_BOLD },
    chatSub: { marginTop: 2, color: "rgba(28,35,51,0.60)", fontWeight: "600", fontSize: 12, fontFamily: FONT_REGULAR },

  bubble: { maxWidth: "82%", borderRadius: 16, padding: 12, borderWidth: 1 },
  bubbleMine: { backgroundColor: "rgba(140, 255, 210, 0.38)", borderColor: "rgba(140,255,210,0.65)" },
  bubbleTheirs: { backgroundColor: "rgba(255,255,255,0.78)", borderColor: "rgba(43,43,43,0.10)" },
    bubbleText: { color: "rgba(28,35,51,0.80)", fontWeight: "600", lineHeight: 18, fontFamily: FONT_REGULAR },
    bubbleTime: { marginTop: 6, color: "rgba(28,35,51,0.55)", fontWeight: "600", fontSize: 11, alignSelf: "flex-end", fontFamily: FONT_REGULAR },

    chatComposer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(43,43,43,0.10)",
    backgroundColor: "rgba(255,255,255,0.86)",
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-end",
  },
    chatInput: {
      flex: 1,
      maxHeight: 120,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: "rgba(255,255,255,0.80)",
      borderWidth: 1,
      borderColor: "rgba(43,43,43,0.10)",
      color: "#2b2b2b",
      fontWeight: "600",
      fontFamily: FONT_REGULAR,
    },
  sendBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(137, 226, 255, 0.33)",
    borderWidth: 1,
    borderColor: "rgba(137,226,255,0.60)",
  },
    sendBtnText: { fontWeight: "800", color: "#204458", fontFamily: FONT_SEMI },

    appBgOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(255,255,255,0.45)",
    },
    authBgOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(255,255,255,0.08)",
    },
    authGlowA: {
      position: "absolute",
      top: -110,
      left: -80,
      width: 260,
      height: 260,
      borderRadius: 260,
      backgroundColor: "rgba(120, 178, 255, 0.48)",
    },
    authGlowB: {
      position: "absolute",
      top: 100,
      right: -90,
      width: 300,
      height: 300,
      borderRadius: 300,
      backgroundColor: "rgba(255, 198, 140, 0.42)",
    },
    authGlowC: {
      position: "absolute",
      bottom: -120,
      left: 20,
      width: 280,
      height: 280,
      borderRadius: 280,
      backgroundColor: "rgba(152, 255, 220, 0.36)",
    },
    authVideo: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0.7,
      transform: [{ scale: 1.05 }],
    },
    authHeroImage: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0.50,
      transform: [{ translateX: -110 }],
    },
    authLeadTitle: {
      fontSize: 20,
      fontWeight: "900",
      color: "#1c2333",
      fontFamily: FONT_BOLD,
    },
    authLeadText: {
      marginTop: 6,
      marginBottom: 14,
      color: "rgba(28,35,51,0.70)",
      fontWeight: "650",
      lineHeight: 18,
      fontFamily: FONT_REGULAR,
    },
    authTabs: {
      position: "absolute",
      left: 16,
      right: 16,
      bottom: 18,
      flexDirection: "row",
      gap: 10,
      padding: 6,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.85)",
      borderWidth: 1,
      borderColor: "rgba(43,43,43,0.10)",
    },
    authTabBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 14,
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.7)",
    },
    authTabBtnActive: {
      backgroundColor: "rgba(47,123,234,0.16)",
      borderWidth: 1,
      borderColor: "rgba(47,123,234,0.45)",
    },
    authTabText: {
      fontSize: 14,
      fontWeight: "800",
      color: "rgba(28,35,51,0.6)",
      fontFamily: FONT_SEMI,
    },
    authTabTextActive: {
      color: BRAND_COLORS.blue,
    },
    legalBody: {
      color: "rgba(28,35,51,0.75)",
      fontSize: 13,
      lineHeight: 20,
      fontFamily: FONT_REGULAR,
    },

  threadRow: {
    backgroundColor: "rgba(255,255,255,0.84)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(43,43,43,0.08)",   
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  threadTitle: { fontWeight: "950", color: "#2b2b2b", fontSize: 14 },
  threadMeta: { marginTop: 6, color: "rgba(43,43,43,0.60)", fontWeight: "650", fontSize: 12 },
  threadChevron: { fontSize: 24, fontWeight: "900", color: "rgba(43,43,43,0.35)", marginLeft: 6 },

  // Map
  mapTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mapSheet: {
    marginTop: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(43,43,43,0.10)",
  },
  mapSheetTitle: { fontSize: 16, fontWeight: "950", color: "#2b2b2b" },
  mapSheetMeta: { marginTop: 4, color: "rgba(43,43,43,0.60)", fontWeight: "700", fontSize: 12 },
  mapSheetDetails: { marginTop: 8, color: "rgba(43,43,43,0.75)", lineHeight: 18, fontWeight: "650" },
  mapSheetRow: { flexDirection: "row", gap: 10, marginTop: 10 },

  orb: { position: "absolute", opacity: 0.65, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)" },
  miniOrb: { position: "absolute", width: 40, height: 40, borderRadius: 40, opacity: 0.6, borderWidth: 1, borderColor: "rgba(255,255,255,0.45)" },

  // Profile
  profileHeader: { marginTop: 6, fontSize: 28, fontWeight: "950", color: "#2b2b2b" },
  profileSub: { marginTop: 4, fontSize: 16, fontWeight: "700", color: "rgba(43,43,43,0.60)" },
  profileName: { fontSize: 22, fontWeight: "950", color: "#2b2b2b" },
  profileEmail: { marginTop: 4, fontSize: 14, fontWeight: "700", color: "rgba(43,43,43,0.60)" },
  profileStatsRow: { marginTop: 14, flexDirection: "row", justifyContent: "space-between" },
  profileStat: { flex: 1, alignItems: "center" },
    profileStatValue: { fontSize: 28, fontWeight: "950", color: "#2b2b2b" },
    profileStatLabel: { marginTop: 2, fontSize: 14, fontWeight: "800", color: "rgba(43,43,43,0.60)" },
    profileOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(255,255,255,0.45)",
    },

  signOutBtn: { width: "100%", borderRadius: 18, paddingVertical: 16, alignItems: "center", backgroundColor: "rgba(224, 109, 84, 0.95)" },
  signOutText: { fontSize: 18, fontWeight: "950", color: "white" },

  vipRow: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  vipLabel: { fontSize: 16, fontWeight: "900", color: "rgba(43,43,43,0.78)" },
  vipHint: { marginTop: 4, fontSize: 12, fontWeight: "700", color: "rgba(43,43,43,0.55)" },

  promoCard: {
    backgroundColor: "rgba(25, 45, 84, 0.92)",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  promoTitle: { fontSize: 22, fontWeight: "950", color: "white" },
  promoText: { marginTop: 6, fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.80)" },

  // Plans modal
  planCard: { backgroundColor: "rgba(255,255,255,0.94)", borderRadius: 22, padding: 16, borderWidth: 1, borderColor: "rgba(43,43,43,0.10)" },
  planTitle: { fontSize: 20, fontWeight: "950", color: "#2b2b2b", textAlign: "center" },
  planSub: { marginTop: 6, textAlign: "center", color: "rgba(43,43,43,0.65)", fontWeight: "700" },
  planOption: {
    marginTop: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 2,
    borderColor: "rgba(43,43,43,0.10)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  planOptionBest: { borderColor: "rgba(140,255,210,0.85)", backgroundColor: "rgba(140,255,210,0.18)" },
  planOptionTitle: { fontSize: 16, fontWeight: "950", color: "#2b2b2b" },
  planOptionDesc: { marginTop: 3, color: "rgba(43,43,43,0.62)", fontWeight: "700" },
  planOptionPrice: { fontWeight: "950", color: "rgba(43,43,43,0.78)" },
  planLegalText: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    color: "rgba(43,43,43,0.62)",
    fontWeight: "700",
  },
  planLegalLinks: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  planLegalLink: {
    fontSize: 12,
    fontWeight: "800",
    color: BRAND_COLORS.blue,
  },
  iapStatusText: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(43,43,43,0.7)",
  },
  debugBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(10,10,10,0.06)",
    borderWidth: 1,
    borderColor: "rgba(43,43,43,0.15)",
  },
  debugTitle: { fontSize: 12, fontWeight: "900", color: "rgba(43,43,43,0.85)" },
  debugText: { marginTop: 4, fontSize: 11, color: "rgba(43,43,43,0.75)" },
});






