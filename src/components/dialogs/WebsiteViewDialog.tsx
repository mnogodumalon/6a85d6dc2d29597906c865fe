import type { Website } from '@/types/app';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { IconPencil, IconFileText } from '@tabler/icons-react';
import { t, appLabel, fieldLabel, lookupLabel } from '@/i18n';

interface WebsiteViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Website | null;
  onEdit: (record: Website) => void;
}

export function WebsiteViewDialog({ open, onClose, record, onEdit }: WebsiteViewDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('view_entity', { entity: appLabel('website') })}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            {t('edit_button')}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('website', 'unternehmensname')}</Label>
            <p className="text-sm">{record.fields.unternehmensname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('website', 'slogan')}</Label>
            <p className="text-sm">{record.fields.slogan ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('website', 'beschreibung')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('website', 'anzahl_plaetze')}</Label>
            <p className="text-sm">{record.fields.anzahl_plaetze ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('website', 'logo')}</Label>
            {record.fields.logo ? (
              <MediaThumbnail src={record.fields.logo} fit="contain" className="w-full rounded-lg border" />
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('website', 'leistungen')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.leistungen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('website', 'usps')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.usps ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('website', 'oeffnungszeiten')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.oeffnungszeiten ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('website', 'kontakt_telefon')}</Label>
            <p className="text-sm">{record.fields.kontakt_telefon ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('website', 'kontakt_email')}</Label>
            <p className="text-sm">{record.fields.kontakt_email ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('website', 'website_url')}</Label>
            <p className="text-sm">{record.fields.website_url ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('website', 'kontakt_strasse')}</Label>
            <p className="text-sm">{record.fields.kontakt_strasse ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('website', 'kontakt_hausnummer')}</Label>
            <p className="text-sm">{record.fields.kontakt_hausnummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('website', 'kontakt_plz')}</Label>
            <p className="text-sm">{record.fields.kontakt_plz ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('website', 'kontakt_ort')}</Label>
            <p className="text-sm">{record.fields.kontakt_ort ?? '—'}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.WEBSITE} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}