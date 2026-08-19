/**
 * Anfrage bearbeiten — 3-Schritt-Wizard.
 * Steps: 1) Buchungsanfrage auswählen (nur neu/bestätigt) → 2) Entscheidung treffen
 *        (ablehnen / bestätigen / umwandeln) → 3) Aufenthalt anlegen.
 * Reads: buchungsanfragen, besitzer, hunde.
 * Writes: buchungsanfragen (updateBuchungsanfragenEntry), aufenthalte (createAufenthalteEntry).
 * Composes: IntentWizardShell, EntitySelectStep, StatusBadge.
 */

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StatusBadge } from '@/components/blocks/StatusBadge';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import type { Buchungsanfragen } from '@/types/app';
import { lookupKey, formatDate } from '@/lib/formatters';
import { tx } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  IconDog,
  IconCalendar,
  IconCheck,
  IconX,
  IconArrowRight,
  IconInfoCircle,
  IconUser,
  IconPhone,
  IconMail,
  IconMessageCircle,
  IconCircleCheck,
} from '@tabler/icons-react';

const PLATZNUMMER_OPTIONS = LOOKUP_OPTIONS['aufenthalte']?.['platznummer'] ?? [];

export default function AnfrageBearbeitenPage() {
  const { buchungsanfragen, besitzer, hunde, loading, error, fetchAll } = useDashboardData();

  const [step, setStep] = useState(1);
  const [selectedAnfrage, setSelectedAnfrage] = useState<Buchungsanfragen | null>(null);

  // Step 3 state
  const [selectedBesitzerId, setSelectedBesitzerId] = useState('');
  const [selectedHundId, setSelectedHundId] = useState('');
  const [anreise, setAnreise] = useState('');
  const [abreise, setAbreise] = useState('');
  const [platznummer, setPlatznummer] = useState('');
  const [preis, setPreis] = useState('');
  const [notizen, setNotizen] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdAufenthaltId, setCreatedAufenthaltId] = useState('');
  const [actionDone, setActionDone] = useState<'abgelehnt' | 'bestaetigt' | 'umgewandelt' | null>(null);

  // Filter to only eligible anfragen
  const eligibleAnfragen = buchungsanfragen.filter(a => {
    const key = lookupKey(a.fields.status);
    return key === 'neu' || key === 'bestaetigt';
  });

  // Hunde filtered by selected besitzer
  const filteredHunde = selectedBesitzerId
    ? hunde.filter(h => {
        const besitzerUrl = h.fields.besitzer ?? '';
        const hBesitzerId = extractRecordId(besitzerUrl) ?? '';
        return hBesitzerId === selectedBesitzerId;
      })
    : hunde;

  const handleAnfrageSelect = (id: string) => {
    const found = buchungsanfragen.find(a => a.record_id === id) ?? null;
    setSelectedAnfrage(found);
    if (found) {
      setAnreise(found.fields.wunsch_anreise ?? '');
      setAbreise(found.fields.wunsch_abreise ?? '');
    }
    setStep(2);
  };

  const handleAblehnen = async () => {
    if (!selectedAnfrage) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await LivingAppsService.updateBuchungsanfragenEntry(selectedAnfrage.record_id, { status: 'abgelehnt' });
      await fetchAll();
      setActionDone('abgelehnt');
    } catch {
      setSubmitError(tx('Fehler beim Ablehnen. Bitte erneut versuchen.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBestaetigen = async () => {
    if (!selectedAnfrage) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await LivingAppsService.updateBuchungsanfragenEntry(selectedAnfrage.record_id, { status: 'bestaetigt' });
      await fetchAll();
      // Refresh the selected anfrage from updated data
      setActionDone('bestaetigt');
    } catch {
      setSubmitError(tx('Fehler beim Bestätigen. Bitte erneut versuchen.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUmwandeln = () => {
    setStep(3);
  };

  const handleCreateAufenthalt = async () => {
    if (!selectedAnfrage || !selectedBesitzerId || !selectedHundId || !anreise || !abreise || !platznummer) return;
    setSubmitting(true);
    setSubmitError('');

    let aufenthaltId = createdAufenthaltId;
    try {
      if (!aufenthaltId) {
        const result = await LivingAppsService.createAufenthalteEntry({
          hund: createRecordUrl(APP_IDS.HUNDE, selectedHundId),
          besitzer: createRecordUrl(APP_IDS.BESITZER, selectedBesitzerId),
          anreise,
          abreise,
          platznummer,
          status: 'geplant',
          preis: preis ? parseFloat(preis) : undefined,
          notizen: notizen || undefined,
        });
        aufenthaltId = result.record_id;
        setCreatedAufenthaltId(aufenthaltId);
      }

      await LivingAppsService.updateBuchungsanfragenEntry(selectedAnfrage.record_id, { status: 'umgewandelt' });
      await fetchAll();
      setActionDone('umgewandelt');
    } catch {
      setSubmitError(tx('Fehler beim Anlegen des Aufenthalts. Bitte erneut versuchen.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedAnfrage(null);
    setSelectedBesitzerId('');
    setSelectedHundId('');
    setAnreise('');
    setAbreise('');
    setPlatznummer('');
    setPreis('');
    setNotizen('');
    setSubmitError('');
    setCreatedAufenthaltId('');
    setActionDone(null);
    setStep(1);
  };

  const formatAnreise = (dateStr?: string) => {
    if (!dateStr) return '—';
    try { return format(parseISO(dateStr), 'dd.MM.yyyy'); } catch { return dateStr; }
  };

  return (
    <IntentWizardShell
      title={tx('Anfrage bearbeiten')}
      subtitle={tx('Buchungsanfragen prüfen, bestätigen oder ablehnen')}
      steps={[
        { label: tx('Anfrage wählen') },
        { label: tx('Entscheidung') },
        { label: tx('Aufenthalt anlegen') },
      ]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── Step 1: Anfrage auswählen ── */}
      {step === 1 && (
        <EntitySelectStep
          items={eligibleAnfragen.map(a => ({
            id: a.record_id,
            title: `${a.fields.anfrage_vorname ?? ''} ${a.fields.anfrage_nachname ?? ''}`.trim() || tx('Unbekannt'),
            subtitle: a.fields.hund_name
              ? `${tx('Hund')}: ${a.fields.hund_name}${a.fields.wunsch_anreise ? ` · ${formatAnreise(a.fields.wunsch_anreise)}–${formatAnreise(a.fields.wunsch_abreise)}` : ''}`
              : a.fields.wunsch_anreise
                ? `${formatAnreise(a.fields.wunsch_anreise)} – ${formatAnreise(a.fields.wunsch_abreise)}`
                : undefined,
            status: a.fields.status
              ? { key: a.fields.status.key, label: a.fields.status.label }
              : undefined,
            icon: <IconDog size={20} className="text-primary shrink-0" />,
          }))}
          onSelect={handleAnfrageSelect}
          searchPlaceholder={tx('Anfrage suchen …')}
          emptyText={tx('Keine offenen Anfragen vorhanden')}
          emptyIcon={<IconDog size={40} className="text-muted-foreground" />}
        />
      )}

      {/* ── Step 2: Entscheidung ── */}
      {step === 2 && (
        selectedAnfrage ? (
          <div className="space-y-6">
            {/* Success states */}
            {actionDone === 'abgelehnt' && (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center space-y-3">
                <IconX size={40} className="mx-auto text-destructive" />
                <p className="font-semibold text-lg">{tx('Anfrage abgelehnt')}</p>
                <p className="text-sm text-muted-foreground">
                  {tx('Die Anfrage von')} {selectedAnfrage.fields.anfrage_vorname} {selectedAnfrage.fields.anfrage_nachname} {tx('wurde abgelehnt.')}
                </p>
                <div className="flex gap-3 justify-center pt-2">
                  <Button onClick={handleReset} variant="outline">{tx('Neue Anfrage bearbeiten')}</Button>
                  <a href="#/">
                    <Button variant="default">{tx('Zurück zur Übersicht')}</Button>
                  </a>
                </div>
              </div>
            )}

            {actionDone === 'bestaetigt' && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-3">
                <IconCheck size={40} className="mx-auto text-emerald-600" />
                <p className="font-semibold text-lg">{tx('Anfrage bestätigt')}</p>
                <p className="text-sm text-muted-foreground">
                  {tx('Die Anfrage wurde bestätigt. Du kannst sie jetzt in einen Aufenthalt umwandeln.')}
                </p>
                <div className="flex gap-3 justify-center pt-2">
                  <Button onClick={() => setActionDone(null)} variant="outline">{tx('Weiter bearbeiten')}</Button>
                  <Button onClick={handleReset} variant="outline">{tx('Neue Anfrage')}</Button>
                  <a href="#/">
                    <Button>{tx('Zurück zur Übersicht')}</Button>
                  </a>
                </div>
              </div>
            )}

            {!actionDone && (
              <>
                {/* Detail card */}
                <div className="rounded-2xl border bg-card p-5 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="font-semibold text-lg">
                      {selectedAnfrage.fields.anfrage_vorname} {selectedAnfrage.fields.anfrage_nachname}
                    </h2>
                    {selectedAnfrage.fields.status && (
                      <StatusBadge
                        statusKey={selectedAnfrage.fields.status.key}
                        label={selectedAnfrage.fields.status.label}
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    {/* Kontakt */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{tx('Kontakt')}</p>
                      {selectedAnfrage.fields.anfrage_telefon && (
                        <div className="flex items-center gap-2 text-foreground">
                          <IconPhone size={14} className="shrink-0 text-muted-foreground" />
                          <span>{selectedAnfrage.fields.anfrage_telefon}</span>
                        </div>
                      )}
                      {selectedAnfrage.fields.anfrage_email && (
                        <div className="flex items-center gap-2 text-foreground">
                          <IconMail size={14} className="shrink-0 text-muted-foreground" />
                          <span className="truncate">{selectedAnfrage.fields.anfrage_email}</span>
                        </div>
                      )}
                      {!selectedAnfrage.fields.anfrage_telefon && !selectedAnfrage.fields.anfrage_email && (
                        <p className="text-muted-foreground italic">{tx('Keine Kontaktdaten')}</p>
                      )}
                    </div>

                    {/* Zeitraum */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{tx('Gewünschter Zeitraum')}</p>
                      <div className="flex items-center gap-2">
                        <IconCalendar size={14} className="shrink-0 text-muted-foreground" />
                        <span>
                          {formatAnreise(selectedAnfrage.fields.wunsch_anreise)}
                          {' → '}
                          {formatAnreise(selectedAnfrage.fields.wunsch_abreise)}
                        </span>
                      </div>
                    </div>

                    {/* Hund */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{tx('Hund')}</p>
                      <div className="flex items-center gap-2">
                        <IconDog size={14} className="shrink-0 text-muted-foreground" />
                        <span>{selectedAnfrage.fields.hund_name || '—'}</span>
                      </div>
                      {selectedAnfrage.fields.hund_rasse && (
                        <p className="text-muted-foreground text-xs pl-5">{selectedAnfrage.fields.hund_rasse}</p>
                      )}
                      {selectedAnfrage.fields.hund_groesse && (
                        <p className="text-muted-foreground text-xs pl-5">{selectedAnfrage.fields.hund_groesse.label}</p>
                      )}
                    </div>

                    {/* Besitzer */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{tx('Anfragender')}</p>
                      <div className="flex items-center gap-2">
                        <IconUser size={14} className="shrink-0 text-muted-foreground" />
                        <span>{selectedAnfrage.fields.anfrage_vorname} {selectedAnfrage.fields.anfrage_nachname}</span>
                      </div>
                    </div>
                  </div>

                  {/* Nachricht */}
                  {selectedAnfrage.fields.nachricht && (
                    <div className="space-y-1 pt-2 border-t">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <IconMessageCircle size={12} className="shrink-0" />
                        {tx('Nachricht')}
                      </p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{selectedAnfrage.fields.nachricht}</p>
                    </div>
                  )}
                </div>

                {/* Error */}
                {submitError && (
                  <p className="text-sm text-destructive bg-destructive/5 rounded-lg px-3 py-2">{submitError}</p>
                )}

                {/* Action buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Button
                    variant="destructive"
                    onClick={handleAblehnen}
                    disabled={submitting}
                    className="w-full"
                  >
                    <IconX size={16} className="shrink-0 mr-2" />
                    {tx('Ablehnen')}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleBestaetigen}
                    disabled={submitting || lookupKey(selectedAnfrage.fields.status) === 'bestaetigt'}
                    className="w-full"
                  >
                    <IconCheck size={16} className="shrink-0 mr-2" />
                    {lookupKey(selectedAnfrage.fields.status) === 'bestaetigt'
                      ? tx('Bereits bestätigt')
                      : tx('Bestätigen')}
                  </Button>

                  <Button
                    variant="default"
                    onClick={handleUmwandeln}
                    disabled={submitting}
                    className="w-full"
                  >
                    <IconArrowRight size={16} className="shrink-0 mr-2" />
                    {tx('In Aufenthalt umwandeln')}
                  </Button>
                </div>

                <div className="flex justify-start">
                  <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                    {tx('Zurück zur Auswahl')}
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">{tx('Dieser Schritt braucht eine ausgewählte Anfrage aus Schritt 1.')}</p>
            <Button variant="outline" onClick={() => setStep(1)}>{tx('Neu starten')}</Button>
          </div>
        )
      )}

      {/* ── Step 3: Aufenthalt anlegen ── */}
      {step === 3 && (
        selectedAnfrage ? (
          actionDone === 'umgewandelt' ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-3">
              <IconCircleCheck size={48} className="mx-auto text-emerald-600" />
              <p className="font-semibold text-lg">{tx('Aufenthalt erfolgreich angelegt!')}</p>
              <p className="text-sm text-muted-foreground">
                {tx('Die Buchungsanfrage wurde in einen Aufenthalt umgewandelt.')}
              </p>
              <div className="flex gap-3 justify-center pt-2 flex-wrap">
                <Button onClick={handleReset} variant="outline">{tx('Neue Anfrage bearbeiten')}</Button>
                <a href="#/">
                  <Button>{tx('Zurück zur Übersicht')}</Button>
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Info hint */}
              <div className="flex items-start gap-3 rounded-xl bg-secondary p-4 text-sm">
                <IconInfoCircle size={16} className="shrink-0 text-primary mt-0.5" />
                <p className="text-muted-foreground">
                  {tx('Bitte lege Besitzer und Hund zuerst in der Verwaltung an, falls noch nicht vorhanden.')}
                  {' '}
                  {tx('Anfrage von')}: <strong>{selectedAnfrage.fields.anfrage_vorname} {selectedAnfrage.fields.anfrage_nachname}</strong>
                  {selectedAnfrage.fields.hund_name && (
                    <> · {tx('Hund')}: <strong>{selectedAnfrage.fields.hund_name}</strong></>
                  )}
                </p>
              </div>

              <div className="rounded-2xl border bg-card p-5 space-y-5">
                <h2 className="font-semibold">{tx('Aufenthalt anlegen')}</h2>

                {/* Besitzer */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{tx('Besitzer')} *</label>
                  <Select
                    value={selectedBesitzerId || 'none'}
                    onValueChange={v => {
                      const newVal = v === 'none' ? '' : v;
                      setSelectedBesitzerId(newVal);
                      setSelectedHundId('');
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={tx('Besitzer wählen …')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tx('Bitte wählen …')}</SelectItem>
                      {besitzer.map(b => (
                        <SelectItem key={b.record_id} value={b.record_id}>
                          {b.fields.vorname} {b.fields.nachname}
                          {b.fields.telefon ? ` · ${b.fields.telefon}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Hund */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{tx('Hund')} *</label>
                  <Select
                    value={selectedHundId || 'none'}
                    onValueChange={v => setSelectedHundId(v === 'none' ? '' : v)}
                    disabled={!selectedBesitzerId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={selectedBesitzerId ? tx('Hund wählen …') : tx('Zuerst Besitzer wählen')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tx('Bitte wählen …')}</SelectItem>
                      {filteredHunde.map(h => (
                        <SelectItem key={h.record_id} value={h.record_id}>
                          {h.fields.name ?? tx('Unbekannt')}
                          {h.fields.rasse ? ` (${h.fields.rasse})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedBesitzerId && filteredHunde.length === 0 && (
                    <p className="text-xs text-muted-foreground">{tx('Keine Hunde für diesen Besitzer gefunden.')}</p>
                  )}
                </div>

                {/* Datum */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{tx('Anreise')} *</label>
                    <Input
                      type="date"
                      value={anreise}
                      onChange={e => setAnreise(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{tx('Abreise')} *</label>
                    <Input
                      type="date"
                      value={abreise}
                      onChange={e => setAbreise(e.target.value)}
                    />
                  </div>
                </div>

                {/* Platz */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{tx('Platznummer')} *</label>
                  <Select
                    value={platznummer || 'none'}
                    onValueChange={v => setPlatznummer(v === 'none' ? '' : v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={tx('Platz wählen …')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tx('Bitte wählen …')}</SelectItem>
                      {PLATZNUMMER_OPTIONS.map(opt => (
                        <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Preis */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{tx('Preis (€)')}</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={preis}
                    onChange={e => setPreis(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                {/* Notizen */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{tx('Notizen')}</label>
                  <Textarea
                    value={notizen}
                    onChange={e => setNotizen(e.target.value)}
                    placeholder={tx('Interne Notizen zum Aufenthalt …')}
                    rows={3}
                  />
                </div>
              </div>

              {submitError && (
                <p className="text-sm text-destructive bg-destructive/5 rounded-lg px-3 py-2">{submitError}</p>
              )}

              <div className="flex flex-wrap gap-3 justify-between">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  {tx('Zurück')}
                </Button>
                <Button
                  onClick={handleCreateAufenthalt}
                  disabled={
                    submitting ||
                    !selectedBesitzerId ||
                    !selectedHundId ||
                    !anreise ||
                    !abreise ||
                    !platznummer
                  }
                >
                  <IconCircleCheck size={16} className="shrink-0 mr-2" />
                  {submitting ? tx('Wird angelegt …') : tx('Aufenthalt anlegen')}
                </Button>
              </div>
            </div>
          )
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">{tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}</p>
            <Button variant="outline" onClick={() => setStep(1)}>{tx('Neu starten')}</Button>
          </div>
        )
      )}
    </IntentWizardShell>
  );
}
