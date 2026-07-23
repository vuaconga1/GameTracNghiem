import '@/styles/legacy/admin.css';

import { redirect } from 'next/navigation';

import { AdminProviders } from '@/components/admin/AdminProviders';
import { lookupSessionForPage } from '@/lib/auth';

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
  if (session.role !== 'admin') {
    redirect('/?error=forbidden');
  }

  return <AdminProviders>{children}</AdminProviders>;
}
