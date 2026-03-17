// Thin wrapper around GuideStoreContext exposing the sync-related API.
import { useGuideStore } from "@/contexts/GuideStoreContext";

export function useGuideDownloads() {
  const {
    isLoaded,
    isSeedingFromBundle,
    isDownloadingAll,
    updateAvailable,
    deltaSync,
    downloadedCategories,
  } = useGuideStore();

  return {
    isLoaded,
    isSeedingFromBundle,
    isDownloadingAll,
    updateAvailable,
    deltaSync,
    downloadedCategories,
  };
}
