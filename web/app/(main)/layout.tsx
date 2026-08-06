import { MainShell } from '@/components/shell/MainShell';
import { SidebarProvider } from '@/components/shell/SidebarContext';
import { lookupSessionForPage } from '@/lib/auth';
import { loadHeaderExperience } from '@/lib/loadHeaderExperience';

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { session } = await lookupSessionForPage();
  const experience = session ? await loadHeaderExperience(session.userId) : null;

  return (
    <SidebarProvider>
      <MainShell
        displayName={session?.displayName}
        isAuthenticated={Boolean(session)}
        isAdmin={session?.role === 'admin'}
        level={experience?.level}
        tier={experience?.tier}
        expInLevel={experience?.expInLevel}
        expToNextLevel={experience?.expToNextLevel}
        progressPercent={experience?.progressPercent}
      >
        {children}
      </MainShell>
    </SidebarProvider>
  );
}
