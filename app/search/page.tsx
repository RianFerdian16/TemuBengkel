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
    <div className="user-app-page search-app-page">
      <SiteHeader />
      <main className="user-search-main">
        <SearchExperience
          initialQuery={params.q || ""}
          initialLocation={params.location || ""}
          initialLatitude={numberParam(params.lat)}
          initialLongitude={numberParam(params.lng)}
        />
      </main>
    </div>
  )
}
