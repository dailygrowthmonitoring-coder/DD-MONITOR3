import { redirect }          from 'next/navigation'
import { getAuthForLayout }  from '@/lib/auth/validate-session'
import { DashboardShell }    from '@/components/dashboard/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuthForLayout()
  if (!auth.ok) redirect(auth.redirect)

  return <DashboardShell>{children}</DashboardShell>
}
