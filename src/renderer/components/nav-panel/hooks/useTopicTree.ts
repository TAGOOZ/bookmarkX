import { useState, useEffect, useCallback } from 'react';

export interface TopicTreeNode {
  id: string;
  name: string;
  parent_id: string | null;
  created_by: 'ai' | 'user';
  created_at: string;
  children: TopicTreeNode[];
  bookmark_count: number;
}

export function useTopicTree() {
  const [topicTree, setTopicTree] = useState<TopicTreeNode[]>([]);

  const refresh = useCallback(async () => {
    try {
      const tree = await (window as any).api?.getTopicTree?.();
      if (tree) setTopicTree(tree);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createTopic = useCallback(async (name: string) => {
    await (window as any).api?.createTopic?.(name, null);
    await refresh();
  }, [refresh]);

  const renameTopic = useCallback(async (id: string, name: string) => {
    await (window as any).api?.renameTopic?.(id, name);
    await refresh();
  }, [refresh]);

  const deleteTopic = useCallback(async (id: string) => {
    await (window as any).api?.deleteTopic?.(id);
    await refresh();
  }, [refresh]);

  const moveBookmark = useCallback(async (bookmarkId: string, targetTopicId: string | null) => {
    await (window as any).api?.moveBookmarkToTopic?.(bookmarkId, targetTopicId);
    await refresh();
  }, [refresh]);

  return { topicTree, refresh, createTopic, renameTopic, deleteTopic, moveBookmark };
}
