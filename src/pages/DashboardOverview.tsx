import { useMemo, useCallback, useState } from 'react';
import { format, isToday, parseISO, isBefore, isAfter, startOfDay } from 'date-fns';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { DashboardSkeleton, DashboardError } from '@/components/DashboardStates';
import { DashboardGrid } from '@/components/DashboardGrid';
import { HeroBanner } from '@/components/HeroBanner';
import { WorkList } from '@/components/WorkList';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { tx, appLabel } from '@/i18n';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { formatDate, lookupKey } from '@/lib/formatters';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS, lookupOption } from '@/types/app';
import { dateFnsLocale } from '@/i18n';
import {
  ResourceTimeline,
  ResourceTimelineSkeleton,
  ResourceTimelineError,
  type ResourceEvent,
  type ResourceGroup,
} from '@/components/widgets/ResourceTimeline';
import { IconPaw, IconCalendarPlus, IconBell, IconCheck, IconX, IconDog } from '@tabler/icons-react';

// Plätze 1–12 — static lookup resource groups
const PLAETZE_OPTIONS = LOOKUP_OPTIONS['aufenthalte']?.['platznummer'] ?? [];

export default function DashboardOverview() {
  const data = useDashboardData();
  const { aufenthalte, setAufenthalte, buchungsanfragen, setBuchungsanfragen, loading, error, fetchAll } = data;
  const clock = useClock();

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'buchungsanfragen') {
        const req = buchungsanfragen.find(r => r.record_id === top.record.record_id);
        if (req && req.fields.status?.key === 'neu') {
          return {
            label: tx('Bestätigen'),
            onClick: () => confirmAnfrage(req),
          };
        }
      }
      if (top.type === 'aufenthalte') {
        const auf = aufenthalte.find(r => r.record_id === top.record.record_id);
        if (auf && auf.fields.status?.key === 'geplant') {
          return {
            label: tx('Einchecken'),
            onClick: () => checkIn(auf),
          };
        }
        if (auf && auf.fields.status?.key === 'anwesend') {
          return {
            label: tx('Auschecken'),
            onClick: () => checkOut(auf),
          };
        }
      }
      return undefined;
    },
  });

  const enrichedAufenthalte = crud.enriched.aufenthalte;

  // ─── All hooks ABOVE early returns ───

  // Today's key
  const todayKey = useMemo(() => format(clock, 'yyyy-MM-dd'), [clock]);

  // Active stays (not storniert, not abgereist)
  const activeAufenthalte = useMemo(
    () => aufenthalte.filter(a => {
      const s = a.fields.status?.key;
      return s !== 'storniert' && s !== 'abgereist';
    }),
    [aufenthalte],
  );

  // Count occupied spots today (anwesend or arriving today and geplant)
  const belegtHeute = useMemo(() => {
    return aufenthalte.filter(a => {
      const s = a.fields.status?.key;
      if (s === 'storniert' || s === 'abgereist') return false;
      if (s === 'anwesend') return true;
      if (s === 'geplant' && a.fields.anreise === todayKey) return true;
      return false;
    }).length;
  }, [aufenthalte, todayKey]);

  const freiHeute = 12 - belegtHeute;

  // Arrivals today
  const anreisenHeute = useMemo(
    () => enrichedAufenthalte.filter(a => a.fields.anreise === todayKey && a.fields.status?.key !== 'storniert'),
    [enrichedAufenthalte, todayKey],
  );

  // Departures today (anwesend + abreise = today)
  const abreisenHeute = useMemo(
    () => enrichedAufenthalte.filter(a => a.fields.abreise === todayKey && a.fields.status?.key === 'anwesend'),
    [enrichedAufenthalte, todayKey],
  );

  // New / pending Buchungsanfragen
  const neuAnfragen = useMemo(
    () => buchungsanfragen.filter(r => r.fields.status?.key === 'neu'),
    [buchungsanfragen],
  );

  // ResourceTimeline groups (12 spots)
  const groups = useMemo<ResourceGroup[]>(
    () => PLAETZE_OPTIONS.map(opt => ({ key: opt.key, label: opt.label })),
    [],
  );

  // Events: active aufenthalte mapped to timeline bars
  const events = useMemo<ResourceEvent[]>(
    () =>
      enrichedAufenthalte
        .filter(a => a.fields.anreise && a.fields.platznummer)
        .map(a => {
          const statusKey = a.fields.status?.key ?? 'geplant';
          const tone =
            statusKey === 'anwesend' ? 'success' :
            statusKey === 'storniert' ? 'default' :
            statusKey === 'abgereist' ? 'default' :
            'primary';
          const platz = lookupKey(a.fields.platznummer) ?? '';
          return {
            id: `aufenthalt:${a.record_id}`,
            start: a.fields.anreise!,
            end: a.fields.abreise,
            allDay: true,
            title: a.hundName || a.besitzerName || tx('Unbekannt'),
            subtitle: a.besitzerName,
            tone,
            group: platz,
          };
        }),
    [enrichedAufenthalte],
  );

  // Shared advance helpers
  const checkIn = useCallback(async (auf: typeof aufenthalte[0]) => {
    const prev = aufenthalte;
    setAufenthalte(aufenthalte.map(a =>
      a.record_id === auf.record_id
        ? { ...a, fields: { ...a.fields, status: lookupOption('aufenthalte', 'status', 'anwesend') } }
        : a,
    ));
    try {
      await LivingAppsService.updateAufenthalteEntry(auf.record_id, { status: 'anwesend' });
      undoToast(tx`${auf.fields.hund ?? tx('Hund')} — eingecheckt`, async () => {
        setAufenthalte(prev);
        await LivingAppsService.updateAufenthalteEntry(auf.record_id, { status: 'geplant' });
      });
    } catch {
      await fetchAll();
    }
  }, [aufenthalte, setAufenthalte, fetchAll]);

  const checkOut = useCallback(async (auf: typeof aufenthalte[0]) => {
    const prev = aufenthalte;
    setAufenthalte(aufenthalte.map(a =>
      a.record_id === auf.record_id
        ? { ...a, fields: { ...a.fields, status: lookupOption('aufenthalte', 'status', 'abgereist') } }
        : a,
    ));
    try {
      await LivingAppsService.updateAufenthalteEntry(auf.record_id, { status: 'abgereist' });
      undoToast(tx`${auf.fields.hund ?? tx('Hund')} — ausgecheckt`, async () => {
        setAufenthalte(prev);
        await LivingAppsService.updateAufenthalteEntry(auf.record_id, { status: 'anwesend' });
      });
    } catch {
      await fetchAll();
    }
  }, [aufenthalte, setAufenthalte, fetchAll]);

  const confirmAnfrage = useCallback(async (req: typeof buchungsanfragen[0]) => {
    const prev = buchungsanfragen;
    setBuchungsanfragen(buchungsanfragen.map(r =>
      r.record_id === req.record_id
        ? { ...r, fields: { ...r.fields, status: lookupOption('buchungsanfragen', 'status', 'bestaetigt') } }
        : r,
    ));
    try {
      await LivingAppsService.updateBuchungsanfragenEntry(req.record_id, { status: 'bestaetigt' });
      const name = `${req.fields.anfrage_vorname ?? ''} ${req.fields.anfrage_nachname ?? ''}`.trim();
      undoToast(tx`${name} — Anfrage bestätigt`, async () => {
        setBuchungsanfragen(prev);
        await LivingAppsService.updateBuchungsanfragenEntry(req.record_id, { status: 'neu' });
      });
    } catch {
      await fetchAll();
    }
  }, [buchungsanfragen, setBuchungsanfragen, fetchAll]);

  const rejectAnfrage = useCallback(async (req: typeof buchungsanfragen[0]) => {
    const prev = buchungsanfragen;
    setBuchungsanfragen(buchungsanfragen.map(r =>
      r.record_id === req.record_id
        ? { ...r, fields: { ...r.fields, status: lookupOption('buchungsanfragen', 'status', 'abgelehnt') } }
        : r,
    ));
    try {
      await LivingAppsService.updateBuchungsanfragenEntry(req.record_id, { status: 'abgelehnt' });
      const name = `${req.fields.anfrage_vorname ?? ''} ${req.fields.anfrage_nachname ?? ''}`.trim();
      undoToast(tx`${name} — Anfrage abgelehnt`, async () => {
        setBuchungsanfragen(prev);
        await LivingAppsService.updateBuchungsanfragenEntry(req.record_id, { status: 'neu' });
      });
    } catch {
      await fetchAll();
    }
  }, [buchungsanfragen, setBuchungsanfragen, fetchAll]);

  // Drag handler: move a booking to a new spot or date
  const handleEventDrop = useCallback(async (
    id: string,
    newStart: string,
    newEnd?: string,
    newGroup?: string,
  ) => {
    const rid = id.split(':')[1] ?? '';
    if (!rid) return;

    // Double-booking check
    if (newGroup) {
      const conflict = aufenthalte.find(a => {
        if (a.record_id === rid) return false;
        if (lookupKey(a.fields.platznummer) !== newGroup) return false;
        if (a.fields.status?.key === 'storniert' || a.fields.status?.key === 'abgereist') return false;
        const aStart = a.fields.anreise ?? '';
        const aEnd = a.fields.abreise ?? aStart;
        const dragEnd = newEnd ?? newStart;
        return !(dragEnd < aStart || newStart > aEnd);
      });
      if (conflict) return tx('Dieser Platz ist in diesem Zeitraum bereits belegt');
    }

    const prev = aufenthalte;
    const platzPatch = newGroup ? { platznummer: lookupOption('aufenthalte', 'platznummer', newGroup) } : {};
    setAufenthalte(aufenthalte.map(a =>
      a.record_id === rid
        ? { ...a, fields: { ...a.fields, anreise: newStart, ...(newEnd ? { abreise: newEnd } : {}), ...platzPatch } }
        : a,
    ));
    try {
      await LivingAppsService.updateAufenthalteEntry(rid, {
        anreise: newStart,
        ...(newEnd ? { abreise: newEnd } : {}),
        ...(newGroup ? { platznummer: newGroup } : {}),
      });
      undoToast(tx('Aufenthalt verschoben'), async () => {
        setAufenthalte(prev);
        const original = prev.find(a => a.record_id === rid);
        if (!original) return;
        await LivingAppsService.updateAufenthalteEntry(rid, {
          anreise: original.fields.anreise,
          abreise: original.fields.abreise,
          platznummer: lookupKey(original.fields.platznummer),
        });
      });
    } catch {
      await fetchAll();
    }
  }, [aufenthalte, setAufenthalte, fetchAll]);

  const handleEventResize = useCallback(async (id: string, newStart: string, newEnd: string) => {
    const rid = id.split(':')[1] ?? '';
    if (!rid) return;
    const prev = aufenthalte;
    setAufenthalte(aufenthalte.map(a =>
      a.record_id === rid
        ? { ...a, fields: { ...a.fields, anreise: newStart, abreise: newEnd } }
        : a,
    ));
    try {
      await LivingAppsService.updateAufenthalteEntry(rid, { anreise: newStart, abreise: newEnd });
      undoToast(tx('Aufenthalt angepasst'), async () => {
        setAufenthalte(prev);
        const original = prev.find(a => a.record_id === rid);
        if (!original) return;
        await LivingAppsService.updateAufenthalteEntry(rid, {
          anreise: original.fields.anreise,
          abreise: original.fields.abreise,
        });
      });
    } catch {
      await fetchAll();
    }
  }, [aufenthalte, setAufenthalte, fetchAll]);

  // Context greeting
  const contextLine = useMemo(() => {
    const parts: string[] = [];
    if (anreisenHeute.length > 0) {
      const names = namen(anreisenHeute.map(a => a.hundName || a.besitzerName));
      parts.push(tx`${names} reist heute an`);
    }
    if (abreisenHeute.length > 0) {
      const names = namen(abreisenHeute.map(a => a.hundName || a.besitzerName));
      parts.push(tx`${names} reist heute ab`);
    }
    if (parts.length === 0 && belegtHeute === 0) {
      return tx('Heute sind keine Hunde da — genieß die Ruhe!');
    }
    if (parts.length === 0) {
      return tx`${belegtHeute} von 12 Plätzen belegt — ein ruhiger Tag.`;
    }
    return parts.join(' · ');
  }, [anreisenHeute, abreisenHeute, belegtHeute]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  // Hero: neue Anfragen brauchen Aufmerksamkeit
  const firstAnfrage = neuAnfragen[0];
  const heroContent = firstAnfrage ? (
    <HeroBanner
      icon={<IconBell size={18} />}
      action={{
        label: tx('Bestätigen'),
        onClick: () => confirmAnfrage(firstAnfrage),
      }}
    >
      {neuAnfragen.length === 1 ? (
        <>
          <b>{firstAnfrage.fields.anfrage_vorname} {firstAnfrage.fields.anfrage_nachname}</b>{' '}
          {tx('hat eine Buchungsanfrage gestellt')} —{' '}
          {firstAnfrage.fields.hund_name} ({formatDate(firstAnfrage.fields.wunsch_anreise)} – {formatDate(firstAnfrage.fields.wunsch_abreise)})
        </>
      ) : (
        <>
          <b>{neuAnfragen.length}</b> {tx('neue Buchungsanfragen warten auf Bestätigung')}
        </>
      )}
    </HeroBanner>
  ) : undefined;

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{gruss(clock)}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{contextLine}</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          onClick={() => crud.aufenthalte.openCreate({ status: 'geplant' })}
        >
          <IconCalendarPlus size={16} className="shrink-0" />
          {tx('Neue Buchung')}
        </button>
      </div>

      <DashboardGrid
        variant="wide"
        hero={heroContent}
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Belegt heute')}
              value={`${belegtHeute} / 12`}
              icon={<IconDog size={16} />}
              tone={belegtHeute >= 10 ? 'warning' : belegtHeute > 0 ? 'primary' : 'default'}
            />
            <StatStripItem
              title={tx('Freie Plätze')}
              value={freiHeute}
              icon={<IconPaw size={16} />}
              tone={freiHeute === 0 ? 'destructive' : freiHeute <= 3 ? 'warning' : 'success'}
            />
            <StatStripItem
              title={tx('Anreisen heute')}
              value={anreisenHeute.length}
              icon={<IconCalendarPlus size={16} />}
              tone={anreisenHeute.length > 0 ? 'primary' : 'default'}
            />
            <StatStripItem
              title={tx('Abreisen heute')}
              value={abreisenHeute.length}
              icon={<IconCheck size={16} />}
              tone={abreisenHeute.length > 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title={tx('Neue Anfragen')}
              value={neuAnfragen.length}
              icon={<IconBell size={16} />}
              tone={neuAnfragen.length > 0 ? 'destructive' : 'default'}
            />
          </StatStrip>
        }
        primary={
          aufenthalte.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border bg-card py-20 text-center">
              <IconPaw size={48} className="text-muted-foreground" stroke={1.5} />
              <div>
                <p className="font-semibold text-foreground">{tx('Noch keine Aufenthalte')}</p>
                <p className="mt-1 text-sm text-muted-foreground">{tx('Lege die erste Buchung an und sieh den Belegungsplan.')}</p>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
                onClick={() => crud.aufenthalte.openCreate({ status: 'geplant' })}
              >
                <IconCalendarPlus size={16} className="shrink-0" />
                {tx('Erste Buchung anlegen')}
              </button>
            </div>
          ) : (
            <ResourceTimeline
              events={events}
              groups={groups}
              axis="day"
              defaultRange="week"
              defaultDate={clock}
              locale={dateFnsLocale()}
              onEventClick={ev => {
                const rid = ev.id.split(':')[1] ?? '';
                const rec = aufenthalte.find(a => a.record_id === rid);
                if (rec) crud.aufenthalte.openDetail(rec);
              }}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              onRangeCreate={(start, end, group) => {
                crud.aufenthalte.openCreate({
                  anreise: format(start, 'yyyy-MM-dd'),
                  abreise: format(end, 'yyyy-MM-dd'),
                  status: 'geplant',
                  ...(group ? { platznummer: group } : {}),
                });
              }}
              onEmptyClick={(date, group) => {
                crud.aufenthalte.openCreate({
                  anreise: format(date, 'yyyy-MM-dd'),
                  status: 'geplant',
                  ...(group ? { platznummer: group } : {}),
                });
              }}
            />
          )
        }
        aside={
          <>
            <WorkList
              title={tx('Anreisen & Abreisen heute')}
              items={[
                ...anreisenHeute.map(a => ({
                  id: `an:${a.record_id}`,
                  title: a.hundName || tx('Unbekannter Hund'),
                  secondLine: (
                    <>
                      <span className="font-medium text-emerald-600">{tx('Anreise')}</span>
                      <span className="text-muted-foreground"> · {a.besitzerName}</span>
                    </>
                  ),
                  action: a.fields.status?.key === 'geplant'
                    ? { label: tx('Einchecken'), onClick: () => checkIn(a) }
                    : undefined,
                })),
                ...abreisenHeute.map(a => ({
                  id: `ab:${a.record_id}`,
                  title: a.hundName || tx('Unbekannter Hund'),
                  secondLine: (
                    <>
                      <span className="font-medium text-amber-600">{tx('Abreise')}</span>
                      <span className="text-muted-foreground"> · {a.besitzerName}</span>
                    </>
                  ),
                  action: a.fields.status?.key === 'anwesend'
                    ? { label: tx('Auschecken'), onClick: () => checkOut(a) }
                    : undefined,
                })),
              ]}
              onItemClick={id => {
                const rid = id.replace(/^(an|ab):/, '');
                const rec = aufenthalte.find(a => a.record_id === rid);
                if (rec) crud.aufenthalte.openDetail(rec);
              }}
              empty={{
                text: tx('Heute keine An- oder Abreisen — geniess den ruhigen Tag!'),
                action: { label: tx('Buchung anlegen'), onClick: () => crud.aufenthalte.openCreate({ status: 'geplant' }) },
              }}
            />
            <WorkList
              title={tx('Neue Anfragen')}
              items={neuAnfragen.map(r => ({
                id: r.record_id,
                title: `${r.fields.anfrage_vorname ?? ''} ${r.fields.anfrage_nachname ?? ''}`.trim() || tx('Unbekannt'),
                secondLine: (
                  <>
                    <span className="font-medium text-amber-600">{r.fields.hund_name}</span>
                    <span className="text-muted-foreground"> · {formatDate(r.fields.wunsch_anreise)} – {formatDate(r.fields.wunsch_abreise)}</span>
                  </>
                ),
                action: { label: tx('Bestätigen'), onClick: () => confirmAnfrage(r) },
              }))}
              onItemClick={id => {
                const rec = buchungsanfragen.find(r => r.record_id === id);
                if (rec) crud.buchungsanfragen.openDetail(rec);
              }}
              empty={{
                text: tx('Keine neuen Anfragen — alles bearbeitet!'),
                action: { label: tx('Anfrage erfassen'), onClick: () => crud.buchungsanfragen.openCreate({ status: 'neu' }) },
              }}
            />
          </>
        }
      />

      {crud.surfaces}
    </div>
  );
}
