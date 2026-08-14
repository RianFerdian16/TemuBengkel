import { AccountSettings } from "@/components/account-settings"
import { OwnerConsoleShell } from "@/components/owner-console-shell"
import { requireOwnerSession } from "@/lib/console-access"

export default async function OwnerSettingsPage() {
  const session = await requireOwnerSession()
  return (
    <OwnerConsoleShell userName={session.user.fullName}>
      <div className="console-content">
        <div className="console-page-head"><div><p className="eyebrow">Pengaturan pemilik</p><h1>Akun & keamanan.</h1><p>Kelola identitas akun, kata sandi, sesi aktif, dan penghapusan akun.</p></div></div>
        <AccountSettings kind="owner" fullName={session.user.fullName} email={session.user.email} />
      </div>
    </OwnerConsoleShell>
  )
}
