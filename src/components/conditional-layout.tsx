'use client';

import { usePathname, useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { useAuth } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const publicPaths = ['/login', '/sign-up'];
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  // Redirección automática si no está autenticado y no es una ruta pública
  useEffect(() => {
    if (!loading && !user && !isPublicPath) {
      router.push('/login');
    }
  }, [loading, user, isPublicPath, router]);

  // Mientras Firebase está inicializando el estado de autenticación,
  // mostramos un estado de carga para evitar peticiones con auth: null.
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Iniciando sesión segura...</p>
      </div>
    );
  }

  if (isPublicPath) {
    return <>{children}</>;
  }

  // Si no hay usuario y no es ruta pública, no renderizamos nada (el useEffect redirigirá)
  if (!user) {
    return null;
  }

  // Para todas las demás páginas, envolvemos el contenido en el AppShell.
  return <AppShell>{children}</AppShell>;
}
