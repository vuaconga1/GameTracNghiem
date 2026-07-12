import { Header } from '@/components/Header';
import { requireSession } from '@/lib/auth';

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireSession();

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <Header displayName={session.displayName} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
