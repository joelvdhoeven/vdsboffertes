import { useState, useEffect, useCallback } from 'react';
import {
  getPrijzenboek,
  savePrijzenboek,
  addPrijzenboekItem,
  deletePrijzenboekItem,
  uploadPrijzenboekAdmin,
} from '../services/api';
import type { PrijzenboekItem } from '../types/prijzenboek';

interface UsePrijzenboekReturn {
  items: PrijzenboekItem[];
  filteredItems: PrijzenboekItem[];
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  searchQuery: string;
  selectedItems: Set<string>;
  isLoading: boolean;
  error: string | null;
  setSearchQuery: (query: string) => void;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (items: number) => void;
  toggleItemSelection: (code: string) => void;
  toggleSelectAll: () => void;
  clearSelection: () => void;
  loadPrijzenboek: () => Promise<void>;
  saveItems: () => Promise<void>;
  addItem: (item: PrijzenboekItem) => Promise<void>;
  deleteItem: (code: string) => Promise<void>;
  deleteSelectedItems: () => Promise<void>;
  uploadFile: (file: File, locale: 'nl' | 'en') => Promise<void>;
}

export function usePrijzenboek(): UsePrijzenboekReturn {
  const [items, setItems] = useState<PrijzenboekItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<PrijzenboekItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPrijzenboek = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getPrijzenboek();
      setItems(data.items);
      setFilteredItems(data.items);
      setCurrentPage(1);
      setSelectedItems(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prijzenboek');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrijzenboek();
  }, [loadPrijzenboek]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(items);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = items.filter(
        (item) =>
          item.code.toLowerCase().includes(query) ||
          item.omschrijving.toLowerCase().includes(query)
      );
      setFilteredItems(filtered);
    }
    setCurrentPage(1);
  }, [searchQuery, items]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const toggleItemSelection = useCallback((code: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(code)) {
        newSet.delete(code);
      } else {
        newSet.add(code);
      }
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = filteredItems.slice(startIndex, endIndex);
    const pageCodes = new Set(pageItems.map((item) => item.code));
    const allSelected = pageCodes.size > 0 && pageCodes.every((code) => selectedItems.has(code));

    if (allSelected) {
      setSelectedItems((prev) => {
        const newSet = new Set(prev);
        pageCodes.forEach((code) => newSet.delete(code));
        return newSet;
      });
    } else {
      setSelectedItems((prev) => {
        const newSet = new Set(prev);
        pageCodes.forEach((code) => newSet.add(code));
        return newSet;
      });
    }
  }, [currentPage, itemsPerPage, filteredItems, selectedItems]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const saveItems = useCallback(async () => {
    try {
      setIsLoading(true);
      await savePrijzenboek({ items });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prijzenboek');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [items]);

  const addItem = useCallback(async (item: PrijzenboekItem) => {
    try {
      setIsLoading(true);
      await addPrijzenboekItem(item);
      await loadPrijzenboek();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadPrijzenboek]);

  const deleteItem = useCallback(async (code: string) => {
    try {
      setIsLoading(true);
      await deletePrijzenboekItem(code);
      await loadPrijzenboek();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadPrijzenboek]);

  const deleteSelectedItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const deletePromises = Array.from(selectedItems).map((code) => deletePrijzenboekItem(code));
      await Promise.all(deletePromises);
      await loadPrijzenboek();
      setSelectedItems(new Set());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete items');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [selectedItems, loadPrijzenboek]);

  const uploadFile = useCallback(async (file: File, locale: 'nl' | 'en') => {
    try {
      setIsLoading(true);
      await uploadPrijzenboekAdmin(file, locale);
      await loadPrijzenboek();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadPrijzenboek]);

  return {
    items,
    filteredItems,
    currentPage,
    itemsPerPage,
    totalPages,
    searchQuery,
    selectedItems,
    isLoading,
    error,
    setSearchQuery,
    setCurrentPage,
    setItemsPerPage,
    toggleItemSelection,
    toggleSelectAll,
    clearSelection,
    loadPrijzenboek,
    saveItems,
    addItem,
    deleteItem,
    deleteSelectedItems,
    uploadFile,
  };
}

