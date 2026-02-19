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
  // CollectionReference has a path property
  if (typeof target.path === 'string') return target.path;
  
  // Query objects have the path hidden in the internal _query or query property
  const internalQuery = target._query || target.query;
  if (internalQuery && internalQuery.path) {
    // Some versions have segments, others have a string path
    if (Array.isArray(internalQuery.path.segments)) {
      return internalQuery.path.segments.join('/');
    }
    if (typeof internalQuery.path.toString === 'function') {
      return internalQuery.path.toString();
    }
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
    // Memoization validation
    if (memoizedTargetRefOrQuery && !isMemoized(memoizedTargetRefOrQuery)) {
      console.warn(`useCollection: The provided object was not memoized with useMemoFirebase. This can lead to stability issues.`);
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
        
        // Only emit if it's a permission issue
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
