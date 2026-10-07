import './globals.css';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';
import { logout } from '@/app/auth-actions';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'cs-invoices',
  description: 'Create, issue and track client invoices.',
};

export default async function RootLayout({ children }) {
  const signedIn = await verifySession(cookies().get(SESSION_COOKIE)?.value);
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <Link href="/" className="brand">cs-invoices</Link>
            {signedIn && (
              <>
                <nav>
                  <Link href="/invoices">Invoices</Link>
                  <Link href="/clients">Clients</Link>
                  <Link href="/settings">Settings</Link>
                </nav>
                <form action={logout} style={{ marginLeft: 'auto' }}>
                  <button className="btn small" type="submit">Sign out</button>
                </form>
              </>
            )}
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
