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
} from "@/lib/database";
import { setGuideStore } from "@/lib/guides/guide-store";
import {
  fetchLatestRelease,
  fetchAvailableCategories,
  fetchGuidesByCategory,
  fetchAllGuidesMetadata,
} from "@/lib/guides/supabase-guide-service";
import type { Guide } from "@/lib/guides/types";
import type { AvailableCategory } from "@/lib/guides/supabase-guide-service";

const RELEASE_VERSION_KEY = "northkeep_release_version";
const GLOBAL_METADATA_KEY = "northkeep_global_metadata";

export type CategoryDownloadState = "idle" | "downloading" | "downloaded";

interface GuideStoreContextValue {
  guides: Guide[];
  isLoaded: boolean;
  downloadedCategories: Set<string>;
  downloadingCategories: Set<string>;
  availableCategories: AvailableCategory[];
  updateAvailable: boolean;
  latestReleaseVersion: string | null;
  getCategoryState: (category: string) => CategoryDownloadState;
  downloadCategory: (categorySlug: string) => Promise<void>;
  removeCategory: (categorySlug: string) => Promise<void>;
  checkForUpdates: () => Promise<void>;
  reloadGuides: () => Promise<void>;
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
  const [downloadedCategories, setDownloadedCategories] = useState<Set<string>>(new Set());
  const [downloadingCategories, setDownloadingCategories] = useState<Set<string>>(new Set());
  const [availableCategories, setAvailableCategories] = useState<AvailableCategory[]>([]);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestReleaseVersion, setLatestReleaseVersion] = useState<string | null>(null);

  // Online browsing cache — ephemeral, not persisted
  const [onlineGuidesCache, setOnlineGuidesCache] = useState<Map<string, Guide[]>>(new Map());
  const [onlineFetchingCategories, setOnlineFetchingCategories] = useState<Set<string>>(new Set());
  const fetchingRef = useRef<Set<string>>(new Set());
  const [globalMetadata, setGlobalMetadata] = useState<Guide[]>([]);

  // Load guides from SQLite on startup
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

  useEffect(() => {
    reloadGuides();
  }, [reloadGuides]);

  // Check for updates (compare stored version vs Supabase latest)
  const checkForUpdates = useCallback(async () => {
    try {
      const release = await fetchLatestRelease();
      if (!release) return;

      setLatestReleaseVersion(release.semanticVersion);

      const stored = await AsyncStorage.getItem(RELEASE_VERSION_KEY);
      if (stored !== release.semanticVersion) {
        setUpdateAvailable(true);
        // Clear online cache when a new release is detected
        setOnlineGuidesCache(new Map());
        
        // Fetch global metadata if we have a new release
        const allMeta = await fetchAllGuidesMetadata(release.id);
        await AsyncStorage.setItem(GLOBAL_METADATA_KEY, JSON.stringify(allMeta));
        setGlobalMetadata(allMeta);
      } else if (globalMetadata.length === 0) {
        // If we don't have metadata yet (e.g. first install), fetch it
        const allMeta = await fetchAllGuidesMetadata(release.id);
        await AsyncStorage.setItem(GLOBAL_METADATA_KEY, JSON.stringify(allMeta));
        setGlobalMetadata(allMeta);
      }

      // Also fetch available categories for the download UI
      const cats = await fetchAvailableCategories();
      setAvailableCategories(cats);
    } catch {
      // No internet — silently ignore
    }
  }, []);

  // Check for updates once on mount (non-blocking)
  useEffect(() => {
    checkForUpdates();
  }, [checkForUpdates]);

  const downloadCategory = useCallback(
    async (categorySlug: string) => {
      setDownloadingCategories((prev) => new Set(prev).add(categorySlug));
      try {
        // Get the latest release id
        const release = await fetchLatestRelease();
        if (!release) throw new Error("No published release found");

        const items = await fetchGuidesByCategory(categorySlug, release.id);
        if (items.length === 0) return;

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

        // Save current release version to AsyncStorage
        await AsyncStorage.setItem(RELEASE_VERSION_KEY, release.semanticVersion);
        setLatestReleaseVersion(release.semanticVersion);
        setUpdateAvailable(false);

        // Clear this category from online cache (now downloaded)
        setOnlineGuidesCache((prev) => {
          if (!prev.has(categorySlug)) return prev;
          const next = new Map(prev);
          next.delete(categorySlug);
          return next;
        });

        // Reload full guide store from SQLite
        await reloadGuides();
      } finally {
        setDownloadingCategories((prev) => {
          const next = new Set(prev);
          next.delete(categorySlug);
          return next;
        });
      }
    },
    [reloadGuides]
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
      if (downloadingCategories.has(category)) return "downloading";
      if (downloadedCategories.has(category)) return "downloaded";
      return "idle";
    },
    [downloadingCategories, downloadedCategories]
  );

  // Fetch guides for a category from Supabase (online browsing, not persisted)
  const fetchOnlineGuides = useCallback(
    async (categorySlug: string): Promise<Guide[]> => {
      // Already downloaded — no need for online fetch
      if (downloadedCategories.has(categorySlug)) return [];

      // Already in cache
      const cached = onlineGuidesCache.get(categorySlug);
      if (cached) return cached;

      // Already fetching (dedup)
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
        // No internet — return empty
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

  // Look up a single guide across all online caches
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
        downloadedCategories,
        downloadingCategories,
        availableCategories,
        updateAvailable,
        latestReleaseVersion,
        getCategoryState,
        downloadCategory,
        removeCategory,
        checkForUpdates,
        reloadGuides,
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
