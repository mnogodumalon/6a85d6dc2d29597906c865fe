/**
 * Pfoten-Portraet erstellen — 3-Schritt-Wizard.
 * Steps: 1) Besitzer auswaehlen → 2) Hund auswaehlen (gefiltert) → 3) Portraet verfassen & speichern.
 * Reads: besitzer, hunde. Writes: pfoten_portraet (createPfotenPortraetEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { IconPaw, IconUser, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { tx } from '@/i18n';

export default function PfotenPortraetPage() {
  const { besitzer, hunde, loading, error, fetchAll } = useDashboardData();

  const [step, setStep] = useState(1);
  const [selectedBesitzerId, setSelectedBesitzerId] = useState<string | null>(null);
  const [selectedHundId, setSelectedHundId] = useState<string | null>(null);

  const [titel, setTitel] = useState('');
  const [widmung, setWidmung] = useState('');
  const [erlebnisse, setErlebnisse] = useState('');
  const [erstellungsdatum, setErstellungsdatum] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [createdTitel, setCreatedTitel] = useState<string | null>(null);

  const selectedBesitzer = besitzer.find(b => b.record_id === selectedBesitzerId);

  const filteredHunde = hunde.filter(h =>
    extractRecordId(h.fields.besitzer) === selectedBesitzerId
  );

  const handleSave = async () => {
    if (!selectedBesitzerId || !selectedHundId || !titel || !erstellungsdatum) return;
    setSaving(true);
    setSaveError(null);
    try {
      await LivingAppsService.createPfotenPortraetEntry({
        besitzer: createRecordUrl('6a85d6ae7a3982ed83f8b89b', selectedBesitzerId),
        hund: createRecordUrl('6a85d6b4c6fdd6eb1663710d', selectedHundId),
        titel,
        widmung: widmung || undefined,
        erlebnisse: erlebnisse || undefined,
        erstellungsdatum,
      });
      await fetchAll();
      setCreatedTitel(titel);
      setStep(4);
    } catch {
      setSaveError(tx('Beim Speichern ist ein Fehler aufgetreten. Bitte erneut versuchen.'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedBesitzerId(null);
    setSelectedHundId(null);
    setTitel('');
    setWidmung('');
    setErlebnisse('');
    setErstellungsdatum(format(new Date(), 'yyyy-MM-dd'));
    setSaveError(null);
    setCreatedTitel(null);
  };

  return (
    <IntentWizardShell
      title={tx('Pfoten-Portraet erstellen')}
      subtitle={tx('Erstelle ein individuelles Portraet fuer einen Hund')}
      steps={[
        { label: tx('Besitzer') },
        { label: tx('Hund') },
        { label: tx('Portraet') },
        { label: tx('Fertig') },
      ]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Besitzer auswaehlen */}
      {step === 1 && (
        <EntitySelectStep
          items={besitzer.map(b => ({
            id: b.record_id,
            title: [b.fields.vorname, b.fields.nachname].filter(Boolean).join(' ') || b.record_id,
            subtitle: [b.fields.telefon, b.fields.email].filter(Boolean).join(' · ') || undefined,
            icon: <IconUser size={20} className="text-primary" />,
          }))}
          onSelect={(id) => {
            setSelectedBesitzerId(id);
            setSelectedHundId(null);
            setStep(2);
          }}
          searchPlaceholder={tx('Besitzer suchen ...')}
          emptyText={tx('Kein Besitzer gefunden')}
        />
      )}

      {/* Step 2: Hund auswaehlen */}
      {step === 2 && (
        selectedBesitzerId ? (
          <EntitySelectStep
            items={filteredHunde.map(h => ({
              id: h.record_id,
              title: h.fields.name ?? h.record_id,
              subtitle: h.fields.rasse || undefined,
              icon: <IconPaw size={20} className="text-primary" />,
            }))}
            onSelect={(id) => {
              setSelectedHundId(id);
              setStep(3);
            }}
            searchPlaceholder={tx('Hund suchen ...')}
            emptyText={
              selectedBesitzer
                ? tx('Keine Hunde fuer diesen Besitzer gefunden')
                : tx('Keine Hunde gefunden')
            }
          />
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">
              {tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}
            </p>
            <Button variant="outline" onClick={() => setStep(1)}>
              {tx('Neu starten')}
            </Button>
          </div>
        )
      )}

      {/* Step 3: Portraet verfassen */}
      {step === 3 && (
        selectedBesitzerId && selectedHundId ? (
          <div className="space-y-6 max-w-xl mx-auto">
            <div className="rounded-2xl border bg-secondary/40 p-4 text-sm text-muted-foreground">
              {tx('Das Foto (Datei-Feld) kann nach dem Erstellen in der Verwaltung hochgeladen werden.')}
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="titel">{tx('Titel')} *</Label>
                <Input
                  id="titel"
                  value={titel}
                  onChange={e => setTitel(e.target.value)}
                  placeholder={tx('z. B. "Bello — ein Leben voller Abenteuer"')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="widmung">{tx('Widmung')}</Label>
                <Textarea
                  id="widmung"
                  value={widmung}
                  onChange={e => setWidmung(e.target.value)}
                  placeholder={tx('Eine persoenliche Widmung ...')}
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="erlebnisse">{tx('Erlebnisse')}</Label>
                <Textarea
                  id="erlebnisse"
                  value={erlebnisse}
                  onChange={e => setErlebnisse(e.target.value)}
                  placeholder={tx('Besondere Erlebnisse und Erinnerungen ...')}
                  rows={5}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="erstellungsdatum">{tx('Erstellungsdatum')} *</Label>
                <Input
                  id="erstellungsdatum"
                  type="date"
                  value={erstellungsdatum}
                  onChange={e => setErstellungsdatum(e.target.value)}
                />
              </div>
            </div>

            {saveError && (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <IconAlertCircle size={16} className="shrink-0" />
                {saveError}
              </div>
            )}

            <Button
              className="w-full"
              disabled={!titel || !erstellungsdatum || saving}
              onClick={handleSave}
            >
              {saving ? tx('Wird gespeichert ...') : tx('Portraet speichern')}
            </Button>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">
              {tx('Dieser Schritt braucht die Auswahl aus Schritt 1 und 2.')}
            </p>
            <Button variant="outline" onClick={() => setStep(1)}>
              {tx('Neu starten')}
            </Button>
          </div>
        )
      )}

      {/* Step 4: Bestaetigung */}
      {step === 4 && (
        createdTitel ? (
          <div className="flex flex-col items-center text-center gap-6 py-10 max-w-sm mx-auto">
            <div className="rounded-full bg-primary/10 p-5">
              <IconCheck size={40} className="text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">{tx('Portraet erstellt!')}</h2>
              <p className="text-muted-foreground text-sm">
                {tx('Das Portraet')} <span className="font-medium text-foreground">{tx('&ldquo;')}{createdTitel}{tx('&rdquo;')}</span> {tx('wurde erfolgreich gespeichert.')}
              </p>
              <p className="text-muted-foreground text-sm">
                {tx('Das Foto kann in der Verwaltung hochgeladen werden.')}
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Button onClick={handleReset} variant="outline" className="w-full">
                {tx('Weiteres Portraet erstellen')}
              </Button>
              <a href="#/" className="w-full">
                <Button variant="ghost" className="w-full">
                  {tx('Zurueck zur Uebersicht')}
                </Button>
              </a>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">
              {tx('Dieser Schritt braucht die Auswahl aus Schritt 1 und 2.')}
            </p>
            <Button variant="outline" onClick={() => setStep(1)}>
              {tx('Neu starten')}
            </Button>
          </div>
        )
      )}
    </IntentWizardShell>
  );
}
