import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getAllCachedGuides,
  saveGuidesToCache,
  deleteCachedCategory,
  getDownloadedCategories,
  hasAnyCachedGuides,
  getLocalManifest,
  deleteCachedGuide,
} from "@/lib/database";
import { setGuideStore } from "@/lib/guides/guide-store";
import {
  fetchLatestRelease,
  fetchAvailableCategories,
  fetchGuidesByCategory,
  fetchAllGuidesMetadata,
  fetchReleaseManifest,
  fetchGuidesBySlugs,
} from "@/lib/guides/supabase-guide-service";
import type { Guide } from "@/lib/guides/types";
import type { AvailableCategory } from "@/lib/guides/supabase-guide-service";

const RELEASE_VERSION_KEY = "northkeep_release_version";
const GLOBAL_METADATA_KEY = "northkeep_global_metadata";
// Set after seeding from bundle so we know to auto-sync on next online launch
const SEEDED_FROM_BUNDLE_KEY = "northkeep_seeded_from_bundle";

export type CategoryDownloadState = "idle" | "downloading" | "downloaded";

interface GuideStoreContextValue {
  guides: Guide[];
  isLoaded: boolean;
  isSeedingFromBundle: boolean;
  isDownloadingAll: boolean;
  downloadedCategories: Set<string>;
  availableCategories: AvailableCategory[];
  updateAvailable: boolean;
  latestReleaseVersion: string | null;
  deltaSync: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  reloadGuides: () => Promise<void>;
  // Legacy — kept for backward compat; no-op in new model
  downloadingCategories: Set<string>;
  getCategoryState: (category: string) => CategoryDownloadState;
  downloadCategory: (categorySlug: string) => Promise<void>;
  removeCategory: (categorySlug: string) => Promise<void>;
  // Online browsing
  onlineGuidesCache: Map<string, Guide[]>;
  onlineFetchingCategories: Set<string>;
  fetchOnlineGuides: (categorySlug: string) => Promise<Guide[]>;
  getOnlineGuide: (slug: string) => Guide | undefined;
  globalMetadata: Guide[];
}

const GuideStoreContext = createContext<GuideStoreContextValue | null>(null);

async function loadGuidesFromDB(): Promise<Guide[]> {
  const rows = await getAllCachedGuides();
  return rows.map((row) => JSON.parse(row.guide_data) as Guide);
}

export function GuideStoreProvider({ children }: { children: ReactNode }) {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSeedingFromBundle, setIsSeedingFromBundle] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadedCategories, setDownloadedCategories] = useState<Set<string>>(new Set());
  const [availableCategories, setAvailableCategories] = useState<AvailableCategory[]>([]);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestReleaseVersion, setLatestReleaseVersion] = useState<string | null>(null);

  // Online browsing cache — ephemeral, not persisted
  const [onlineGuidesCache, setOnlineGuidesCache] = useState<Map<string, Guide[]>>(new Map());
  const [onlineFetchingCategories, setOnlineFetchingCategories] = useState<Set<string>>(new Set());
  const fetchingRef = useRef<Set<string>>(new Set());
  const [globalMetadata, setGlobalMetadata] = useState<Guide[]>([]);

  // ─── Core reload from SQLite ──────────────────────────────────────────────

  const reloadGuides = useCallback(async () => {
    const loaded = await loadGuidesFromDB();
    setGuides(loaded);
    setGuideStore(loaded);

    const cats = await getDownloadedCategories();
    setDownloadedCategories(new Set(cats));
    setIsLoaded(true);

    try {
      const storedMeta = await AsyncStorage.getItem(GLOBAL_METADATA_KEY);
      if (storedMeta) {
        setGlobalMetadata(JSON.parse(storedMeta));
      }
    } catch {
      // Ignore parse errors on startup
    }
  }, []);

  // ─── Seed SQLite from bundled snapshot ───────────────────────────────────

  const seedFromBundle = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const snapshot = require("../assets/guides-snapshot.json") as {
        releaseVersion: string;
        guides: Array<{
          slug: string;
          title: string;
          category: string;
          parentTopic?: string;
          layer: string;
          guideData: object;
          supabaseVersionId?: string;
          releaseVersion?: string;
        }>;
      };

      await saveGuidesToCache(
        snapshot.guides.map((g) => ({
          slug: g.slug,
          title: g.title,
          category: g.category,
          parentTopic: g.parentTopic,
          layer: g.layer,
          guideData: g.guideData,
          supabaseVersionId: g.supabaseVersionId,
          releaseVersion: snapshot.releaseVersion,
        }))
      );

      await AsyncStorage.setItem(RELEASE_VERSION_KEY, snapshot.releaseVersion);
      await AsyncStorage.setItem(SEEDED_FROM_BUNDLE_KEY, "true");

      await reloadGuides();
    } catch (err) {
      console.warn("[GuideStore] seedFromBundle failed:", err);
    }
  }, [reloadGuides]);

  // ─── Delta sync: only download new/changed guides, delete removed ones ────

  const deltaSync = useCallback(async () => {
    if (isDownloadingAll) return;
    setIsDownloadingAll(true);
    try {
      const release = await fetchLatestRelease();
      if (!release) return;

      // Lightweight manifest: what's in the latest release
      const remoteManifest = await fetchReleaseManifest(release.id);
      const remoteMap = new Map(remoteManifest.map((r) => [r.slug, r.versionId]));

      // What we have locally
      const localMap = await getLocalManifest();

      // Diff
      const toDownload: string[] = [];
      for (const [slug, versionId] of remoteMap) {
        if (localMap.get(slug) !== versionId) {
          toDownload.push(slug);
        }
      }

      const toDelete: string[] = [];
      for (const slug of localMap.keys()) {
        if (!remoteMap.has(slug)) {
          toDelete.push(slug);
        }
      }

      // Apply deletions
      for (const slug of toDelete) {
        await deleteCachedGuide(slug);
      }

      // Fetch and upsert changed/new guides
      if (toDownload.length > 0) {
        const items = await fetchGuidesBySlugs(toDownload, release.id);
        if (items.length > 0) {
          await saveGuidesToCache(
            items.map(({ guide, versionId }) => ({
              slug: guide.slug,
              title: guide.title,
              category: guide.category,
              parentTopic: guide.parentTopic,
              layer: guide.layer,
              guideData: guide,
              supabaseVersionId: versionId,
              releaseVersion: release.semanticVersion,
            }))
          );
        }
      }

      // Update stored version and clear flags
      await AsyncStorage.setItem(RELEASE_VERSION_KEY, release.semanticVersion);
      await AsyncStorage.removeItem(SEEDED_FROM_BUNDLE_KEY);
      setLatestReleaseVersion(release.semanticVersion);
      setUpdateAvailable(false);
      setOnlineGuidesCache(new Map());

      await reloadGuides();

      const summary = [];
      if (toDownload.length > 0) summary.push(`${toDownload.length} updated`);
      if (toDelete.length > 0) summary.push(`${toDelete.length} removed`);
      if (summary.length === 0) summary.push("already up to date");
      console.log(`[GuideStore] Delta sync complete: ${summary.join(", ")}`);
    } catch (err) {
      console.warn("[GuideStore] deltaSync failed:", err);
    } finally {
      setIsDownloadingAll(false);
    }
  }, [isDownloadingAll, reloadGuides]);

  // ─── Check for updates (compare stored version vs Supabase latest) ────────

  const checkForUpdates = useCallback(async () => {
    try {
      const release = await fetchLatestRelease();
      if (!release) return;

      setLatestReleaseVersion(release.semanticVersion);

      const stored = await AsyncStorage.getItem(RELEASE_VERSION_KEY);
      if (stored !== release.semanticVersion) {
        setUpdateAvailable(true);
        setOnlineGuidesCache(new Map());

        const allMeta = await fetchAllGuidesMetadata(release.id);
        await AsyncStorage.setItem(GLOBAL_METADATA_KEY, JSON.stringify(allMeta));
        setGlobalMetadata(allMeta);
      } else if (globalMetadata.length === 0) {
        const allMeta = await fetchAllGuidesMetadata(release.id);
        await AsyncStorage.setItem(GLOBAL_METADATA_KEY, JSON.stringify(allMeta));
        setGlobalMetadata(allMeta);
      }

      const cats = await fetchAvailableCategories();
      setAvailableCategories(cats);
    } catch {
      // No internet — silently ignore
    }
  }, []);

  // ─── Initialization ───────────────────────────────────────────────────────

  useEffect(() => {
    async function initialize() {
      // Load whatever is already in SQLite
      const loaded = await loadGuidesFromDB();
      setGuides(loaded);
      setGuideStore(loaded);

      const cats = await getDownloadedCategories();
      setDownloadedCategories(new Set(cats));

      try {
        const storedMeta = await AsyncStorage.getItem(GLOBAL_METADATA_KEY);
        if (storedMeta) setGlobalMetadata(JSON.parse(storedMeta));
      } catch { /* ignore */ }

      const hasGuides = await hasAnyCachedGuides();

      if (!hasGuides) {
        // First launch: seed from bundled snapshot immediately
        setIsSeedingFromBundle(true);
        await seedFromBundle();
        setIsSeedingFromBundle(false);
      }

      setIsLoaded(true);

      // Background: check for updates, then auto-sync if this was a fresh seed
      (async () => {
        try {
          const release = await fetchLatestRelease();
          if (!release) return;

          setLatestReleaseVersion(release.semanticVersion);

          const stored = await AsyncStorage.getItem(RELEASE_VERSION_KEY);
          const seededFromBundle = await AsyncStorage.getItem(SEEDED_FROM_BUNDLE_KEY);

          if (stored !== release.semanticVersion) {
            setUpdateAvailable(true);
            setOnlineGuidesCache(new Map());

            const allMeta = await fetchAllGuidesMetadata(release.id);
            await AsyncStorage.setItem(GLOBAL_METADATA_KEY, JSON.stringify(allMeta));
            setGlobalMetadata(allMeta);

            // If we just seeded from bundle, auto-sync silently without user prompt
            if (seededFromBundle === "true") {
              await deltaSync();
            }
          } else if (globalMetadata.length === 0) {
            const allMeta = await fetchAllGuidesMetadata(release.id);
            await AsyncStorage.setItem(GLOBAL_METADATA_KEY, JSON.stringify(allMeta));
            setGlobalMetadata(allMeta);
          }

          const availCats = await fetchAvailableCategories();
          setAvailableCategories(availCats);
        } catch {
          // No internet — leave bundle data in place silently
        }
      })();
    }

    initialize();
    // Run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Legacy: per-category download (kept for backward compat) ────────────

  const downloadCategory = useCallback(
    async (categorySlug: string) => {
      // In the new model, all guides are already available. This is a no-op.
      // Kept so nothing breaks if called from older code paths.
    },
    []
  );

  const removeCategory = useCallback(
    async (categorySlug: string) => {
      await deleteCachedCategory(categorySlug);
      await reloadGuides();
    },
    [reloadGuides]
  );

  const getCategoryState = useCallback(
    (category: string): CategoryDownloadState => {
      if (downloadedCategories.has(category)) return "downloaded";
      return "idle";
    },
    [downloadedCategories]
  );

  // ─── Online browsing fallback ─────────────────────────────────────────────

  const fetchOnlineGuides = useCallback(
    async (categorySlug: string): Promise<Guide[]> => {
      if (downloadedCategories.has(categorySlug)) return [];

      const cached = onlineGuidesCache.get(categorySlug);
      if (cached) return cached;

      if (fetchingRef.current.has(categorySlug)) return [];

      fetchingRef.current.add(categorySlug);
      setOnlineFetchingCategories((prev) => new Set(prev).add(categorySlug));

      try {
        const release = await fetchLatestRelease();
        if (!release) return [];

        const items = await fetchGuidesByCategory(categorySlug, release.id);
        const fetchedGuides = items.map(({ guide }) => guide);

        setOnlineGuidesCache((prev) => {
          const next = new Map(prev);
          next.set(categorySlug, fetchedGuides);
          return next;
        });

        return fetchedGuides;
      } catch {
        return [];
      } finally {
        fetchingRef.current.delete(categorySlug);
        setOnlineFetchingCategories((prev) => {
          const next = new Set(prev);
          next.delete(categorySlug);
          return next;
        });
      }
    },
    [downloadedCategories, onlineGuidesCache]
  );

  const getOnlineGuide = useCallback(
    (slug: string): Guide | undefined => {
      for (const guides of onlineGuidesCache.values()) {
        const found = guides.find((g) => g.slug === slug);
        if (found) return found;
      }
      return globalMetadata.find((g) => g.slug === slug);
    },
    [onlineGuidesCache, globalMetadata]
  );

  return (
    <GuideStoreContext.Provider
      value={{
        guides,
        isLoaded,
        isSeedingFromBundle,
        isDownloadingAll,
        downloadedCategories,
        availableCategories,
        updateAvailable,
        latestReleaseVersion,
        deltaSync,
        checkForUpdates,
        reloadGuides,
        // Legacy
        downloadingCategories: new Set<string>(),
        getCategoryState,
        downloadCategory,
        removeCategory,
        // Online browsing
        onlineGuidesCache,
        onlineFetchingCategories,
        fetchOnlineGuides,
        getOnlineGuide,
        globalMetadata,
      }}
    >
      {children}
    </GuideStoreContext.Provider>
  );
}

export function useGuideStore() {
  const context = useContext(GuideStoreContext);
  if (!context) throw new Error("useGuideStore must be used within GuideStoreProvider");
  return context;
}
