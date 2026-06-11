/**
 * Domains page — /domains
 *
 * 3×N grid of domain cards, one per active device.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { DomainCard } from '@/components/dashboard/DomainCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import type { DeviceDTO } from '@/lib/frontend/api';

async function getDevices(cookieHdr: string): Promise<DeviceDTO[]> {
  try {
    const base = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000';
    const res  = await fetch(`${base}/api/devices`, {
      cache:   'no-store',
      headers: { Cookie: cookieHdr },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { success: boolean; data: DeviceDTO[] };
    return json.success ? json.data : [];
  } catch {
    return [];
  }
}

export default async function DomainsPage() {
  const cookieStore = await cookies();
  const cookieHdr   = cookieStore.toString();
  const devices     = await getDevices(cookieHdr);

  const allReachable = devices.every(d => d.lastStatus !== 'critical');

  return (
    <>
      <div className="page-hd">
        <div className="page-hd-left">
          <h1 className="page-title">Domains</h1>
          <div className="page-sub">
            {devices.length} system{devices.length !== 1 ? 's' : ''}
            {' · '}
            {allReachable ? 'all reachable' : 'some unreachable'}
          </div>
        </div>
        <div className="page-hd-actions">
          <Button variant="default">Filter</Button>
          <Button variant="primary">+ Add</Button>
        </div>
      </div>

      {devices.length > 0 ? (
        <div className="dc-grid">
          {devices.map(d => (
            <Link key={d.id} href={`/devices/${d.id}`} style={{ textDecoration: 'none' }}>
              <DomainCard device={d} />
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No domains"
          message="No active devices registered in the fleet"
        />
      )}
    </>
  );
}
