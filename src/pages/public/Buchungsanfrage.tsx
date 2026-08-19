import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { PublicShell } from '@/components/PublicShell';
import {
  loadPublicPagesConfig,
  createPublicRecord,
  prepareChallenge,
  PageUnavailableError,
  type PublicPagesConfig,
  type PublicPageConfig,
} from '@/lib/publicClient';
import { tx } from '@/i18n';
import { LOOKUP_OPTIONS } from '@/types/app';
import { IconPaw, IconCheck, IconChevronRight, IconChevronLeft } from '@tabler/icons-react';

const SLUG = 'buchungsanfrage';

type Step = 1 | 2 | 3;

interface FormState {
  anfrage_vorname: string;
  anfrage_nachname: string;
  anfrage_telefon: string;
  anfrage_email: string;
  hund_name: string;
  hund_rasse: string;
  hund_groesse: string;
  wunsch_anreise: string;
  wunsch_abreise: string;
  nachricht: string;
}

const EMPTY_FORM: FormState = {
  anfrage_vorname: '',
  anfrage_nachname: '',
  anfrage_telefon: '',
  anfrage_email: '',
  hund_name: '',
  hund_rasse: '',
  hund_groesse: '',
  wunsch_anreise: '',
  wunsch_abreise: '',
  nachricht: '',
};

export default function Buchungsanfrage() {
  const [cfg, setCfg] = useState<PublicPagesConfig | null>(null);
  const [page, setPage] = useState<PublicPageConfig | null>(null);
  const [loadingCfg, setLoadingCfg] = useState(true);

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    loadPublicPagesConfig(SLUG).then(c => {
      setCfg(c);
      setPage(c?.pages[SLUG] ?? null);
      setLoadingCfg(false);
    }).catch(err => {
      if (err instanceof PageUnavailableError) {
        setLoadingCfg(false);
      }
    });
  }, []);

  // Lookup options — derived inside the component so locale is correct
  const groesseOptions = LOOKUP_OPTIONS['buchungsanfragen']?.['hund_groesse'] ?? [];

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
    setErrors(ev => ({ ...ev, [key]: undefined }));
  };

  const today = format(new Date(), 'yyyy-MM-dd');

  // Validate step fields
  function validateStep(s: Step): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (s === 1) {
      if (!form.anfrage_vorname.trim()) errs.anfrage_vorname = tx('Pflichtfeld');
      if (!form.anfrage_nachname.trim()) errs.anfrage_nachname = tx('Pflichtfeld');
      if (!form.anfrage_telefon.trim()) errs.anfrage_telefon = tx('Pflichtfeld');
    }
    if (s === 2) {
      if (!form.hund_name.trim()) errs.hund_name = tx('Pflichtfeld');
    }
    if (s === 3) {
      if (!form.wunsch_anreise) errs.wunsch_anreise = tx('Pflichtfeld');
      if (!form.wunsch_abreise) errs.wunsch_abreise = tx('Pflichtfeld');
      if (form.wunsch_anreise && form.wunsch_abreise && form.wunsch_abreise <= form.wunsch_anreise) {
        errs.wunsch_abreise = tx('Abreise muss nach Anreise liegen');
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNext() {
    if (!validateStep(step)) return;
    if (step < 3) setStep((step + 1) as Step);
  }

  function handleBack() {
    if (step > 1) setStep((step - 1) as Step);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep(3)) return;
    if (!cfg || !page) return;

    setSubmitting(true);
    setSubmitError(null);

    const ep = page.endpoints?.find(ep => ep.op === 'create');
    if (!ep) {
      setSubmitError(tx('Formular ist derzeit nicht verfügbar.'));
      setSubmitting(false);
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        anfrage_vorname: form.anfrage_vorname.trim(),
        anfrage_nachname: form.anfrage_nachname.trim(),
        anfrage_telefon: form.anfrage_telefon.trim(),
        hund_name: form.hund_name.trim(),
        wunsch_anreise: form.wunsch_anreise,
        wunsch_abreise: form.wunsch_abreise,
      };
      if (form.anfrage_email.trim()) payload.anfrage_email = form.anfrage_email.trim();
      if (form.hund_rasse.trim()) payload.hund_rasse = form.hund_rasse.trim();
      if (form.hund_groesse) payload.hund_groesse = form.hund_groesse;
      if (form.nachricht.trim()) payload.nachricht = form.nachricht.trim();

      await createPublicRecord(cfg, page, payload);
      setSubmitted(true);
    } catch {
      setSubmitError(tx('Ein Fehler ist aufgetreten. Bitte versuche es erneut.'));
    } finally {
      setSubmitting(false);
    }
  }

  function handleFirstInteraction() {
    if (!cfg || !page) return;
    const ep = page.endpoints?.find(ep => ep.op === 'create');
    if (!ep) return;
    prepareChallenge(cfg, page, 'POST', `/apps/${ep.app_id}/records`);
  }

  if (loadingCfg || (!loadingCfg && !page)) {
    return <PublicShell loading={loadingCfg} unavailable={!loadingCfg && !page} />;
  }

  if (submitted) {
    return (
      <PublicShell title={tx('Buchungsanfrage')} description={tx('Unverbindliche Anfrage für einen Platz in der Pfotenpension')}>
        <div className="flex flex-col items-center gap-6 py-10 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100">
            <IconCheck size={36} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">{tx('Anfrage erfolgreich gesendet!')}</h2>
            <p className="text-muted-foreground max-w-sm">
              {tx('Vielen Dank! Wir haben deine Buchungsanfrage erhalten und melden uns so schnell wie möglich bei dir.')}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/40 px-6 py-4 text-left w-full max-w-sm text-sm space-y-1">
            <p><span className="font-medium">{tx('Name:')}</span> {form.anfrage_vorname} {form.anfrage_nachname}</p>
            <p><span className="font-medium">{tx('Hund:')}</span> {form.hund_name}</p>
            <p><span className="font-medium">{tx('Zeitraum:')}</span> {form.wunsch_anreise} – {form.wunsch_abreise}</p>
          </div>
        </div>
      </PublicShell>
    );
  }

  const stepLabels: Record<Step, string> = {
    1: tx('Kontaktdaten'),
    2: tx('Hundedaten'),
    3: tx('Wunschzeitraum'),
  };

  const inputClass = (field: keyof FormState) =>
    `w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-primary/30 ${
      errors[field] ? 'border-red-500 focus:ring-red-200' : 'border-input focus:border-primary'
    }`;

  return (
    <PublicShell
      title={tx('Buchungsanfrage')}
      description={tx('Unverbindliche Anfrage für einen Platz in der Pfotenpension')}
    >
      {/* Stepper header */}
      <div className="mb-8">
        <div className="flex items-center gap-0">
          {([1, 2, 3] as Step[]).map((s, idx) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                    step === s
                      ? 'bg-primary text-primary-foreground'
                      : step > s
                      ? 'bg-emerald-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step > s ? <IconCheck size={14} /> : s}
                </div>
                <span className={`text-xs hidden sm:block ${step === s ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {stepLabels[s]}
                </span>
              </div>
              {idx < 2 && (
                <div className={`flex-1 h-0.5 mx-2 mb-4 rounded ${step > s ? 'bg-emerald-400' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step label for mobile */}
      <p className="text-sm font-medium text-muted-foreground mb-4 sm:hidden">
        {tx('Schritt')} {step} {tx('von')} 3 — {stepLabels[step]}
      </p>

      <form onSubmit={handleSubmit} onFocus={handleFirstInteraction} noValidate>
        {/* Step 1: Kontaktdaten */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {tx('Vorname')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.anfrage_vorname}
                  onChange={set('anfrage_vorname')}
                  className={inputClass('anfrage_vorname')}
                  autoComplete="given-name"
                />
                {errors.anfrage_vorname && (
                  <p className="text-xs text-red-500 mt-1">{errors.anfrage_vorname}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {tx('Nachname')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.anfrage_nachname}
                  onChange={set('anfrage_nachname')}
                  className={inputClass('anfrage_nachname')}
                  autoComplete="family-name"
                />
                {errors.anfrage_nachname && (
                  <p className="text-xs text-red-500 mt-1">{errors.anfrage_nachname}</p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {tx('Telefon')} <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={form.anfrage_telefon}
                onChange={set('anfrage_telefon')}
                className={inputClass('anfrage_telefon')}
                autoComplete="tel"
              />
              {errors.anfrage_telefon && (
                <p className="text-xs text-red-500 mt-1">{errors.anfrage_telefon}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {tx('E-Mail')}
                <span className="text-muted-foreground text-xs ml-1">({tx('optional')})</span>
              </label>
              <input
                type="email"
                value={form.anfrage_email}
                onChange={set('anfrage_email')}
                className={inputClass('anfrage_email')}
                autoComplete="email"
              />
            </div>
          </div>
        )}

        {/* Step 2: Hundedaten */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {tx('Name des Hundes')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.hund_name}
                onChange={set('hund_name')}
                className={inputClass('hund_name')}
              />
              {errors.hund_name && (
                <p className="text-xs text-red-500 mt-1">{errors.hund_name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {tx('Rasse')}
                <span className="text-muted-foreground text-xs ml-1">({tx('optional')})</span>
              </label>
              <input
                type="text"
                value={form.hund_rasse}
                onChange={set('hund_rasse')}
                className={inputClass('hund_rasse')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {tx('Größe')}
                <span className="text-muted-foreground text-xs ml-1">({tx('optional')})</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2 mt-1">
                {groesseOptions.map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setForm(f => ({ ...f, hund_groesse: f.hund_groesse === opt.key ? '' : opt.key }));
                    }}
                    className={`flex-1 rounded-md border px-3 py-2.5 text-sm text-left transition-colors ${
                      form.hund_groesse === opt.key
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-input hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 shrink-0 transition-colors ${
                        form.hund_groesse === opt.key ? 'border-primary bg-primary' : 'border-muted-foreground/50'
                      }`} />
                      <span>{opt.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Wunschzeitraum */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {tx('Gewünschte Anreise')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.wunsch_anreise}
                  min={today}
                  onChange={set('wunsch_anreise')}
                  className={inputClass('wunsch_anreise')}
                />
                {errors.wunsch_anreise && (
                  <p className="text-xs text-red-500 mt-1">{errors.wunsch_anreise}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {tx('Gewünschte Abreise')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.wunsch_abreise}
                  min={form.wunsch_anreise || today}
                  onChange={set('wunsch_abreise')}
                  className={inputClass('wunsch_abreise')}
                />
                {errors.wunsch_abreise && (
                  <p className="text-xs text-red-500 mt-1">{errors.wunsch_abreise}</p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {tx('Nachricht / Anmerkungen')}
                <span className="text-muted-foreground text-xs ml-1">({tx('optional')})</span>
              </label>
              <textarea
                value={form.nachricht}
                onChange={set('nachricht')}
                rows={4}
                className={`${inputClass('nachricht')} resize-none`}
                placeholder={tx('Besonderheiten, Fragen oder sonstiges …')}
              />
            </div>
            {submitError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {submitError}
              </p>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1.5 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted/60 transition-colors"
            >
              <IconChevronLeft size={16} className="shrink-0" />
              {tx('Zurück')}
            </button>
          ) : (
            <span />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-5 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {tx('Weiter')}
              <IconChevronRight size={16} className="shrink-0" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-6 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              <IconPaw size={16} className="shrink-0" />
              {submitting ? tx('Wird gesendet …') : tx('Anfrage absenden')}
            </button>
          )}
        </div>
      </form>

      {/* Hint */}
      <p className="mt-6 text-xs text-muted-foreground text-center">
        {tx('Diese Anfrage ist unverbindlich. Wir melden uns zur Bestätigung bei dir.')}
      </p>
    </PublicShell>
  );
}
