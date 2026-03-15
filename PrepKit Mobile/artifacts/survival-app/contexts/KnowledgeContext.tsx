import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from "react";
import { getDatabase, generateId } from "@/lib/database";
import { KNOWLEDGE_TOPICS, KnowledgeTopic } from "@/lib/knowledge-data";

export interface KnowledgeArticle {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  category: string;
  wikiUrl: string;
  iconName: string | null;
  downloaded: boolean;
  downloadedAt: number | null;
  contentLength: number;
}

interface KnowledgeContextValue {
  articles: KnowledgeArticle[];
  isLoading: boolean;
  downloadingIds: Set<string>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  loadArticles: () => Promise<void>;
  downloadArticle: (id: string) => Promise<void>;
  deleteArticle: (id: string) => Promise<void>;
  deleteAllArticles: () => Promise<void>;
  filteredArticles: KnowledgeArticle[];
  downloadedCount: number;
  totalStorageBytes: number;
}

const KnowledgeContext = createContext<KnowledgeContextValue | null>(null);

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function KnowledgeProvider({ children }: { children: ReactNode }) {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const seedTopics = useCallback(async () => {
    const db = await getDatabase();
    for (const topic of KNOWLEDGE_TOPICS) {
      const existing = await db.getFirstAsync<any>("SELECT id FROM knowledge_articles WHERE id = ?", topic.id);
      if (!existing) {
        await db.runAsync(
          "INSERT INTO knowledge_articles (id, title, summary, category, wiki_url, icon_name, downloaded) VALUES (?, ?, ?, ?, ?, ?, 0)",
          topic.id,
          topic.title,
          topic.summary,
          topic.category,
          topic.wikiUrl,
          topic.iconName
        );
      }
    }
  }, []);

  const loadArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      await seedTopics();
      const db = await getDatabase();
      const rows = await db.getAllAsync<any>("SELECT * FROM knowledge_articles ORDER BY category, title");
      setArticles(
        rows.map((r: any) => ({
          id: r.id,
          title: r.title,
          summary: r.summary,
          content: r.content,
          category: r.category,
          wikiUrl: r.wiki_url,
          iconName: r.icon_name,
          downloaded: r.downloaded === 1,
          downloadedAt: r.downloaded_at,
          contentLength: r.content_length || 0,
        }))
      );
    } finally {
      setIsLoading(false);
    }
  }, [seedTopics]);

  const downloadArticle = useCallback(async (id: string) => {
    setDownloadingIds((prev) => new Set(prev).add(id));
    try {
      const db = await getDatabase();
      const article = await db.getFirstAsync<any>("SELECT * FROM knowledge_articles WHERE id = ?", id);
      if (!article) return;

      const wikiTitle = article.wiki_url.split("/").pop();
      const pageUrl = `https://en.wikipedia.org/api/rest_v1/page/mobile-html/${wikiTitle}`;
      let content = "";

      try {
        const summaryResp = await fetch(article.wiki_url);
        const summaryData = await summaryResp.json();
        content = summaryData.extract || "";

        try {
          const pageResp = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${wikiTitle}`);
          const pageData = await pageResp.json();
          if (pageData.extract && pageData.extract.length > content.length) {
            content = pageData.extract;
          }
        } catch {}

        try {
          const htmlResp = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(wikiTitle || "")}&prop=extracts&explaintext=1&format=json&origin=*`);
          const htmlData = await htmlResp.json();
          const pages = htmlData?.query?.pages;
          if (pages) {
            const page = Object.values(pages)[0] as any;
            if (page?.extract && page.extract.length > content.length) {
              content = page.extract;
            }
          }
        } catch {}
      } catch (err) {
        content = "";
      }

      if (!content || content.length < 10) {
        return;
      }

      const now = Date.now();
      await db.runAsync(
        "UPDATE knowledge_articles SET content = ?, downloaded = 1, downloaded_at = ?, content_length = ? WHERE id = ?",
        content,
        now,
        content.length,
        id
      );

      setArticles((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, content, downloaded: true, downloadedAt: now, contentLength: content.length } : a
        )
      );
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const deleteArticle = useCallback(async (id: string) => {
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE knowledge_articles SET content = NULL, downloaded = 0, downloaded_at = NULL, content_length = 0 WHERE id = ?",
      id
    );
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, content: null, downloaded: false, downloadedAt: null, contentLength: 0 } : a))
    );
  }, []);

  const deleteAllArticles = useCallback(async () => {
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE knowledge_articles SET content = NULL, downloaded = 0, downloaded_at = NULL, content_length = 0"
    );
    setArticles((prev) => prev.map((a) => ({ ...a, content: null, downloaded: false, downloadedAt: null, contentLength: 0 })));
  }, []);

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const q = searchQuery.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary?.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        (a.downloaded && a.content?.toLowerCase().includes(q))
    );
  }, [articles, searchQuery]);

  const downloadedCount = useMemo(() => articles.filter((a) => a.downloaded).length, [articles]);
  const totalStorageBytes = useMemo(() => articles.reduce((acc, a) => acc + (a.contentLength || 0), 0), [articles]);

  const value = useMemo(
    () => ({
      articles,
      isLoading,
      downloadingIds,
      searchQuery,
      setSearchQuery,
      loadArticles,
      downloadArticle,
      deleteArticle,
      deleteAllArticles,
      filteredArticles,
      downloadedCount,
      totalStorageBytes,
    }),
    [articles, isLoading, downloadingIds, searchQuery, loadArticles, downloadArticle, deleteArticle, deleteAllArticles, filteredArticles, downloadedCount, totalStorageBytes]
  );

  return <KnowledgeContext.Provider value={value}>{children}</KnowledgeContext.Provider>;
}

export function useKnowledge() {
  const context = useContext(KnowledgeContext);
  if (!context) throw new Error("useKnowledge must be used within KnowledgeProvider");
  return context;
}
