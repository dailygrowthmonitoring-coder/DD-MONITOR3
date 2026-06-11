/**
 * Dashboard shell — sidebar + topbar wrapping all dashboard pages.
 *
 * Fetches devices server-side for the live sidebar status list.
 * Session is validated here; unauthenticated requests redirect to /login.
 */

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/types';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import type { DeviceDTO } from '@/lib/frontend/api';

async function getSessionUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function getDevices(): Promise<DeviceDTO[]> {
  try {
    const baseUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll()
      .map(c => `${c.name}=${c.value}`)
      .join('; ');

    const res = await fetch(`${baseUrl}/api/devices`, {
      cache:   'no-store',
      headers: { Cookie: cookieHeader },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { success: boolean; data: DeviceDTO[] };
    return json.success ? json.data : [];
  } catch {
    return [];
  }
}

async function getAlertCount(): Promise<number> {
  try {
    const baseUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll()
      .map(c => `${c.name}=${c.value}`)
      .join('; ');

    const res = await fetch(`${baseUrl}/api/alerts?active=true&limit=1`, {
      cache:   'no-store',
      headers: { Cookie: cookieHeader },
    });
    if (!res.ok) return 0;
    const json = (await res.json()) as { success: boolean; meta?: { total: number } };
    return json.success && json.meta ? json.meta.total : 0;
  } catch {
    return 0;
  }
}

export default async function DashboardLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect('/login');
  }

  const [devices, alertCount] = await Promise.all([
    getDevices(),
    getAlertCount(),
  ]);

  const email    = user.email ?? '';
  const userName = email.split('@')[0] ?? 'Admin';

  return (
    <div style={{ display: 'flex', minHeight: '100dvh' }}>
      <Sidebar
        devices={devices}
        alertCount={alertCount}
        userName={userName}
        userRole="sysadmin"
      />
      <div style={{ flex: 1, marginLeft: 'var(--sw)' }}>
        <Topbar hasAlerts={alertCount > 0} />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
