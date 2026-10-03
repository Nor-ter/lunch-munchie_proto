import { englishText } from '@shared/englishCopy';
import { useEffect, useMemo, useState } from 'react';
import { Ban, Check, ChevronLeft, ChevronRight, ImageOff, LoaderCircle, Save, Search, UserRound } from 'lucide-react';

type ReviewStatus = 'pending' | 'approved' | 'rejected';
type PhotoKind = 'dish' | 'table' | 'interior' | 'storefront' | 'other' | 'unclassified';
type PhotoAsset = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantCategory: string;
  restaurantAddress: string;
  url: string;
  r2Key: string;
  kind: PhotoKind;
  dishes: string[];
  vibeTags: string[];
  quality: number | null;
  hasPerson: boolean;
  source: string;
  reviewStatus: ReviewStatus;
  reviewNotes: string | null;
  reviewedAt: string | null;
};
type PhotoResponse = {
  photos: PhotoAsset[];
  summary: Record<ReviewStatus | 'all', { photos: number; restaurants: number }>;
  readinessSummary: {
    restaurants: number;
    eligibleRestaurants: number;
    insufficientRestaurants: number;
    noSafePhotos: number;
    oneSafePhoto: number;
    minimumDistinctPhotos: number;
  };
  restaurantMedia: Record<string, { totalPhotos: number; distinctSafePhotos: number; eligible: boolean }>;
  pagination: { total: number; limit: number; offset: number; hasMore: boolean };
};
type Readiness = 'all' | 'eligible' | 'insufficient';

const REVIEW_LABELS: Record<ReviewStatus, string> = { pending: "Pending Review", approved: "Approve", rejected: "Exclude" };
const KIND_LABELS: Record<PhotoKind, string> = {
  dish: "Single Dish", table: "Table of Food", interior: "Interior", storefront: "Exterior", other: "Other", unclassified: "Uncategorized",
};
const PAGE_SIZE = 24;

function ReviewBadge({ status }: { status: ReviewStatus }) {
  const tone = status === 'approved'
    ? 'bg-[#25423A] text-[#B8E5D5]'
    : status === 'rejected'
      ? 'bg-[#52282A] text-[#FFB9BA]'
      : 'bg-[#4C4227] text-[#FFE1A2]';
  return <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${tone}`}>{englishText(REVIEW_LABELS[status])}</span>;
}

function PhotoEditor({ photo, onSaved }: { photo: PhotoAsset; onSaved: () => Promise<void> }) {
  const [kind, setKind] = useState(photo.kind);
  const [hasPerson, setHasPerson] = useState(photo.hasPerson);
  const [quality, setQuality] = useState(photo.quality === null ? '' : String(photo.quality));
  const [notes, setNotes] = useState(photo.reviewNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [broken, setBroken] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setKind(photo.kind);
    setHasPerson(photo.hasPerson);
    setQuality(photo.quality === null ? '' : String(photo.quality));
    setNotes(photo.reviewNotes ?? '');
    setBroken(false);
  }, [photo]);

  const save = async (reviewStatus: ReviewStatus = photo.reviewStatus) => {
    setSaving(true);
    setError('');
    const parsedQuality = quality.trim() === '' ? null : Number(quality);
    try {
      const response = await fetch(`/api/admin/photos/${encodeURIComponent(photo.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewStatus, kind, hasPerson, quality: parsedQuality, reviewNotes: notes }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error || "Couldn't save the photo review.");
      }
      await onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't save the photo review.");
    } finally {
      setSaving(false);
    }
  };

  return <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045]">
    <div className="relative aspect-[4/3] bg-black/30">
      {broken ? <div className="grid h-full place-items-center text-center text-xs text-white/40"><div><ImageOff className="mx-auto mb-2" />Couldn't Load Image</div></div>
        : <img src={photo.url} alt={englishText(`${photo.restaurantName}  review image`)} loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover" />}
      <div className="absolute left-3 top-3"><ReviewBadge status={photo.reviewStatus} /></div>
      {photo.hasPerson && <div className="absolute right-3 top-3 rounded-full bg-black/70 p-1.5 text-[#FFE1A2]" title="Contains People"><UserRound size={14} /></div>}
    </div>
    <div className="space-y-3 p-3">
      <div className="flex gap-2">
        <select value={kind} onChange={event => setKind(event.target.value as PhotoKind)} aria-label="Photo Type" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#1D1D1D] px-2 py-2 text-xs text-white">
          {(Object.keys(KIND_LABELS) as PhotoKind[]).map(value => <option key={value} value={value}>{englishText(KIND_LABELS[value])}</option>)}
        </select>
        <input value={quality} onChange={event => setQuality(event.target.value)} inputMode="decimal" placeholder="Quality 0–1" aria-label="Quality Score" className="w-24 rounded-lg border border-white/10 bg-[#1D1D1D] px-2 py-2 text-xs text-white" />
      </div>
      <label className="flex items-center gap-2 text-xs text-white/65"><input type="checkbox" checked={hasPerson} onChange={event => setHasPerson(event.target.checked)} className="accent-[#EB5053]" />Contains People</label>
      <textarea value={notes} onChange={event => setNotes(event.target.value.slice(0, 500))} rows={2} placeholder="Review Notes" className="w-full resize-none rounded-lg border border-white/10 bg-[#1D1D1D] px-2.5 py-2 text-xs text-white placeholder:text-white/30" />
      {!!photo.dishes.length && <p className="line-clamp-2 text-[10px] text-white/45">Detected dishes:  {englishText(photo.dishes.join(', '))}</p>}
      {englishText(error && <p className="rounded-lg bg-[#52282A] px-2.5 py-2 text-[11px] text-[#FFB9BA]">{englishText(error)}</p>)}
      <div className="grid grid-cols-3 gap-1.5">
        <button disabled={saving} onClick={() => void save('approved')} className="flex items-center justify-center gap-1 rounded-lg bg-[#315B4D] px-2 py-2 text-[11px] font-bold text-[#C9F2E2] disabled:opacity-50"><Check size={13} />Approve</button>
        <button disabled={saving} onClick={() => void save('rejected')} className="flex items-center justify-center gap-1 rounded-lg bg-[#5A2D30] px-2 py-2 text-[11px] font-bold text-[#FFC5C6] disabled:opacity-50"><Ban size={13} />Exclude</button>
        <button disabled={saving} onClick={() => void save()} className="flex items-center justify-center gap-1 rounded-lg bg-white/10 px-2 py-2 text-[11px] font-bold text-white disabled:opacity-50">{saving ? <LoaderCircle size={13} className="animate-spin" /> : <Save size={13} />}Save</button>
      </div>
    </div>
  </article>;
}

export default function AdminPhotoReviewPanel() {
  const [data, setData] = useState<PhotoResponse | null>(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ReviewStatus | 'all'>('all');
  const [kind, setKind] = useState<PhotoKind | 'all'>('all');
  const [readiness, setReadiness] = useState<Readiness>('insufficient');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset), status, kind, readiness });
    if (search) params.set('q', search);
    try {
      const response = await fetch(`/api/admin/photos?${params}`);
      if (!response.ok) throw new Error("Couldn't load photo reviews.");
      setData(await response.json() as PhotoResponse);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't load photo reviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [status, kind, readiness, offset, search]);

  const groups = useMemo(() => {
    const grouped = new Map<string, { name: string; category: string; address: string; photos: PhotoAsset[] }>();
    for (const photo of data?.photos ?? []) {
      const group = grouped.get(photo.restaurantId) ?? { name: photo.restaurantName, category: photo.restaurantCategory, address: photo.restaurantAddress, photos: [] };
      group.photos.push(photo);
      grouped.set(photo.restaurantId, group);
    }
    return Array.from(grouped.entries()).sort(([leftId, left], [rightId, right]) => {
      const safeDifference = (data?.restaurantMedia[leftId]?.distinctSafePhotos ?? 0) - (data?.restaurantMedia[rightId]?.distinctSafePhotos ?? 0);
      return safeDifference || left.name.localeCompare(right.name, 'en');
    });
  }, [data]);

  const selectStatus = (value: ReviewStatus | 'all') => { setStatus(value); setOffset(0); };
  return <section id="photo-review" className="mt-7 scroll-mt-6">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div><p className="text-xs font-bold tracking-[0.14em] text-[#FF9092]">MEDIA OPERATIONS</p><h2 className="mt-1 text-xl font-bold">Restaurant Photo Review</h2><p className="mt-1 text-xs leading-5 text-white/50">Manage distinct food photos suitable for Lunchie cards, separately from source-photo availability.</p></div>
      <form onSubmit={event => { event.preventDefault(); setOffset(0); setSearch(query.trim()); }} className="flex w-full gap-2 xl:max-w-lg">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3"><Search size={15} className="text-white/40" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search restaurant names or addresses" className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-white/30" /></label>
        <button className="rounded-xl bg-[#EB5053] px-4 text-xs font-bold">Search</button>
      </form>
    </div>

    <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[
        ["Ready to Recommend", data?.readinessSummary.eligibleRestaurants ?? 0, "At least 2 distinct eligible photos"],
        ["Needs More Photos", data?.readinessSummary.insufficientRestaurants ?? 0, "Below Recommendation Requirements"],
        ["No Eligible Food Photos", data?.readinessSummary.noSafePhotos ?? 0, "Original photos may still exist"],
        ["Only 1 Eligible Photo", data?.readinessSummary.oneSafePhoto ?? 0, "Needs another distinct food photo"],
      ].map(([label, count, detail]) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4"><p className="text-xs text-white/55">{englishText(label)}</p><p className="mt-1 text-2xl font-bold tabular-nums">{englishText(count)} restaurants</p><p className="mt-1 text-[10px] text-white/40">{englishText(detail)}</p></div>)}
    </div>

    <div className="mt-3 flex flex-wrap gap-2" aria-label="Recommendation Readiness">
      {([['insufficient', "Needs More Photos"], ['eligible', "Ready to Recommend"], ['all', "All Restaurants"]] as const).map(([value, label]) => <button key={value} onClick={() => { setReadiness(value); setOffset(0); }} className={`rounded-full px-3 py-2 text-xs font-bold ${readiness === value ? 'bg-[#EB5053] text-white' : 'bg-white/[0.07] text-white/55'}`}>{englishText(label)}</button>)}
    </div>

    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
      {(['all', 'pending', 'approved', 'rejected'] as const).map(value => {
        const photos = data?.summary[value]?.photos ?? 0;
        const restaurants = data?.summary[value]?.restaurants ?? 0;
        return <button key={value} onClick={() => selectStatus(value)} className={`rounded-2xl border p-4 text-left transition ${status === value ? 'border-[#FF7679]/60 bg-[#52282A]/60' : 'border-white/10 bg-white/[0.05] hover:bg-white/[0.08]'}`}><p className="text-xs text-white/55">{englishText(value === 'all' ? "All Photos" : REVIEW_LABELS[value])}</p><p className="mt-1 text-2xl font-bold tabular-nums">{photos} photos</p><p className="mt-1 text-[10px] text-white/40">{restaurants} restaurants</p></button>;
      })}
    </div>

    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#272727] p-3">
      <div className="flex items-center gap-2"><select value={kind} onChange={event => { setKind(event.target.value as PhotoKind | 'all'); setOffset(0); }} className="rounded-lg border border-white/10 bg-[#1D1D1D] px-3 py-2 text-xs text-white"><option value="all">All Photo Types</option>{(Object.keys(KIND_LABELS) as PhotoKind[]).map(value => <option key={value} value={value}>{englishText(KIND_LABELS[value])}</option>)}</select><span className="text-xs text-white/45">Search results:  {data?.pagination.total ?? 0} photos</span></div>
      <div className="flex items-center gap-2"><button disabled={!offset || loading} onClick={() => setOffset(value => Math.max(0, value - PAGE_SIZE))} aria-label="Previous Photo Page" className="rounded-lg bg-white/10 p-2 disabled:opacity-30"><ChevronLeft size={16} /></button><span className="min-w-20 text-center text-xs text-white/55">{englishText(data?.pagination.total ? `${Math.floor(offset / PAGE_SIZE) + 1} / ${Math.ceil(data.pagination.total / PAGE_SIZE)}` : '0 / 0')}</span><button disabled={!data?.pagination.hasMore || loading} onClick={() => setOffset(value => value + PAGE_SIZE)} aria-label="Next Photo Page" className="rounded-lg bg-white/10 p-2 disabled:opacity-30"><ChevronRight size={16} /></button></div>
    </div>

    {error ? <div className="mt-4 rounded-2xl bg-[#52282A] p-5 text-sm text-[#FFB9BA]">{englishText(error)}</div>
      : loading && !data ? <div className="grid h-64 place-items-center text-sm text-white/50"><LoaderCircle className="mr-2 inline animate-spin" />Loading photos…</div>
        : groups.length ? <div className={`mt-4 space-y-5 ${loading ? 'opacity-60' : ''}`}>{groups.map(([restaurantId, group]) => {
          const media = data?.restaurantMedia[restaurantId] ?? { totalPhotos: group.photos.length, distinctSafePhotos: 0, eligible: false };
          return <section key={restaurantId} className="rounded-2xl border border-white/10 bg-[#222] p-4"><div className="mb-3 flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{englishText(group.name)}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${media.eligible ? 'bg-[#25423A] text-[#B8E5D5]' : 'bg-[#52282A] text-[#FFB9BA]'}`}>{englishText(media.eligible ? "Ready to Recommend" : "More Eligible Photos Needed")}</span></div><p className="mt-1 text-[11px] text-white/45">{englishText(group.category)}{englishText(group.address ? ` · ${group.address}` : '')}</p></div><div className="flex flex-wrap justify-end gap-2 text-xs"><span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-white/55">Original {media.totalPhotos} photos</span><span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-white/55">Distinct eligible photos:  {media.distinctSafePhotos} photos · minimum  {data?.readinessSummary.minimumDistinctPhotos ?? 2} photos</span><span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-white/55">Current page:  {group.photos.length} photos</span></div></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{group.photos.map(photo => <PhotoEditor key={photo.id} photo={photo} onSaved={load} />)}</div></section>;
        })}</div>
          : <div className="mt-4 grid h-64 place-items-center rounded-2xl border border-dashed border-white/15 text-sm text-white/45">No restaurant photos match these filters.</div>}
  </section>;
}
