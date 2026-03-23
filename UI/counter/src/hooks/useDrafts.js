import { useState, useEffect } from 'react';

const DRAFTS_STORAGE_KEY = 'order_drafts';

export function useDrafts() {
  const [drafts, setDrafts] = useState([]);

  // Load drafts from localStorage on mount
  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = () => {
    try {
      const stored = localStorage.getItem(DRAFTS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setDrafts(parsed);
      }
    } catch (error) {
      console.error('Error loading drafts:', error);
      setDrafts([]);
    }
  };

  const saveDrafts = (newDrafts) => {
    try {
      localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(newDrafts));
      setDrafts(newDrafts);
    } catch (error) {
      console.error('Error saving drafts:', error);
    }
  };

  const addDraft = (order) => {
    const newDraft = {
      id: Date.now(),
      items: order.items,
      tag: order.tag || '',
      createdAt: new Date().toISOString(),
    };
    const updatedDrafts = [...drafts, newDraft];
    saveDrafts(updatedDrafts);
    return newDraft.id;
  };

  const updateDraft = (draftId, order) => {
    const updatedDrafts = drafts.map(draft =>
      draft.id === draftId
        ? { ...draft, items: order.items, tag: order.tag || '' }
        : draft
    );
    saveDrafts(updatedDrafts);
  };

  const deleteDraft = (draftId) => {
    const updatedDrafts = drafts.filter(draft => draft.id !== draftId);
    saveDrafts(updatedDrafts);
  };

  const getDraft = (draftId) => {
    return drafts.find(draft => draft.id === draftId);
  };

  const clearAllDrafts = () => {
    saveDrafts([]);
  };

  return {
    drafts,
    addDraft,
    updateDraft,
    deleteDraft,
    getDraft,
    clearAllDrafts,
  };
}
