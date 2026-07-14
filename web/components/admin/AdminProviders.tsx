'use client';

import { AdminDirtyProvider } from '@/features/admin/AdminDirtyGuard';

export function AdminProviders({ children }: { children: React.ReactNode }) {
  return <AdminDirtyProvider>{children}</AdminDirtyProvider>;
}
