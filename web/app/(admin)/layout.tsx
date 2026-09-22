import { redirect } from 'next/navigation';

import { AdminProviders } from '@/components/admin/AdminProviders';
import { canManageClasses, lookupSessionForPage } from '@/lib/auth';
import '@/styles/legacy/admin.css';

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { session, stale } = await lookupSessionForPage();
  if (!session) {
    if (stale) {
      redirect('/api/auth/logout?next=/login?next=%2Fadmin');
    }
    redirect('/login?next=/admin');
  }
  if (!canManageClasses(session.role)) {
    redirect('/?error=forbidden');
  }

  return <AdminProviders>{children}</AdminProviders>;
}
