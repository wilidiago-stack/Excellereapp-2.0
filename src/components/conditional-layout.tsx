'use client';

import { usePathname } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { useAuth } from '@/firebase';
import { Loader2 } from 'lucide-react';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const publicPaths = ['/login', '/sign-up'];
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

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

  // Para todas las demás páginas, envolvemos el contenido en el AppShell.
  return <AppShell>{children}</AppShell>;
}
