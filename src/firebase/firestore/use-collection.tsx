'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { isMemoized } from '../provider';

export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

/**
 * Robustly extracts the collection path from a Reference or Query for debugging.
 */
function getPath(target: any): string {
  if (!target) return 'unknown';
  if (typeof target.path === 'string') return target.path;
  
  // Extract path from internal query representation if available
  const queryPath = target._query?.path || target.query?.path;
  if (queryPath && Array.isArray(queryPath.segments)) {
    return queryPath.segments.join('/');
  }
  
  return 'collection';
}

export function useCollection<T = any>(
    memoizedTargetRefOrQuery: (CollectionReference<DocumentData> | Query<DocumentData>) | null | undefined,
): UseCollectionResult<T> {
  const [data, setData] = useState<WithId<T>[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    // Memoization validation only on client to avoid SSR errors
    if (memoizedTargetRefOrQuery && !isMemoized(memoizedTargetRefOrQuery)) {
      throw new Error(`useCollection: The provided object was not memoized with useMemoFirebase. This is required for connection stability.`);
    }

    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: WithId<T>[] = [];
        snapshot.forEach((doc) => {
          results.push({ ...(doc.data() as T), id: doc.id });
        });
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        const path = getPath(memoizedTargetRefOrQuery);
                     
        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        });

        setError(contextualError);
        setData(null);
        setIsLoading(false);
        
        // Only emit if it's likely a rules issue
        if (err.code === 'permission-denied') {
          errorEmitter.emit('permission-error', contextualError);
        } else {
          console.error('[useCollection] Firestore error:', err);
        }
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery]);

  return { data, isLoading, error };
}
