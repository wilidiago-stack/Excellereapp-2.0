'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase';
import { getIdTokenResult, type IdTokenResult } from 'firebase/auth';

export function useUserClaims() {
  const { user, loading: userLoading } = useUser();
  const [claims, setClaims] = useState<IdTokenResult['claims'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClaims = async () => {
      if (user) {
        try {
          // Pass true to force a refresh, ensuring we get the latest claims
          const idTokenResult = await getIdTokenResult(user, true);
          setClaims(idTokenResult.claims);
        } catch (error) {
          console.error("Error fetching user claims:", error);
          setClaims(null);
        } finally {
          setLoading(false);
        }
      } else if (!userLoading) {
        // If there's no user and we're not still waiting for one
        setClaims(null);
        setLoading(false);
      }
    };

    fetchClaims();
  }, [user, userLoading]);

  return { claims, loading };
}
