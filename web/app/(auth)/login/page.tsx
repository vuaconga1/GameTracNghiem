import { LoginForm } from '@/features/auth/LoginForm';

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string | string[];
    sso_error?: string | string[];
  }>;
};

function safeNext(value: string | string[] | undefined) {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return undefined;
  }
  return next;
}

function ssoErrorMessage(value: string | string[] | undefined) {
  const code = Array.isArray(value) ? value[0] : value;
  if (code === 'invalid_token') {
    return 'Liên kết đăng nhập từ Parent Portal không hợp lệ hoặc đã hết hạn. Vui lòng mở lại từ trang báo bài.';
  }
  if (code === 'forbidden') {
    return 'Không thể đăng nhập SSO với tài khoản này.';
  }
  if (code === 'server_error') {
    return 'Không thể đăng nhập SSO. Vui lòng thử lại.';
  }
  return undefined;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = safeNext(params?.next);
  const ssoError = ssoErrorMessage(params?.sso_error);

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
          <LoginForm next={next} initialError={ssoError} />
        </div>
      </div>
    </div>
  );
}
