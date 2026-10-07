import { login } from '@/app/auth-actions';

export default function LoginPage({ searchParams }) {
  return (
    <div style={{ maxWidth: 360, margin: '56px auto 0' }}>
      <h1>Sign in</h1>
      <p className="sub">Enter the password to open cs-invoices.</p>
      {searchParams?.error && (
        <div className="notice" style={{ background: '#fee2e2', color: '#991b1b' }}>
          That password is not correct. Try again.
        </div>
      )}
      <form action={login} className="panel stack">
        <label>Password<input type="password" name="password" required autoFocus autoComplete="current-password" /></label>
        <div className="actions"><button className="btn primary" type="submit">Sign in</button></div>
      </form>
    </div>
  );
}
