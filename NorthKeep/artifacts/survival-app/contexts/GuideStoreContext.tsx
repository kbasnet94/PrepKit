import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
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
} from "@/lib/guides/supabase-guide-service";
import type { Guide } from "@/lib/guides/types";
import type { AvailableCategory } from "@/lib/guides/supabase-guide-service";

const RELEASE_VERSION_KEY = "northkeep_release_version";

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

  // Load guides from SQLite on startup
  const reloadGuides = useCallback(async () => {
    const loaded = await loadGuidesFromDB();
    setGuides(loaded);
    setGuideStore(loaded);

    const cats = await getDownloadedCategories();
    setDownloadedCategories(new Set(cats));
    setIsLoaded(true);
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
