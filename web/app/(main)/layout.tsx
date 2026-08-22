import { MainShell } from '@/components/shell/MainShell';
import { HomeNavProvider } from '@/components/shell/HomeNavContext';
import { SidebarProvider } from '@/components/shell/SidebarContext';
import { lookupSessionForPage } from '@/lib/auth';
import { loadHeaderExperience } from '@/lib/loadHeaderExperience';
import { homeHrefForRole, normalizeUserRole } from '@/lib/userRoles';
export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { session } = await lookupSessionForPage();
  const experience = session ? await loadHeaderExperience(session.userId) : null;
  const homeHref = session ? homeHrefForRole(normalizeUserRole(session.role)) : '/';

  return (
    <SidebarProvider>
      <HomeNavProvider homeHref={homeHref}>
        <MainShell
          displayName={session?.displayName}
          isAuthenticated={Boolean(session)}
          isAdmin={session?.role === 'admin'}
          homeHref={homeHref}
          level={experience?.level}
          tier={experience?.tier}
          expInLevel={experience?.expInLevel}
          expToNextLevel={experience?.expToNextLevel}
          progressPercent={experience?.progressPercent}
        >
          {children}
        </MainShell>
      </HomeNavProvider>
    </SidebarProvider>
  );}
