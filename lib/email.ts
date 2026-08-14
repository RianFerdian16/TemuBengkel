export function emailDeliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
}

export function appBaseUrl(fallbackOrigin?: string) {
  const configured = process.env.APP_URL?.replace(/\/$/, "")
  if (configured) return configured
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  return (fallbackOrigin || "http://localhost:3000").replace(/\/$/, "")
}

async function sendEmail(input: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) return false

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html }),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  })
  if (!response.ok) throw new Error("Email keamanan belum dapat dikirim. Coba lagi beberapa saat lagi.")
  return true
}

function emailShell(title: string, copy: string, actionLabel: string, actionUrl: string) {
  return `<!doctype html><html><body style="margin:0;background:#f3f1ea;font-family:Arial,sans-serif;color:#171c25"><div style="max-width:560px;margin:32px auto;background:#fff;border:1px solid #d7d5cf;padding:28px"><div style="font-weight:900;letter-spacing:.08em">TEMUBENGKEL</div><h1 style="font-size:26px;margin:28px 0 12px">${title}</h1><p style="line-height:1.65;color:#5f6773">${copy}</p><p style="margin:28px 0"><a href="${actionUrl}" style="display:inline-block;background:#171c25;color:#fff;text-decoration:none;padding:13px 18px;font-weight:800">${actionLabel}</a></p><p style="font-size:12px;line-height:1.6;color:#7a818b">Jika Anda tidak meminta tindakan ini, abaikan email ini. Tautan memiliki masa berlaku terbatas.</p></div></body></html>`
}

export async function sendVerificationEmail(to: string, url: string) {
  return sendEmail({
    to,
    subject: "Verifikasi email pemilik TemuBengkel",
    html: emailShell("Verifikasi email Anda", "Konfirmasi alamat email untuk mengaktifkan akses Portal Pemilik TemuBengkel.", "Verifikasi email", url),
  })
}

export async function sendPasswordResetEmail(to: string, url: string) {
  return sendEmail({
    to,
    subject: "Atur ulang kata sandi TemuBengkel",
    html: emailShell("Atur ulang kata sandi", "Kami menerima permintaan untuk mengganti kata sandi akun TemuBengkel Anda.", "Atur ulang kata sandi", url),
  })
}
