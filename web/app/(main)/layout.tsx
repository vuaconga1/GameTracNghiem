import { MainShell } from '@/components/shell/MainShell';
import { SidebarProvider } from '@/components/shell/SidebarContext';
import { requireSession } from '@/lib/auth';
import { loadHeaderExperience } from '@/lib/loadHeaderExperience';

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireSession();

  const experience = await loadHeaderExperience(session.userId);

  return (
    <SidebarProvider>
      <MainShell
        displayName={session.displayName}
        isAdmin={session.role === 'admin'}
        level={experience.level}
        tier={experience.tier}
      >
        {children}
      </MainShell>
    </SidebarProvider>
  );
}
