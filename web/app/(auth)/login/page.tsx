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
    <div className="login-overlay" id="loginOverlay" style={{ display: 'flex' }}>
      <div
        className="login-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="loginTitle"
      >
        <div className="login-modal-header">
          <img id="modalLogo" src="/wewinlogo.png" alt="WeWIN" />
        </div>
        <div className="login-modal-body">
          <h2 id="loginTitle">Đăng nhập</h2>
          <LoginForm next={next} />
        </div>
      </div>
    </div>
  );
}
