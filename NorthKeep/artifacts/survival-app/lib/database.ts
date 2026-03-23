import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Native SQLite (iOS / Android) ──────────────────────────────────────────
// expo-sqlite is lazy-imported only on native to prevent its web worker (OPFS
// VFS) from initialising and crashing with xLock/xFileControl errors.

let dbPromise: Promise<any> | null = null;

// No-op mock for web: all reads return empty, all writes are silent.
const webMockDb = {
  execAsync: async () => {},
  runAsync: async () => ({ changes: 0, lastInsertRowId: 0 }),
  getAllAsync: async () => [],
  getFirstAsync: async () => null,
  withTransactionAsync: async (fn: () => Promise<void>) => fn(),
};

export async function getDatabase(): Promise<any> {
  if (Platform.OS === "web") {
    return webMockDb;
  }
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQLite = await import("expo-sqlite");
      const database = await SQLite.openDatabaseAsync("northkeep.db");
      await database.execAsync(`PRAGMA journal_mode = WAL;`);
      await initTables(database);
      return database;
    })();
  }
  return dbPromise;
}

async function initTables(database: any) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      sources TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS knowledge_articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT,
      content TEXT,
      category TEXT NOT NULL,
      wiki_url TEXT NOT NULL,
      icon_name TEXT,
      downloaded INTEGER NOT NULL DEFAULT 0,
      downloaded_at INTEGER,
      content_length INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS inventory_kits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guide_downloads (
      slug TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      downloaded_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guides_cache (
      slug TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      parent_topic TEXT,
      layer TEXT NOT NULL,
      guide_data TEXT NOT NULL,
      supabase_version_id TEXT,
      release_version TEXT,
      downloaded_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      unit TEXT,
      notes TEXT,
      condition TEXT NOT NULL DEFAULT 'good',
      expiry_date INTEGER,
      kit_id TEXT,
      status TEXT NOT NULL DEFAULT 'owned',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (kit_id) REFERENCES inventory_kits(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS guide_views (
      guide_slug TEXT PRIMARY KEY,
      view_count INTEGER DEFAULT 0,
      last_viewed_at TEXT,
      needs_sync INTEGER DEFAULT 1
    );
  `);

  // Migration: add status column to existing inventory_items tables
  try {
    await database.runAsync(
      "ALTER TABLE inventory_items ADD COLUMN status TEXT NOT NULL DEFAULT 'owned'"
    );
  } catch (_) {
    // Column already exists — safe to ignore
  }
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// ─── guides_cache helpers (web-safe: AsyncStorage on web, SQLite on native) ──

const WEB_GUIDES_CACHE_KEY = "northkeep_guides_cache";

export interface GuideCacheRow {
  slug: string;
  title: string;
  category: string;
  parent_topic: string | null;
  layer: string;
  guide_data: string;
  supabase_version_id: string | null;
  release_version: string | null;
  downloaded_at: number;
}

// --- Web helpers using AsyncStorage ---

async function webGetAllRows(): Promise<GuideCacheRow[]> {
  const raw = await AsyncStorage.getItem(WEB_GUIDES_CACHE_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as GuideCacheRow[];
}

async function webSetAllRows(rows: GuideCacheRow[]): Promise<void> {
  await AsyncStorage.setItem(WEB_GUIDES_CACHE_KEY, JSON.stringify(rows));
}

// --- Public API (platform-aware) ---

export async function saveGuidesToCache(
  guides: Array<{
    slug: string;
    title: string;
    category: string;
    parentTopic?: string;
    layer: string;
    guideData: object;
    supabaseVersionId?: string;
    releaseVersion?: string;
  }>
): Promise<void> {
  const now = Date.now();

  if (Platform.OS === "web") {
    const existing = await webGetAllRows();
    const map = new Map(existing.map((r) => [r.slug, r]));
    for (const g of guides) {
      map.set(g.slug, {
        slug: g.slug,
        title: g.title,
        category: g.category,
        parent_topic: g.parentTopic ?? null,
        layer: g.layer,
        guide_data: JSON.stringify(g.guideData),
        supabase_version_id: g.supabaseVersionId ?? null,
        release_version: g.releaseVersion ?? null,
        downloaded_at: now,
      });
    }
    await webSetAllRows(Array.from(map.values()));
    return;
  }

  const database = await getDatabase();
  await database.withTransactionAsync(async () => {
    for (const g of guides) {
      await database.runAsync(
        `INSERT OR REPLACE INTO guides_cache
           (slug, title, category, parent_topic, layer, guide_data, supabase_version_id, release_version, downloaded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        g.slug,
        g.title,
        g.category,
        g.parentTopic ?? null,
        g.layer,
        JSON.stringify(g.guideData),
        g.supabaseVersionId ?? null,
        g.releaseVersion ?? null,
        now
      );
    }
  });
}

export async function getAllCachedGuides(): Promise<GuideCacheRow[]> {
  if (Platform.OS === "web") {
    const rows = await webGetAllRows();
    return rows.sort((a, b) =>
      a.category === b.category
        ? a.title.localeCompare(b.title)
        : a.category.localeCompare(b.category)
    );
  }
  const database = await getDatabase();
  return database.getAllAsync<GuideCacheRow>(
    "SELECT * FROM guides_cache ORDER BY category, title"
  );
}

export async function getCachedGuidesByCategory(category: string): Promise<GuideCacheRow[]> {
  if (Platform.OS === "web") {
    const rows = await webGetAllRows();
    return rows
      .filter((r) => r.category === category)
      .sort((a, b) => a.title.localeCompare(b.title));
  }
  const database = await getDatabase();
  return database.getAllAsync<GuideCacheRow>(
    "SELECT * FROM guides_cache WHERE category = ? ORDER BY title",
    category
  );
}

export async function getDownloadedCategories(): Promise<string[]> {
  if (Platform.OS === "web") {
    const rows = await webGetAllRows();
    return [...new Set(rows.map((r) => r.category))];
  }
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ category: string }>(
    "SELECT DISTINCT category FROM guides_cache"
  );
  return rows.map((r) => r.category);
}

export async function deleteCachedCategory(category: string): Promise<void> {
  if (Platform.OS === "web") {
    const rows = await webGetAllRows();
    await webSetAllRows(rows.filter((r) => r.category !== category));
    return;
  }
  const database = await getDatabase();
  await database.runAsync("DELETE FROM guides_cache WHERE category = ?", category);
}

export async function getCachedGuideCount(): Promise<number> {
  if (Platform.OS === "web") {
    const rows = await webGetAllRows();
    return rows.length;
  }
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM guides_cache"
  );
  return row?.count ?? 0;
}

export async function hasAnyCachedGuides(): Promise<boolean> {
  const count = await getCachedGuideCount();
  return count > 0;
}

// Returns a map of slug → supabase_version_id for delta sync comparison.
export async function getLocalManifest(): Promise<Map<string, string>> {
  if (Platform.OS === "web") {
    const rows = await webGetAllRows();
    const map = new Map<string, string>();
    for (const r of rows) {
      if (r.supabase_version_id) map.set(r.slug, r.supabase_version_id);
    }
    return map;
  }
  const database = await getDatabase();
  const rows: { slug: string; supabase_version_id: string | null }[] = await database.getAllAsync(
    "SELECT slug, supabase_version_id FROM guides_cache"
  );
  const map = new Map<string, string>();
  for (const r of rows) {
    if (r.supabase_version_id) map.set(r.slug, r.supabase_version_id);
  }
  return map;
}

export async function deleteCachedGuide(slug: string): Promise<void> {
  if (Platform.OS === "web") {
    const rows = await webGetAllRows();
    await webSetAllRows(rows.filter((r) => r.slug !== slug));
    return;
  }
  const database = await getDatabase();
  await database.runAsync("DELETE FROM guides_cache WHERE slug = ?", slug);
}
