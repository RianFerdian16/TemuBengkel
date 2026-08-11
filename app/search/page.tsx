import { SearchExperience } from "@/components/search-experience"
import { SiteHeader } from "@/components/site-header"

function numberParam(value?: string) {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; location?: string; lat?: string; lng?: string }>
}) {
  const params = await searchParams
  return (
    <>
      <SiteHeader />
      <main className="search-main">
        <div className="shell search-heading">
          <p className="eyebrow">Pencarian bengkel</p>
          <h1>Temukan bengkel yang paling masuk akal untuk didatangi.</h1>
        </div>
        <div className="shell">
          <SearchExperience
            initialQuery={params.q || ""}
            initialLocation={params.location || ""}
            initialLatitude={numberParam(params.lat)}
            initialLongitude={numberParam(params.lng)}
          />
        </div>
      </main>
    </>
  )
}
