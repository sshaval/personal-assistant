import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { loadAdminUsers, loadSystemStatus } from '@/lib/admin-data'
import { AdminStatus } from '../components/AdminStatus'
import { AdminUsers } from '../components/AdminUsers'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const me = await getSessionUser()
  if (!me || me.role !== 'admin') redirect('/')

  const [users, status] = await Promise.all([loadAdminUsers(), loadSystemStatus()])

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Admin</h1>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          Users &amp; system status · visible to admins only
        </p>
      </header>

      <AdminStatus status={status} />

      <div className="mt-8">
        <AdminUsers users={users} meId={me.id} />
      </div>
    </div>
  )
}
