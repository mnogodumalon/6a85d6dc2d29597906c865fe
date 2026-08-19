import { useEffect, useRef, useState } from 'react';
import { PublicShell } from '@/components/PublicShell';
import {
  loadPublicPagesConfig,
  listPublicRecords,
  PageUnavailableError,
  type PublicPagesConfig,
  type PublicPageConfig,
} from '@/lib/publicClient';
import { tx } from '@/i18n';
import {
  IconPaw,
  IconPhone,
  IconMail,
  IconMapPin,
  IconStar,
  IconCheck,
  IconClock,
  IconBuildingStore,
  IconArrowRight,
} from '@tabler/icons-react';

interface WebsiteData {
  unternehmensname: string | null;
  slogan: string | null;
  beschreibung: string | null;
  anzahl_plaetze: number | null;
  leistungen: string | null;
  usps: string | null;
  oeffnungszeiten: string | null;
  kontakt_telefon: string | null;
  kontakt_email: string | null;
  website_url: string | null;
  kontakt_strasse: string | null;
  kontakt_hausnummer: string | null;
  kontakt_plz: string | null;
  kontakt_ort: string | null;
}

function parseLines(text: string | null): string[] {
  if (!text) return [];
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
}

export default function Hundepension() {
  const [cfg, setCfg] = useState<PublicPagesConfig | null>(null);
  const [page, setPage] = useState<PublicPageConfig | null>(null);
  const [website, setWebsite] = useState<WebsiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const kontaktRef = useRef<HTMLElement>(null);
  const leistungenRef = useRef<HTMLElement>(null);

  useEffect(() => {
    loadPublicPagesConfig('hundepension')
      .then(async c => {
        setCfg(c);
        const p = c?.pages['hundepension'] ?? null;
        setPage(p);
        if (!c || !p) {
          setUnavailable(true);
          setLoading(false);
          return;
        }
        const ep = p.endpoints?.find(e => e.op === 'list');
        if (!ep) {
          setUnavailable(true);
          setLoading(false);
          return;
        }
        const rows = await listPublicRecords(c, p, { appId: ep.app_id, limit: 1 });
        const first = Object.values(rows)[0] ?? null;
        if (first) {
          const f = first.fields;
          setWebsite({
            unternehmensname: (f.unternehmensname as string) ?? null,
            slogan: (f.slogan as string) ?? null,
            beschreibung: (f.beschreibung as string) ?? null,
            anzahl_plaetze: (f.anzahl_plaetze as number) ?? null,
            leistungen: (f.leistungen as string) ?? null,
            usps: (f.usps as string) ?? null,
            oeffnungszeiten: (f.oeffnungszeiten as string) ?? null,
            kontakt_telefon: (f.kontakt_telefon as string) ?? null,
            kontakt_email: (f.kontakt_email as string) ?? null,
            website_url: (f.website_url as string) ?? null,
            kontakt_strasse: (f.kontakt_strasse as string) ?? null,
            kontakt_hausnummer: (f.kontakt_hausnummer as string) ?? null,
            kontakt_plz: (f.kontakt_plz as string) ?? null,
            kontakt_ort: (f.kontakt_ort as string) ?? null,
          });
        }
        setLoading(false);
      })
      .catch(err => {
        if (err instanceof PageUnavailableError) setUnavailable(true);
        setLoading(false);
      });
  }, []);

  if (loading || unavailable || !cfg || !page) {
    return <PublicShell loading={loading} unavailable={!loading && unavailable} />;
  }

  const name = website?.unternehmensname ?? tx('Hundepension');
  const leistungenLines = parseLines(website?.leistungen ?? null);
  const uspLines = parseLines(website?.usps ?? null);
  const oeffnungsLines = parseLines(website?.oeffnungszeiten ?? null);

  const hasAdresse =
    website?.kontakt_strasse ||
    website?.kontakt_ort;

  return (
    <PublicShell fullBleed>
      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-br from-amber-700 via-amber-600 to-orange-500 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none select-none flex items-center justify-center">
          <IconPaw size={480} stroke={0.5} />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6 backdrop-blur-sm">
            <IconPaw size={16} className="shrink-0" />
            <span>{tx('Herzlich Willkommen')}</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-4 drop-shadow">
            {name}
          </h1>
          {website?.slogan && (
            <p className="text-xl sm:text-2xl font-light mb-8 opacity-90 max-w-2xl mx-auto">
              {website.slogan}
            </p>
          )}
          {website?.beschreibung && (
            <p className="text-base sm:text-lg opacity-80 max-w-2xl mx-auto mb-10 leading-relaxed">
              {website.beschreibung}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/#/public/buchungsanfrage"
              className="inline-flex items-center gap-2 bg-white text-amber-700 font-semibold px-6 py-3 rounded-full shadow-lg hover:bg-amber-50 transition-colors"
            >
              {tx('Jetzt Buchungsanfrage stellen')}
              <IconArrowRight size={18} className="shrink-0" />
            </a>
            <button
              type="button"
              onClick={() => leistungenRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 border border-white/60 text-white font-semibold px-6 py-3 rounded-full hover:bg-white/10 transition-colors"
            >
              {tx('Leistungen entdecken')}
            </button>
          </div>
        </div>
      </section>

      {/* ── Platzzahl-Info ── */}
      {website?.anzahl_plaetze != null && (
        <section className="bg-amber-50 border-y border-amber-100">
          <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
            <div className="flex items-center gap-3">
              <span className="text-5xl font-extrabold text-amber-600">{website.anzahl_plaetze}</span>
              <div className="text-left">
                <div className="text-lg font-semibold text-amber-800">{tx('Plätze')}</div>
                <div className="text-sm text-amber-700 opacity-75">{tx('für Ihren Liebling')}</div>
              </div>
            </div>
            <div className="hidden sm:block w-px h-12 bg-amber-200 mx-4" />
            <p className="text-amber-800 max-w-xs text-sm leading-relaxed">
              {tx('Jeder Gast bekommt bei uns die Aufmerksamkeit, die er verdient.')}
            </p>
          </div>
        </section>
      )}

      {/* ── Leistungen ── */}
      {leistungenLines.length > 0 && (
        <section ref={leistungenRef as React.RefObject<HTMLElement>} className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {tx('Unsere Leistungen')}
              </h2>
              <p className="text-gray-500">{tx('Was wir für euren Vierbeiner anbieten')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {leistungenLines.map((l, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 bg-amber-50 rounded-xl p-4 border border-amber-100"
                >
                  <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                    <IconCheck size={14} className="text-white" stroke={2.5} />
                  </div>
                  <span className="text-gray-800 text-sm leading-snug">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── USPs ── */}
      {uspLines.length > 0 && (
        <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {tx('Warum uns wählen?')}
              </h2>
              <p className="text-gray-500">{tx('Das macht uns besonders')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {uspLines.map((u, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
                    <IconStar size={20} className="text-white" />
                  </div>
                  <p className="text-gray-800 text-sm leading-relaxed pt-1.5">{u}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Öffnungszeiten + Kontakt ── */}
      <section
        ref={kontaktRef as React.RefObject<HTMLElement>}
        className="py-16 bg-white"
      >
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {tx('Kontakt & Öffnungszeiten')}
            </h2>
            <p className="text-gray-500">{tx('Wir freuen uns auf euch!')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Öffnungszeiten */}
            {oeffnungsLines.length > 0 && (
              <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
                <div className="flex items-center gap-2 mb-4">
                  <IconClock size={20} className="text-amber-600 shrink-0" />
                  <h3 className="font-semibold text-gray-900">{tx('Öffnungszeiten')}</h3>
                </div>
                <ul className="space-y-2">
                  {oeffnungsLines.map((o, i) => (
                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5 shrink-0">—</span>
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Kontaktdaten */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <IconBuildingStore size={20} className="text-amber-600 shrink-0" />
                <h3 className="font-semibold text-gray-900">{tx('Kontakt')}</h3>
              </div>

              {website?.kontakt_telefon && (
                <a
                  href={`tel:${website.kontakt_telefon}`}
                  className="flex items-center gap-3 text-sm text-gray-700 hover:text-amber-600 transition-colors"
                >
                  <IconPhone size={16} className="text-amber-500 shrink-0" />
                  <span>{website.kontakt_telefon}</span>
                </a>
              )}
              {website?.kontakt_email && (
                <a
                  href={`mailto:${website.kontakt_email}`}
                  className="flex items-center gap-3 text-sm text-gray-700 hover:text-amber-600 transition-colors break-all"
                >
                  <IconMail size={16} className="text-amber-500 shrink-0" />
                  <span>{website.kontakt_email}</span>
                </a>
              )}
              {hasAdresse && (
                <div className="flex items-start gap-3 text-sm text-gray-700">
                  <IconMapPin size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <address className="not-italic">
                    {website?.kontakt_strasse && website?.kontakt_hausnummer
                      ? `${website.kontakt_strasse} ${website.kontakt_hausnummer}`
                      : website?.kontakt_strasse}
                    {(website?.kontakt_strasse || website?.kontakt_hausnummer) &&
                      (website?.kontakt_plz || website?.kontakt_ort) && (
                        <br />
                      )}
                    {[website?.kontakt_plz, website?.kontakt_ort]
                      .filter(Boolean)
                      .join(' ')}
                  </address>
                </div>
              )}
              {website?.website_url && (
                <a
                  href={website.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm text-amber-600 hover:underline break-all"
                >
                  <IconBuildingStore size={16} className="shrink-0" />
                  <span>{website.website_url}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Footer ── */}
      <section className="bg-gradient-to-br from-amber-600 to-orange-500 text-white py-16">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <IconPaw size={48} className="mx-auto mb-4 opacity-60" stroke={1.5} />
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            {tx('Bereit für den nächsten Urlaub?')}
          </h2>
          <p className="text-white/80 mb-8 max-w-md mx-auto">
            {tx('Stell jetzt eine Buchungsanfrage und sicher deinem Hund seinen Platz.')}
          </p>
          <a
            href="/#/public/buchungsanfrage"
            className="inline-flex items-center gap-2 bg-white text-amber-700 font-semibold px-8 py-3 rounded-full shadow-lg hover:bg-amber-50 transition-colors"
          >
            {tx('Buchungsanfrage stellen')}
            <IconArrowRight size={18} className="shrink-0" />
          </a>
        </div>
      </section>
    </PublicShell>
  );
}
