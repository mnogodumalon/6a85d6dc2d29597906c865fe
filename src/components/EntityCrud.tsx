/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'besitzer'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` carries the snake_case IDENTIFIER, NOT the camelCase key that
 *   `crud.<entity>` uses — for multi-word entities the two differ. Take each
 *   from its own column below, verbatim; a camelCase top.type narrows `top`
 *   to `never` and costs a build cycle (TS2367 "have no overlap", then
 *   TS2339 on top.record):
 *     crud.besitzer  ·  top.type === 'besitzer'
 *     crud.hunde  ·  top.type === 'hunde'
 *     crud.aufenthalte  ·  top.type === 'aufenthalte'
 *     crud.buchungsanfragen  ·  top.type === 'buchungsanfragen'
 *     crud.pfotenPortraet  ·  top.type === 'pfoten_portraet'
 *     crud.website  ·  top.type === 'website'
 *   …
 *   crud.besitzer.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.besitzer.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.besitzer.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.hunde              // memoized Enriched* arrays — reuse these,
 *                                       // never call enrich*() yourself in the page
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   besitzer: vorname, nachname, telefon, email, strasse, hausnummer, plz, ort, …  ·  ← hunde (list + contextual +) · ← aufenthalte (list + contextual +) · ← pfoten_portraet (list + contextual +)
 *   hunde: name, rasse, geburtsdatum, geschlecht, gewicht_kg, kastriert, impfstatus, gesundheitshinweise, …  ·  → besitzer · ← aufenthalte (list + contextual +) · ← pfoten_portraet (list + contextual +)
 *   aufenthalte: hund, besitzer, anreise, abreise, platznummer, status, preis, notizen  ·  → hunde · → besitzer
 *   buchungsanfragen: anfrage_vorname, anfrage_nachname, anfrage_telefon, anfrage_email, hund_name, hund_rasse, hund_groesse, wunsch_anreise, …
 *   pfoten_portraet: besitzer, hund, titel, widmung, erlebnisse, foto, erstellungsdatum  ·  → besitzer · → hunde
 *   website: unternehmensname, slogan, beschreibung, anzahl_plaetze, logo, leistungen, usps, oeffnungszeiten, …
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Besitzer, Hunde, Aufenthalte, Buchungsanfragen, PfotenPortraet, Website } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { enrichHunde, enrichAufenthalte, enrichPfotenPortraet } from '@/lib/enrich';
import type { EnrichedHunde, EnrichedAufenthalte, EnrichedPfotenPortraet } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { BesitzerDialog, type BesitzerDialogDefaults } from '@/components/dialogs/BesitzerDialog';
import { BesitzerDetails } from '@/components/details/BesitzerDetails';
import { HundeDialog, type HundeDialogDefaults } from '@/components/dialogs/HundeDialog';
import { HundeDetails } from '@/components/details/HundeDetails';
import { AufenthalteDialog, type AufenthalteDialogDefaults } from '@/components/dialogs/AufenthalteDialog';
import { AufenthalteDetails } from '@/components/details/AufenthalteDetails';
import { BuchungsanfragenDialog, type BuchungsanfragenDialogDefaults } from '@/components/dialogs/BuchungsanfragenDialog';
import { BuchungsanfragenDetails } from '@/components/details/BuchungsanfragenDetails';
import { PfotenPortraetDialog, type PfotenPortraetDialogDefaults } from '@/components/dialogs/PfotenPortraetDialog';
import { PfotenPortraetDetails } from '@/components/details/PfotenPortraetDetails';
import { WebsiteDialog, type WebsiteDialogDefaults } from '@/components/dialogs/WebsiteDialog';
import { WebsiteDetails } from '@/components/details/WebsiteDetails';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'besitzer'; record: Besitzer }
  | { type: 'hunde'; record: EnrichedHunde }
  | { type: 'aufenthalte'; record: EnrichedAufenthalte }
  | { type: 'buchungsanfragen'; record: Buchungsanfragen }
  | { type: 'pfoten_portraet'; record: EnrichedPfotenPortraet }
  | { type: 'website'; record: Website };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  besitzer: EntityCrudApi<Besitzer, BesitzerDialogDefaults>;
  hunde: EntityCrudApi<Hunde, HundeDialogDefaults>;
  aufenthalte: EntityCrudApi<Aufenthalte, AufenthalteDialogDefaults>;
  buchungsanfragen: EntityCrudApi<Buchungsanfragen, BuchungsanfragenDialogDefaults>;
  pfotenPortraet: EntityCrudApi<PfotenPortraet, PfotenPortraetDialogDefaults>;
  website: EntityCrudApi<Website, WebsiteDialogDefaults>;
  /** Memoized Enriched* arrays — reuse these, never re-enrich in the page. */
  enriched: { hunde: EnrichedHunde[]; aufenthalte: EnrichedAufenthalte[]; pfotenPortraet: EnrichedPfotenPortraet[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  const [besitzerDialog, setBesitzerDialog] = useState<{ defaults?: BesitzerDialogDefaults; editing?: Besitzer } | null>(null);
  const [hundeDialog, setHundeDialog] = useState<{ defaults?: HundeDialogDefaults; editing?: Hunde } | null>(null);
  const [aufenthalteDialog, setAufenthalteDialog] = useState<{ defaults?: AufenthalteDialogDefaults; editing?: Aufenthalte } | null>(null);
  const [buchungsanfragenDialog, setBuchungsanfragenDialog] = useState<{ defaults?: BuchungsanfragenDialogDefaults; editing?: Buchungsanfragen } | null>(null);
  const [pfotenPortraetDialog, setPfotenPortraetDialog] = useState<{ defaults?: PfotenPortraetDialogDefaults; editing?: PfotenPortraet } | null>(null);
  const [websiteDialog, setWebsiteDialog] = useState<{ defaults?: WebsiteDialogDefaults; editing?: Website } | null>(null);
  const enrichedHunde = useMemo(() => enrichHunde(data.hunde, { besitzerMap: data.besitzerMap }), [data.hunde, data.besitzerMap]);
  const enrichedAufenthalte = useMemo(() => enrichAufenthalte(data.aufenthalte, { hundeMap: data.hundeMap, besitzerMap: data.besitzerMap }), [data.aufenthalte, data.hundeMap, data.besitzerMap]);
  const enrichedPfotenPortraet = useMemo(() => enrichPfotenPortraet(data.pfotenPortraet, { besitzerMap: data.besitzerMap, hundeMap: data.hundeMap }), [data.pfotenPortraet, data.besitzerMap, data.hundeMap]);

  function detailBesitzer(record: Besitzer, push = false) {
    const item: OverlayItem = { type: 'besitzer', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitBesitzer(fields: Besitzer['fields']) {
    const editing = besitzerDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setBesitzer(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateBesitzerEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('besitzer')} — ${t('crud_updated')}`, async () => {
        data.setBesitzer(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateBesitzerEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createBesitzerEntry(fields);
      undoToast(`${appLabel('besitzer')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailHunde(record: Hunde, push = false) {
    const rec = enrichedHunde.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'hunde', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitHunde(fields: Hunde['fields']) {
    const editing = hundeDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setHunde(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateHundeEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('hunde')} — ${t('crud_updated')}`, async () => {
        data.setHunde(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateHundeEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createHundeEntry(fields);
      undoToast(`${appLabel('hunde')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailAufenthalte(record: Aufenthalte, push = false) {
    const rec = enrichedAufenthalte.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'aufenthalte', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitAufenthalte(fields: Aufenthalte['fields']) {
    const editing = aufenthalteDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setAufenthalte(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateAufenthalteEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('aufenthalte')} — ${t('crud_updated')}`, async () => {
        data.setAufenthalte(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateAufenthalteEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createAufenthalteEntry(fields);
      undoToast(`${appLabel('aufenthalte')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailBuchungsanfragen(record: Buchungsanfragen, push = false) {
    const item: OverlayItem = { type: 'buchungsanfragen', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitBuchungsanfragen(fields: Buchungsanfragen['fields']) {
    const editing = buchungsanfragenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setBuchungsanfragen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateBuchungsanfragenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('buchungsanfragen')} — ${t('crud_updated')}`, async () => {
        data.setBuchungsanfragen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateBuchungsanfragenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createBuchungsanfragenEntry(fields);
      undoToast(`${appLabel('buchungsanfragen')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailPfotenPortraet(record: PfotenPortraet, push = false) {
    const rec = enrichedPfotenPortraet.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'pfoten_portraet', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitPfotenPortraet(fields: PfotenPortraet['fields']) {
    const editing = pfotenPortraetDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setPfotenPortraet(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updatePfotenPortraetEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('pfoten_portraet')} — ${t('crud_updated')}`, async () => {
        data.setPfotenPortraet(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updatePfotenPortraetEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createPfotenPortraetEntry(fields);
      undoToast(`${appLabel('pfoten_portraet')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailWebsite(record: Website, push = false) {
    const item: OverlayItem = { type: 'website', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitWebsite(fields: Website['fields']) {
    const editing = websiteDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setWebsite(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateWebsiteEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('website')} — ${t('crud_updated')}`, async () => {
        data.setWebsite(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateWebsiteEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createWebsiteEntry(fields);
      undoToast(`${appLabel('website')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <BesitzerDialog
        open={besitzerDialog !== null}
        onClose={() => setBesitzerDialog(null)}
        onSubmit={submitBesitzer}
        defaultValues={besitzerDialog?.defaults}
        recordId={besitzerDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Besitzer']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Besitzer']}
      />
      <HundeDialog
        open={hundeDialog !== null}
        onClose={() => setHundeDialog(null)}
        onSubmit={submitHunde}
        defaultValues={hundeDialog?.defaults}
        recordId={hundeDialog?.editing?.record_id}
        besitzerList={data.besitzer}
        enablePhotoScan={AI_PHOTO_SCAN['Hunde']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Hunde']}
      />
      <AufenthalteDialog
        open={aufenthalteDialog !== null}
        onClose={() => setAufenthalteDialog(null)}
        onSubmit={submitAufenthalte}
        defaultValues={aufenthalteDialog?.defaults}
        recordId={aufenthalteDialog?.editing?.record_id}
        hundeList={data.hunde}
        besitzerList={data.besitzer}
        enablePhotoScan={AI_PHOTO_SCAN['Aufenthalte']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Aufenthalte']}
      />
      <BuchungsanfragenDialog
        open={buchungsanfragenDialog !== null}
        onClose={() => setBuchungsanfragenDialog(null)}
        onSubmit={submitBuchungsanfragen}
        defaultValues={buchungsanfragenDialog?.defaults}
        recordId={buchungsanfragenDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Buchungsanfragen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Buchungsanfragen']}
      />
      <PfotenPortraetDialog
        open={pfotenPortraetDialog !== null}
        onClose={() => setPfotenPortraetDialog(null)}
        onSubmit={submitPfotenPortraet}
        defaultValues={pfotenPortraetDialog?.defaults}
        recordId={pfotenPortraetDialog?.editing?.record_id}
        besitzerList={data.besitzer}
        hundeList={data.hunde}
        enablePhotoScan={AI_PHOTO_SCAN['PfotenPortraet']}
        enablePhotoLocation={AI_PHOTO_LOCATION['PfotenPortraet']}
      />
      <WebsiteDialog
        open={websiteDialog !== null}
        onClose={() => setWebsiteDialog(null)}
        onSubmit={submitWebsite}
        defaultValues={websiteDialog?.defaults}
        recordId={websiteDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Website']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Website']}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'besitzer') {
            return (
              <>
                <RecordHeader title={top.record.fields.vorname ?? appLabel('besitzer')} subtitle={undefined} />
                <BesitzerDetails
                  record={top.record}
                  hundeList={data.hunde}
                  onOpenHunde={(r) => detailHunde(r, true)}
                  onAddHunde={() => setHundeDialog({ defaults: { besitzer: createRecordUrl(APP_IDS.BESITZER, top.record.record_id) } })}
                  aufenthalteList={data.aufenthalte}
                  onOpenAufenthalte={(r) => detailAufenthalte(r, true)}
                  onAddAufenthalte={() => setAufenthalteDialog({ defaults: { besitzer: createRecordUrl(APP_IDS.BESITZER, top.record.record_id) } })}
                  pfotenPortraetList={data.pfotenPortraet}
                  onOpenPfotenPortraet={(r) => detailPfotenPortraet(r, true)}
                  onAddPfotenPortraet={() => setPfotenPortraetDialog({ defaults: { besitzer: createRecordUrl(APP_IDS.BESITZER, top.record.record_id) } })}
                />
              </>
            );
          }
          if (top.type === 'hunde') {
            return (
              <>
                <RecordHeader title={top.record.fields.name ?? appLabel('hunde')} subtitle={top.record.fields.geburtsdatum ? formatDate(top.record.fields.geburtsdatum) : undefined} />
                <HundeDetails
                  record={top.record}
                  besitzerList={data.besitzer}
                  onOpenBesitzer={(r) => detailBesitzer(r, true)}
                  aufenthalteList={data.aufenthalte}
                  onOpenAufenthalte={(r) => detailAufenthalte(r, true)}
                  onAddAufenthalte={() => setAufenthalteDialog({ defaults: { hund: createRecordUrl(APP_IDS.HUNDE, top.record.record_id) } })}
                  pfotenPortraetList={data.pfotenPortraet}
                  onOpenPfotenPortraet={(r) => detailPfotenPortraet(r, true)}
                  onAddPfotenPortraet={() => setPfotenPortraetDialog({ defaults: { hund: createRecordUrl(APP_IDS.HUNDE, top.record.record_id) } })}
                />
              </>
            );
          }
          if (top.type === 'aufenthalte') {
            return (
              <>
                <RecordHeader title={appLabel('aufenthalte')} subtitle={top.record.fields.anreise ? formatDate(top.record.fields.anreise) : undefined} />
                <AufenthalteDetails
                  record={top.record}
                  hundeList={data.hunde}
                  onOpenHunde={(r) => detailHunde(r, true)}
                  besitzerList={data.besitzer}
                  onOpenBesitzer={(r) => detailBesitzer(r, true)}
                />
              </>
            );
          }
          if (top.type === 'buchungsanfragen') {
            return (
              <>
                <RecordHeader title={top.record.fields.anfrage_vorname ?? appLabel('buchungsanfragen')} subtitle={top.record.fields.wunsch_anreise ? formatDate(top.record.fields.wunsch_anreise) : undefined} />
                <BuchungsanfragenDetails
                  record={top.record}
                />
              </>
            );
          }
          if (top.type === 'pfoten_portraet') {
            return (
              <>
                <RecordHeader title={top.record.fields.titel ?? appLabel('pfoten_portraet')} subtitle={top.record.fields.erstellungsdatum ? formatDate(top.record.fields.erstellungsdatum) : undefined} />
                <PfotenPortraetDetails
                  record={top.record}
                  besitzerList={data.besitzer}
                  onOpenBesitzer={(r) => detailBesitzer(r, true)}
                  hundeList={data.hunde}
                  onOpenHunde={(r) => detailHunde(r, true)}
                />
              </>
            );
          }
          if (top.type === 'website') {
            return (
              <>
                <RecordHeader title={top.record.fields.unternehmensname ?? appLabel('website')} subtitle={undefined} />
                <WebsiteDetails
                  record={top.record}
                />
              </>
            );
          }
          return null;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'besitzer') setBesitzerDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'hunde') setHundeDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'aufenthalte') setAufenthalteDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'buchungsanfragen') setBuchungsanfragenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'pfoten_portraet') setPfotenPortraetDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'website') setWebsiteDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    besitzer: {
      openCreate: (defaults?: BesitzerDialogDefaults) => setBesitzerDialog({ defaults }),
      openEdit: (record: Besitzer) => setBesitzerDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Besitzer) => detailBesitzer(record, false),
    },
    hunde: {
      openCreate: (defaults?: HundeDialogDefaults) => setHundeDialog({ defaults }),
      openEdit: (record: Hunde) => setHundeDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Hunde) => detailHunde(record, false),
    },
    aufenthalte: {
      openCreate: (defaults?: AufenthalteDialogDefaults) => setAufenthalteDialog({ defaults }),
      openEdit: (record: Aufenthalte) => setAufenthalteDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Aufenthalte) => detailAufenthalte(record, false),
    },
    buchungsanfragen: {
      openCreate: (defaults?: BuchungsanfragenDialogDefaults) => setBuchungsanfragenDialog({ defaults }),
      openEdit: (record: Buchungsanfragen) => setBuchungsanfragenDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Buchungsanfragen) => detailBuchungsanfragen(record, false),
    },
    pfotenPortraet: {
      openCreate: (defaults?: PfotenPortraetDialogDefaults) => setPfotenPortraetDialog({ defaults }),
      openEdit: (record: PfotenPortraet) => setPfotenPortraetDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: PfotenPortraet) => detailPfotenPortraet(record, false),
    },
    website: {
      openCreate: (defaults?: WebsiteDialogDefaults) => setWebsiteDialog({ defaults }),
      openEdit: (record: Website) => setWebsiteDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Website) => detailWebsite(record, false),
    },
    enriched: { hunde: enrichedHunde, aufenthalte: enrichedAufenthalte, pfotenPortraet: enrichedPfotenPortraet },
  };
}
