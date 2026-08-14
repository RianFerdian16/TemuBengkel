import { AccountSettings } from "@/components/account-settings"
import { AdminConsoleShell } from "@/components/admin-console-shell"
import { requireAdminSession } from "@/lib/console-access"

export default async function AdminSettingsPage() {
  const session = await requireAdminSession()
  return (
    <AdminConsoleShell userName={session.user.fullName}>
      <div className="console-content"><div className="console-page-head"><div><p className="eyebrow">Pengaturan admin</p><h1>Akun & keamanan.</h1><p>Kelola nama admin, kata sandi, dan sesi aktif tanpa memengaruhi data owner.</p></div></div><AccountSettings kind="admin" fullName={session.user.fullName} email={session.user.email} /></div>
    </AdminConsoleShell>
  )
}
