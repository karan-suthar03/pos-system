import { useEffect, useState } from 'react';

const DRAFTS_STORAGE_KEY = 'order_drafts';

export function useDrafts() {
  const [drafts, setDrafts] = useState([]);

  useEffect(() => {
    loadDrafts();
  }, []);

  function loadDrafts() {
    try {
      const stored = localStorage.getItem(DRAFTS_STORAGE_KEY);
      if (!stored) {
        setDrafts([]);
        return;
      }

      const parsed = JSON.parse(stored);
      setDrafts(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.error('Error loading drafts:', error);
      setDrafts([]);
    }
  }

  function saveDrafts(nextDrafts) {
    try {
      localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(nextDrafts));
      setDrafts(nextDrafts);
    } catch (error) {
      console.error('Error saving drafts:', error);
    }
  }

  function addDraft(order) {
    const newDraft = {
      id: Date.now(),
      items: Array.isArray(order?.items) ? order.items : [],
      tag: order?.tag || '',
      createdAt: new Date().toISOString(),
    };

    saveDrafts([...drafts, newDraft]);
    return newDraft.id;
  }

  function updateDraft(draftId, order) {
    const nextDrafts = drafts.map((draft) =>
      draft.id === draftId
        ? {
            ...draft,
            items: Array.isArray(order?.items) ? order.items : [],
            tag: order?.tag || '',
            updatedAt: new Date().toISOString(),
          }
        : draft,
    );

    saveDrafts(nextDrafts);
  }

  function deleteDraft(draftId) {
    const nextDrafts = drafts.filter((draft) => draft.id !== draftId);
    saveDrafts(nextDrafts);
  }

  function getDraft(draftId) {
    return drafts.find((draft) => draft.id === draftId) || null;
  }

  function clearAllDrafts() {
    saveDrafts([]);
  }

  return {
    drafts,
    addDraft,
    updateDraft,
    deleteDraft,
    getDraft,
    clearAllDrafts,
  };
}
