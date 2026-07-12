import { LoginForm } from '@/features/auth/LoginForm';

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string | string[];
  }>;
};

function safeNext(value: string | string[] | undefined) {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return undefined;
  }
  return next;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = safeNext(params?.next);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-[2rem] border border-[var(--border)] bg-[var(--white)] p-8 shadow-[0_24px_80px_rgba(13,43,110,0.12)]">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)] text-3xl font-black text-[var(--white)]">
            W
          </div>
          <h1 className="text-3xl font-black text-[var(--primary)]">WeWIN</h1>
          <p className="mt-2 font-bold text-[var(--text-muted)]">
            Đăng nhập để tiếp tục luyện tập
          </p>
        </div>

        <LoginForm next={next} />
      </section>
    </main>
  );
}
