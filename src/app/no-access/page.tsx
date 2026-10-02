import { signOut } from '../auth/actions'

export const dynamic = 'force-dynamic'

// Shown when a signed-in user hasn't been granted access to any app tab.
export default function NoAccessPage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-20 text-center">
      <h1 className="text-xl font-semibold tracking-tight">No sections assigned yet</h1>
      <p className="mt-2 text-sm text-black/60 dark:text-white/60">
        Your account doesn&apos;t have access to any tabs right now. Ask an admin to grant you
        access, then sign in again.
      </p>
      <form action={signOut} className="mt-6">
        <button
          type="submit"
          className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-black/70 hover:bg-black/[.04] dark:border-white/10 dark:text-white/70 dark:hover:bg-white/[.06]"
        >
          Sign out
        </button>
      </form>
    </div>
  )
}
