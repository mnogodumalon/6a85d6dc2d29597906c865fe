import type { Website } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';

export interface WebsiteDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Website;
}

export function WebsiteDetails({
  record,
}: WebsiteDetailsProps) {
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('website', 'unternehmensname')} value={record.fields.unternehmensname} format="text" />
        <RecordField label={fieldLabel('website', 'slogan')} value={record.fields.slogan} format="text" />
        <RecordField label={fieldLabel('website', 'beschreibung')} value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('website', 'anzahl_plaetze')} value={record.fields.anzahl_plaetze} format="text" />
        <RecordField label={fieldLabel('website', 'logo')} className="md:col-span-2">
          {record.fields.logo ? (
            <MediaThumbnail src={record.fields.logo as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
        <RecordField label={fieldLabel('website', 'leistungen')} value={record.fields.leistungen} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('website', 'usps')} value={record.fields.usps} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('website', 'oeffnungszeiten')} value={record.fields.oeffnungszeiten} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('website', 'kontakt_telefon')} value={record.fields.kontakt_telefon} format="text" />
        <RecordField label={fieldLabel('website', 'kontakt_email')} value={record.fields.kontakt_email} format="email" />
        <RecordField label={fieldLabel('website', 'website_url')} value={record.fields.website_url} format="url" />
        <RecordField label={fieldLabel('website', 'kontakt_strasse')} value={record.fields.kontakt_strasse} format="text" />
        <RecordField label={fieldLabel('website', 'kontakt_hausnummer')} value={record.fields.kontakt_hausnummer} format="text" />
        <RecordField label={fieldLabel('website', 'kontakt_plz')} value={record.fields.kontakt_plz} format="text" />
        <RecordField label={fieldLabel('website', 'kontakt_ort')} value={record.fields.kontakt_ort} format="text" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.WEBSITE} recordId={record.record_id} />
    </>
  );
}
