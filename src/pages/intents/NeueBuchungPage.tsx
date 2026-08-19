/**
 * Neue Buchung — 3-Schritt-Wizard zum Anlegen eines Aufenthalts.
 * Steps: 1) Besitzer wählen oder neu anlegen → 2) Hund wählen oder neu anlegen
 *        (gefiltert nach gewähltem Besitzer) → 3) Zeitraum & Platz festlegen → Bestätigung.
 * Reads: besitzer, hunde. Writes: besitzer (createBesitzerEntry), hunde (createHundeEntry),
 *        aufenthalte (createAufenthalteEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { IconCheck, IconDog, IconUser, IconCalendar, IconHome } from '@tabler/icons-react';

import { tx } from '@/i18n';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import type { Besitzer, Hunde } from '@/types/app';

import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

// ─── Step 3 form state ───────────────────────────────────────────────────────

const PLATZNUMMER_OPTIONS = LOOKUP_OPTIONS['aufenthalte']?.['platznummer'] ?? [];
const GESCHLECHT_OPTIONS = LOOKUP_OPTIONS['hunde']?.['geschlecht'] ?? [];
const IMPFSTATUS_OPTIONS = LOOKUP_OPTIONS['hunde']?.['impfstatus'] ?? [];

export default function NeueBuchungPage() {
  const data = useDashboardData();
  const { besitzer, hunde, loading, error, fetchAll } = data;

  // ── Wizard step ─────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);

  // ── Step 1: Besitzer ────────────────────────────────────────────────────
  const [selectedBesitzerId, setSelectedBesitzerId] = useState<string | null>(null);
  const [showCreateBesitzer, setShowCreateBesitzer] = useState(false);
  const [bVorname, setBVorname] = useState('');
  const [bNachname, setBNachname] = useState('');
  const [bTelefon, setBTelefon] = useState('');
  const [bSaving, setBSaving] = useState(false);

  // ── Step 2: Hund ────────────────────────────────────────────────────────
  const [selectedHundId, setSelectedHundId] = useState<string | null>(null);
  const [showCreateHund, setShowCreateHund] = useState(false);
  const [hName, setHName] = useState('');
  const [hRasse, setHRasse] = useState('');
  const [hGeburtsdatum, setHGeburtsdatum] = useState('');
  const [hGeschlecht, setHGeschlecht] = useState('none');
  const [hImpfstatus, setHImpfstatus] = useState('none');
  const [hSaving, setHSaving] = useState(false);

  // ── Step 3: Aufenthalt ──────────────────────────────────────────────────
  const [anreise, setAnreise] = useState('');
  const [abreise, setAbreise] = useState('');
  const [platznummerKey, setPlatznummerKey] = useState('none');
  const [preis, setPreis] = useState('');
  const [notizen, setNotizen] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [createdAufenthaltId, setCreatedAufenthaltId] = useState<string | null>(null);

  // ── Derived data ────────────────────────────────────────────────────────
  const selectedBesitzer: Besitzer | undefined = besitzer.find(
    b => b.record_id === selectedBesitzerId
  );

  const hundeDesBesitzers: Hunde[] = selectedBesitzerId
    ? hunde.filter(h => extractRecordId(h.fields.besitzer) === selectedBesitzerId)
    : [];

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSelectBesitzer = (id: string) => {
    setSelectedBesitzerId(id);
    setSelectedHundId(null);
    setStep(2);
  };

  const handleCreateBesitzer = async () => {
    if (!bVorname.trim() || !bNachname.trim()) return;
    setBSaving(true);
    try {
      const created = await LivingAppsService.createBesitzerEntry({
        vorname: bVorname.trim(),
        nachname: bNachname.trim(),
        telefon: bTelefon.trim() || undefined,
      });
      await fetchAll();
      setShowCreateBesitzer(false);
      setBVorname('');
      setBNachname('');
      setBTelefon('');
      setSelectedBesitzerId(created.record_id);
      setSelectedHundId(null);
      setStep(2);
    } finally {
      setBSaving(false);
    }
  };

  const handleSelectHund = (id: string) => {
    setSelectedHundId(id);
    setStep(3);
  };

  const handleCreateHund = async () => {
    if (!hName.trim() || !selectedBesitzerId) return;
    setHSaving(true);
    try {
      const payload: Parameters<typeof LivingAppsService.createHundeEntry>[0] = {
        name: hName.trim(),
        besitzer: createRecordUrl(APP_IDS.BESITZER, selectedBesitzerId),
      };
      if (hRasse.trim()) payload.rasse = hRasse.trim();
      if (hGeburtsdatum) payload.geburtsdatum = hGeburtsdatum;
      if (hGeschlecht !== 'none') payload.geschlecht = hGeschlecht;
      if (hImpfstatus !== 'none') payload.impfstatus = hImpfstatus;
      const created = await LivingAppsService.createHundeEntry(payload);
      await fetchAll();
      setShowCreateHund(false);
      setHName('');
      setHRasse('');
      setHGeburtsdatum('');
      setHGeschlecht('none');
      setHImpfstatus('none');
      setSelectedHundId(created.record_id);
      setStep(3);
    } finally {
      setHSaving(false);
    }
  };

  const handleCreateAufenthalt = async () => {
    if (!selectedBesitzerId || !selectedHundId || !anreise || !abreise || platznummerKey === 'none') return;
    setSaving(true);
    setSaveError(null);
    try {
      let aid = createdAufenthaltId;
      if (!aid) {
        const created = await LivingAppsService.createAufenthalteEntry({
          hund: createRecordUrl(APP_IDS.HUNDE, selectedHundId),
          besitzer: createRecordUrl(APP_IDS.BESITZER, selectedBesitzerId),
          anreise,
          abreise,
          platznummer: platznummerKey,
          status: 'geplant',
          preis: preis ? parseFloat(preis) : undefined,
          notizen: notizen.trim() || undefined,
        });
        aid = created.record_id;
        setCreatedAufenthaltId(aid);
      }
      await fetchAll();
      setStep(4);
    } catch (e) {
      setSaveError(tx('Fehler beim Speichern. Bitte erneut versuchen.'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedBesitzerId(null);
    setSelectedHundId(null);
    setShowCreateBesitzer(false);
    setShowCreateHund(false);
    setBVorname('');
    setBNachname('');
    setBTelefon('');
    setHName('');
    setHRasse('');
    setHGeburtsdatum('');
    setHGeschlecht('none');
    setHImpfstatus('none');
    setAnreise('');
    setAbreise('');
    setPlatznummerKey('none');
    setPreis('');
    setNotizen('');
    setSaveError(null);
    setCreatedAufenthaltId(null);
  };

  // ── Selected labels for summary ───────────────────────────────────────────
  const selectedHund: Hunde | undefined = hunde.find(h => h.record_id === selectedHundId);
  const platznummerLabel =
    PLATZNUMMER_OPTIONS.find(o => o.key === platznummerKey)?.label ?? platznummerKey;

  const step3Valid =
    selectedBesitzerId !== null &&
    selectedHundId !== null &&
    anreise !== '' &&
    abreise !== '' &&
    platznummerKey !== 'none';

  return (
    <IntentWizardShell
      title={tx('Neuen Aufenthalt buchen')}
      subtitle={tx('Besitzer, Hund und Zeitraum in drei Schritten festlegen')}
      steps={[
        { label: tx('Besitzer') },
        { label: tx('Hund') },
        { label: tx('Zeitraum & Platz') },
        { label: tx('Fertig') },
      ]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── Step 1: Besitzer wählen ─────────────────────────────────────────── */}
      {step === 1 && (
        <EntitySelectStep
          items={besitzer.map(b => ({
            id: b.record_id,
            title: [b.fields.vorname, b.fields.nachname].filter(Boolean).join(' ') || tx('(Kein Name)'),
            subtitle: b.fields.telefon ?? b.fields.email ?? undefined,
            icon: <IconUser size={20} className="text-primary" />,
          }))}
          onSelect={handleSelectBesitzer}
          createLabel={tx('Neuen Besitzer anlegen')}
          onCreateNew={() => setShowCreateBesitzer(v => !v)}
          searchPlaceholder={tx('Besitzer suchen …')}
          emptyText={tx('Noch kein Besitzer gefunden.')}
          createDialog={showCreateBesitzer && (
            <div className="rounded-2xl border bg-card p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">{tx('Neuen Besitzer anlegen')}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="b-vorname">{tx('Vorname')}</Label>
                  <Input
                    id="b-vorname"
                    value={bVorname}
                    onChange={e => setBVorname(e.target.value)}
                    placeholder={tx('Vorname')}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="b-nachname">{tx('Nachname')}</Label>
                  <Input
                    id="b-nachname"
                    value={bNachname}
                    onChange={e => setBNachname(e.target.value)}
                    placeholder={tx('Nachname')}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="b-telefon">{tx('Telefon')}</Label>
                <Input
                  id="b-telefon"
                  type="tel"
                  value={bTelefon}
                  onChange={e => setBTelefon(e.target.value)}
                  placeholder={tx('Telefonnummer')}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  disabled={!bVorname.trim() || !bNachname.trim() || bSaving}
                  onClick={handleCreateBesitzer}
                  className="flex-1"
                >
                  {bSaving ? tx('Wird angelegt …') : tx('Anlegen & auswählen')}
                </Button>
                <Button variant="outline" onClick={() => setShowCreateBesitzer(false)}>
                  {tx('Abbrechen')}
                </Button>
              </div>
            </div>
          )}
        />
      )}

      {/* ── Step 2: Hund wählen ─────────────────────────────────────────────── */}
      {step === 2 && (
        selectedBesitzerId ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary rounded-xl px-3 py-2">
              <IconUser size={14} className="shrink-0" />
              <span>
                {tx('Besitzer')}{': '}
                <strong className="text-foreground">
                  {[selectedBesitzer?.fields.vorname, selectedBesitzer?.fields.nachname]
                    .filter(Boolean).join(' ') || selectedBesitzerId}
                </strong>
              </span>
            </div>
            <EntitySelectStep
              items={hundeDesBesitzers.map(h => ({
                id: h.record_id,
                title: h.fields.name ?? tx('(Kein Name)'),
                subtitle: [
                  h.fields.rasse,
                  h.fields.gewicht_kg != null ? `${h.fields.gewicht_kg} kg` : undefined,
                ].filter(Boolean).join(' · ') || undefined,
                icon: <IconDog size={20} className="text-primary" />,
              }))}
              onSelect={handleSelectHund}
              createLabel={tx('Neuen Hund anlegen')}
              onCreateNew={() => setShowCreateHund(v => !v)}
              searchPlaceholder={tx('Hund suchen …')}
              emptyText={tx('Noch kein Hund für diesen Besitzer erfasst.')}
              createDialog={showCreateHund && (
                <div className="rounded-2xl border bg-card p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">{tx('Neuen Hund anlegen')}</p>
                  <div className="space-y-1">
                    <Label htmlFor="h-name">{tx('Name des Hundes')}</Label>
                    <Input
                      id="h-name"
                      value={hName}
                      onChange={e => setHName(e.target.value)}
                      placeholder={tx('z. B. Bello')}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="h-rasse">{tx('Rasse')}</Label>
                    <Input
                      id="h-rasse"
                      value={hRasse}
                      onChange={e => setHRasse(e.target.value)}
                      placeholder={tx('z. B. Labrador')}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="h-geb">{tx('Geburtsdatum')}</Label>
                    <Input
                      id="h-geb"
                      type="date"
                      value={hGeburtsdatum}
                      onChange={e => setHGeburtsdatum(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label>{tx('Geschlecht')}</Label>
                      <Select value={hGeschlecht} onValueChange={setHGeschlecht}>
                        <SelectTrigger>
                          <SelectValue placeholder={tx('Bitte wählen')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{tx('Nicht angegeben')}</SelectItem>
                          {GESCHLECHT_OPTIONS.map(o => (
                            <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>{tx('Impfstatus')}</Label>
                      <Select value={hImpfstatus} onValueChange={setHImpfstatus}>
                        <SelectTrigger>
                          <SelectValue placeholder={tx('Bitte wählen')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{tx('Nicht angegeben')}</SelectItem>
                          {IMPFSTATUS_OPTIONS.map(o => (
                            <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      disabled={!hName.trim() || hSaving}
                      onClick={handleCreateHund}
                      className="flex-1"
                    >
                      {hSaving ? tx('Wird angelegt …') : tx('Anlegen & auswählen')}
                    </Button>
                    <Button variant="outline" onClick={() => setShowCreateHund(false)}>
                      {tx('Abbrechen')}
                    </Button>
                  </div>
                </div>
              )}
            />
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">
              {tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}
            </p>
            <Button variant="outline" onClick={() => setStep(1)}>{tx('Neu starten')}</Button>
          </div>
        )
      )}

      {/* ── Step 3: Zeitraum & Platz ─────────────────────────────────────────── */}
      {step === 3 && (
        selectedBesitzerId && selectedHundId ? (
          <div className="space-y-5">
            {/* Context summary */}
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground bg-secondary rounded-xl px-3 py-2">
              <span className="flex items-center gap-1">
                <IconUser size={14} className="shrink-0" />
                <strong className="text-foreground">
                  {[selectedBesitzer?.fields.vorname, selectedBesitzer?.fields.nachname]
                    .filter(Boolean).join(' ') || selectedBesitzerId}
                </strong>
              </span>
              <span className="text-muted-foreground/50">·</span>
              <span className="flex items-center gap-1">
                <IconDog size={14} className="shrink-0" />
                <strong className="text-foreground">
                  {selectedHund?.fields.name ?? selectedHundId}
                </strong>
              </span>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="anreise">{tx('Anreise')}</Label>
                <Input
                  id="anreise"
                  type="date"
                  value={anreise}
                  onChange={e => setAnreise(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="abreise">{tx('Abreise')}</Label>
                <Input
                  id="abreise"
                  type="date"
                  value={abreise}
                  onChange={e => setAbreise(e.target.value)}
                />
              </div>
            </div>

            {/* Platznummer */}
            <div className="space-y-1">
              <Label>{tx('Platznummer')}</Label>
              <Select value={platznummerKey} onValueChange={setPlatznummerKey}>
                <SelectTrigger>
                  <SelectValue placeholder={tx('Platz wählen')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tx('Bitte wählen')}</SelectItem>
                  {PLATZNUMMER_OPTIONS.map(o => (
                    <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preis */}
            <div className="space-y-1">
              <Label htmlFor="preis">{tx('Preis (€)')}</Label>
              <Input
                id="preis"
                type="number"
                min="0"
                step="0.01"
                value={preis}
                onChange={e => setPreis(e.target.value)}
                placeholder={tx('z. B. 25.00')}
              />
            </div>

            {/* Notizen */}
            <div className="space-y-1">
              <Label htmlFor="notizen">{tx('Notizen')}</Label>
              <Textarea
                id="notizen"
                value={notizen}
                onChange={e => setNotizen(e.target.value)}
                placeholder={tx('Besondere Hinweise, Gewohnheiten, Medikamente …')}
                rows={3}
              />
            </div>

            {saveError && (
              <p className="text-sm text-destructive">{saveError}</p>
            )}

            <Button
              className="w-full"
              disabled={!step3Valid || saving}
              onClick={handleCreateAufenthalt}
            >
              <IconCalendar size={16} className="shrink-0 mr-2" />
              {saving ? tx('Wird gespeichert …') : tx('Aufenthalt anlegen')}
            </Button>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">
              {tx('Dieser Schritt braucht die Auswahl aus Schritt 1 und 2.')}
            </p>
            <Button variant="outline" onClick={() => setStep(1)}>{tx('Neu starten')}</Button>
          </div>
        )
      )}

      {/* ── Step 4: Bestätigung ─────────────────────────────────────────────── */}
      {step === 4 && (
        createdAufenthaltId ? (
          <div className="space-y-6 text-center py-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-emerald-100 p-4">
                <IconCheck size={36} className="text-emerald-600" />
              </div>
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-foreground">
                {tx('Aufenthalt erfolgreich angelegt!')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {[selectedBesitzer?.fields.vorname, selectedBesitzer?.fields.nachname]
                  .filter(Boolean).join(' ')}
                {' — '}
                {selectedHund?.fields.name}
              </p>
            </div>

            {/* Summary card */}
            <div className="rounded-2xl border bg-card text-left p-4 space-y-2 max-w-sm mx-auto">
              <div className="flex items-center gap-2 text-sm">
                <IconCalendar size={14} className="shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">{tx('Zeitraum')}:</span>
                <span className="font-medium text-foreground">
                  {anreise && format(new Date(anreise + 'T12:00'), 'dd.MM.yyyy')}
                  {' – '}
                  {abreise && format(new Date(abreise + 'T12:00'), 'dd.MM.yyyy')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <IconHome size={14} className="shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">{tx('Platz')}:</span>
                <span className="font-medium text-foreground">{platznummerLabel}</span>
              </div>
              {preis && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-[14px] shrink-0" />
                  <span className="text-muted-foreground">{tx('Preis')}:</span>
                  <span className="font-medium text-foreground">{parseFloat(preis).toFixed(2)} €</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button onClick={handleReset}>
                {tx('Neuen Aufenthalt buchen')}
              </Button>
              <Button variant="outline" asChild>
                <a href="#/">{tx('Zurück zum Dashboard')}</a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">
              {tx('Dieser Schritt braucht die Auswahl aus Schritt 3.')}
            </p>
            <Button variant="outline" onClick={() => setStep(3)}>{tx('Zurück zu Schritt 3')}</Button>
          </div>
        )
      )}
    </IntentWizardShell>
  );
}
