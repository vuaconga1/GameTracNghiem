import { redirect } from 'next/navigation';

import { AdminProviders } from '@/components/admin/AdminProviders';
import { requireAdmin } from '@/lib/auth';

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  try {
    await requireAdmin();
  } catch (err) {
    const status =
      typeof err === 'object' && err !== null && 'status' in err
        ? Number((err as { status: number }).status)
        : 500;
    if (status === 401) {
      redirect('/login?next=/admin');
    }
    redirect('/?error=forbidden');
  }

  return <AdminProviders>{children}</AdminProviders>;
}
