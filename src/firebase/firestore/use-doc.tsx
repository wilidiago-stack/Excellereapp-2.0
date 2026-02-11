'use client';
import { useState, useEffect, useMemo } from 'react';
import { onSnapshot, doc, DocumentReference } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useDoc<T>(ref: DocumentReference<T> | null | undefined) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  const firestore = useFirestore();

  const stableRef = useMemo(() => ref, [ref]);

  useEffect(() => {
    if (!stableRef || !firestore) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      stableRef,
      (snapshot) => {
        setData(snapshot.data() ?? null);
        setLoading(false);
      },
      (error) => {
        const permissionError = new FirestorePermissionError({
          path: stableRef.path,
          operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
        console.error('Error fetching document:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [stableRef, firestore]);

  return { data, loading };
}
