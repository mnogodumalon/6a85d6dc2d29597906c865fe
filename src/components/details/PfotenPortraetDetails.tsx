import type { PfotenPortraet, Besitzer, Hunde } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';

export interface PfotenPortraetDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: PfotenPortraet;
  /** N:1-Ziel „Besitzer": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  besitzerList: Besitzer[];
  /** Klick auf die Besitzer-Relation → overlay.push auf dessen Detail. */
  onOpenBesitzer?: (record: Besitzer) => void;
  /** N:1-Ziel „Hunde": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  hundeList: Hunde[];
  /** Klick auf die Hunde-Relation → overlay.push auf dessen Detail. */
  onOpenHunde?: (record: Hunde) => void;
}

export function PfotenPortraetDetails({
  record,
  besitzerList,
  onOpenBesitzer,
  hundeList,
  onOpenHunde,
}: PfotenPortraetDetailsProps) {
  const besitzerTarget = besitzerList.find(r => r.record_id === extractRecordId(record.fields.besitzer));
  const hundTarget = hundeList.find(r => r.record_id === extractRecordId(record.fields.hund));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('pfoten_portraet', 'titel')} value={record.fields.titel} format="text" />
        <RecordField label={fieldLabel('pfoten_portraet', 'widmung')} value={record.fields.widmung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('pfoten_portraet', 'erlebnisse')} value={record.fields.erlebnisse} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('pfoten_portraet', 'foto')} className="md:col-span-2">
          {record.fields.foto ? (
            <MediaThumbnail src={record.fields.foto as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
        <RecordField label={fieldLabel('pfoten_portraet', 'erstellungsdatum')} value={record.fields.erstellungsdatum} format="date" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('pfoten_portraet', 'besitzer')}
          name={besitzerTarget?.fields.vorname ?? '—'}
          meta={[besitzerTarget?.fields.telefon, besitzerTarget?.fields.email].filter(Boolean).join(' · ') || undefined}
          onClick={besitzerTarget && onOpenBesitzer ? () => onOpenBesitzer!(besitzerTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('pfoten_portraet', 'hund')}
          name={hundTarget?.fields.name ?? '—'}
          meta={[hundTarget?.fields.rasse, hundTarget?.fields.tierarzt].filter(Boolean).join(' · ') || undefined}
          onClick={hundTarget && onOpenHunde ? () => onOpenHunde!(hundTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.PFOTEN_PORTRAET} recordId={record.record_id} />
    </>
  );
}
