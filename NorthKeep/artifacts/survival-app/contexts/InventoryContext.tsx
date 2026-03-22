import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";
import { getDatabase, generateId } from "@/lib/database";

export type ItemCategory = "Food" | "Water" | "Tools" | "Medical" | "Shelter" | "Comms" | "Other";
export type ItemCondition = "Good" | "Fair" | "Poor" | "Expired";
export type ItemStatus = "owned" | "need_to_buy";

export const CATEGORIES: ItemCategory[] = ["Food", "Water", "Tools", "Medical", "Shelter", "Comms", "Other"];
export const CONDITIONS: ItemCondition[] = ["Good", "Fair", "Poor", "Expired"];

export const CATEGORY_ICONS: Record<ItemCategory, string> = {
  Food: "nutrition-outline",
  Water: "water-outline",
  Tools: "hammer-outline",
  Medical: "medkit-outline",
  Shelter: "home-outline",
  Comms: "radio-outline",
  Other: "cube-outline",
};

export interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  quantity: number;
  unit: string | null;
  notes: string | null;
  condition: ItemCondition;
  expiryDate: number | null;
  kitId: string | null;
  status: ItemStatus;
  createdAt: number;
  updatedAt: number;
}

export interface InventoryKit {
  id: string;
  name: string;
  description: string | null;
  createdAt: number;
  updatedAt: number;
}

interface InventoryContextValue {
  items: InventoryItem[];
  kits: InventoryKit[];
  isLoading: boolean;
  loadInventory: () => Promise<void>;
  addItem: (item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) => Promise<string>;
  updateItem: (id: string, updates: Partial<Omit<InventoryItem, "id" | "createdAt" | "updatedAt">>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  addKit: (name: string, description?: string) => Promise<string>;
  updateKit: (id: string, name: string, description?: string) => Promise<void>;
  deleteKit: (id: string) => Promise<void>;
  getItemsByCategory: () => Record<ItemCategory, InventoryItem[]>;
  getItemsByKit: (kitId: string) => InventoryItem[];
  getExpiringItems: () => InventoryItem[];
  getExpiredItems: () => InventoryItem[];
  getNeedToBuyItems: () => InventoryItem[];
  markAsPurchased: (id: string) => Promise<void>;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [kits, setKits] = useState<InventoryKit[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadInventory = useCallback(async () => {
    setIsLoading(true);
    try {
      const db = await getDatabase();
      const itemRows = await db.getAllAsync<any>("SELECT * FROM inventory_items ORDER BY category, name");
      setItems(
        itemRows.map((r: any) => ({
          id: r.id,
          name: r.name,
          category: r.category as ItemCategory,
          quantity: r.quantity,
          unit: r.unit,
          notes: r.notes,
          condition: r.condition as ItemCondition,
          expiryDate: r.expiry_date,
          kitId: r.kit_id,
          status: (r.status as ItemStatus) || "owned",
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }))
      );
      const kitRows = await db.getAllAsync<any>("SELECT * FROM inventory_kits ORDER BY name");
      setKits(
        kitRows.map((r: any) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }))
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addItem = useCallback(async (item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) => {
    const db = await getDatabase();
    const id = generateId();
    const now = Date.now();
    await db.runAsync(
      "INSERT INTO inventory_items (id, name, category, quantity, unit, notes, condition, expiry_date, kit_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      id, item.name, item.category, item.quantity, item.unit || null, item.notes || null, item.condition, item.expiryDate || null, item.kitId || null, item.status || "owned", now, now
    );
    const newItem: InventoryItem = { ...item, id, createdAt: now, updatedAt: now };
    setItems((prev) => [...prev, newItem].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)));
    return id;
  }, []);

  const updateItem = useCallback(async (id: string, updates: Partial<Omit<InventoryItem, "id" | "createdAt" | "updatedAt">>) => {
    const db = await getDatabase();
    const now = Date.now();
    const sets: string[] = ["updated_at = ?"];
    const vals: any[] = [now];

    if (updates.name !== undefined) { sets.push("name = ?"); vals.push(updates.name); }
    if (updates.category !== undefined) { sets.push("category = ?"); vals.push(updates.category); }
    if (updates.quantity !== undefined) { sets.push("quantity = ?"); vals.push(updates.quantity); }
    if (updates.unit !== undefined) { sets.push("unit = ?"); vals.push(updates.unit); }
    if (updates.notes !== undefined) { sets.push("notes = ?"); vals.push(updates.notes); }
    if (updates.condition !== undefined) { sets.push("condition = ?"); vals.push(updates.condition); }
    if (updates.expiryDate !== undefined) { sets.push("expiry_date = ?"); vals.push(updates.expiryDate); }
    if (updates.kitId !== undefined) { sets.push("kit_id = ?"); vals.push(updates.kitId); }
    if (updates.status !== undefined) { sets.push("status = ?"); vals.push(updates.status); }

    vals.push(id);
    await db.runAsync(`UPDATE inventory_items SET ${sets.join(", ")} WHERE id = ?`, ...vals);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates, updatedAt: now } : i)));
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM inventory_items WHERE id = ?", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const addKit = useCallback(async (name: string, description?: string) => {
    const db = await getDatabase();
    const id = generateId();
    const now = Date.now();
    await db.runAsync(
      "INSERT INTO inventory_kits (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      id, name, description || null, now, now
    );
    setKits((prev) => [...prev, { id, name, description: description || null, createdAt: now, updatedAt: now }]);
    return id;
  }, []);

  const updateKit = useCallback(async (id: string, name: string, description?: string) => {
    const db = await getDatabase();
    const now = Date.now();
    await db.runAsync("UPDATE inventory_kits SET name = ?, description = ?, updated_at = ? WHERE id = ?", name, description || null, now, id);
    setKits((prev) => prev.map((k) => (k.id === id ? { ...k, name, description: description || null, updatedAt: now } : k)));
  }, []);

  const deleteKit = useCallback(async (id: string) => {
    const db = await getDatabase();
    await db.runAsync("UPDATE inventory_items SET kit_id = NULL WHERE kit_id = ?", id);
    await db.runAsync("DELETE FROM inventory_kits WHERE id = ?", id);
    setKits((prev) => prev.filter((k) => k.id !== id));
    setItems((prev) => prev.map((i) => (i.kitId === id ? { ...i, kitId: null } : i)));
  }, []);

  const getItemsByCategory = useCallback(() => {
    const grouped: Record<ItemCategory, InventoryItem[]> = {
      Food: [], Water: [], Tools: [], Medical: [], Shelter: [], Comms: [], Other: [],
    };
    for (const item of items) {
      if (grouped[item.category]) {
        grouped[item.category].push(item);
      }
    }
    return grouped;
  }, [items]);

  const getItemsByKit = useCallback((kitId: string) => items.filter((i) => i.kitId === kitId), [items]);

  const getExpiringItems = useCallback(() => {
    const thirtyDays = Date.now() + 30 * 24 * 60 * 60 * 1000;
    return items.filter((i) => i.expiryDate && i.expiryDate > Date.now() && i.expiryDate <= thirtyDays);
  }, [items]);

  const getExpiredItems = useCallback(() => {
    return items.filter((i) => i.expiryDate && i.expiryDate <= Date.now());
  }, [items]);

  const getNeedToBuyItems = useCallback(() => {
    return items.filter((i) => i.status === "need_to_buy");
  }, [items]);

  const markAsPurchased = useCallback(async (id: string) => {
    await updateItem(id, { status: "owned", condition: "Good" });
  }, [updateItem]);

  const value = useMemo(
    () => ({
      items, kits, isLoading, loadInventory, addItem, updateItem, deleteItem,
      addKit, updateKit, deleteKit, getItemsByCategory, getItemsByKit, getExpiringItems, getExpiredItems,
      getNeedToBuyItems, markAsPurchased,
    }),
    [items, kits, isLoading, loadInventory, addItem, updateItem, deleteItem, addKit, updateKit, deleteKit, getItemsByCategory, getItemsByKit, getExpiringItems, getExpiredItems, getNeedToBuyItems, markAsPurchased]
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) throw new Error("useInventory must be used within InventoryProvider");
  return context;
}
