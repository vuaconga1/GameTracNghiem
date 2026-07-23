import { redirect } from 'next/navigation';

import { MainShell } from '@/components/shell/MainShell';
import { SidebarProvider } from '@/components/shell/SidebarContext';
import { lookupSessionForPage } from '@/lib/auth';
import { loadHeaderExperience } from '@/lib/loadHeaderExperience';

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { session, stale } = await lookupSessionForPage();
  if (!session) {
    if (stale) {
      redirect('/api/auth/logout?next=/login');
    }
    redirect('/login');
  }

  const experience = await loadHeaderExperience(session.userId);

  return (
    <SidebarProvider>
      <MainShell
        displayName={session.displayName}
        isAdmin={session.role === 'admin'}
        level={experience.level}
        tier={experience.tier}
        expInLevel={experience.expInLevel}
        expToNextLevel={experience.expToNextLevel}
        progressPercent={experience.progressPercent}
      >
        {children}
      </MainShell>
    </SidebarProvider>
  );
}
