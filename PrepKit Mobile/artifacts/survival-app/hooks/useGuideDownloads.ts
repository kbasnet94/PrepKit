// This hook is a thin wrapper around GuideStoreContext for backward
// compatibility with components that already import it.
import { useGuideStore, type CategoryDownloadState } from "@/contexts/GuideStoreContext";
import type { GuideCategory } from "@/lib/guides";

export type { CategoryDownloadState };

interface UseGuideDownloads {
  downloadedCategories: Set<string>;
  downloadingCategories: Set<string>;
  getCategoryState: (category: string) => CategoryDownloadState;
  downloadCategory: (category: GuideCategory) => Promise<void>;
  removeCategory: (category: GuideCategory) => Promise<void>;
  isLoaded: boolean;
}

export function useGuideDownloads(): UseGuideDownloads {
  const {
    downloadedCategories,
    downloadingCategories,
    getCategoryState,
    downloadCategory,
    removeCategory,
    isLoaded,
  } = useGuideStore();

  return {
    downloadedCategories,
    downloadingCategories,
    getCategoryState,
    downloadCategory,
    removeCategory,
    isLoaded,
  };
}
