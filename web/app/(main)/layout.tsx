import { MainShell } from '@/components/shell/MainShell';
import { SidebarProvider } from '@/components/shell/SidebarContext';
import { requireSession } from '@/lib/auth';

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireSession();

  return (
    <SidebarProvider>
      <MainShell displayName={session.displayName}>{children}</MainShell>
    </SidebarProvider>
  );
}
