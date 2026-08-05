'use client';

import { AdminDirtyProvider } from '@/features/admin/AdminDirtyGuard';

/** Root layout already wraps AppI18nProvider — keep admin dirty guard only. */
export function AdminProviders({ children }: { children: React.ReactNode }) {
  return <AdminDirtyProvider>{children}</AdminDirtyProvider>;
}
