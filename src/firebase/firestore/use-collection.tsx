'use client';
import { useState, useEffect, useMemo } from 'react';
import { onSnapshot, collection, Query } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useCollection<T>(query: Query<T> | null | undefined) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);

  const firestore = useFirestore();
  const stableQuery = useMemo(() => query, [query]);

  useEffect(() => {
    if (!stableQuery || !firestore) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = onSnapshot(
        stableQuery,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
        setData(data);
        setLoading(false);
      },
      (error) => {
        const permissionError = new FirestorePermissionError({
            path: (stableQuery as any).path || 'unknown_collection_path',
            operation: 'list',
          });
        errorEmitter.emit('permission-error', permissionError);
        console.error('Error fetching collection:', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [stableQuery, firestore]);

  return { data, loading };
}
