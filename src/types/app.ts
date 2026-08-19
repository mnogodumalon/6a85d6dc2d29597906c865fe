import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Besitzer {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    telefon?: string;
    email?: string;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    notizen?: string;
  };
}

export interface Hunde {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    name?: string;
    rasse?: string;
    geburtsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    geschlecht?: LookupValue;
    gewicht_kg?: number;
    kastriert?: boolean;
    impfstatus?: LookupValue;
    gesundheitshinweise?: string;
    tierarzt?: string;
    besitzer?: string; // applookup -> URL zu 'Besitzer' Record
  };
}

export interface Aufenthalte {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    hund?: string; // applookup -> URL zu 'Hunde' Record
    besitzer?: string; // applookup -> URL zu 'Besitzer' Record
    anreise?: string; // Format: YYYY-MM-DD oder ISO String
    abreise?: string; // Format: YYYY-MM-DD oder ISO String
    platznummer?: LookupValue;
    status?: LookupValue;
    preis?: number;
    notizen?: string;
  };
}

export interface Buchungsanfragen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    anfrage_vorname?: string;
    anfrage_nachname?: string;
    anfrage_telefon?: string;
    anfrage_email?: string;
    hund_name?: string;
    hund_rasse?: string;
    hund_groesse?: LookupValue;
    wunsch_anreise?: string; // Format: YYYY-MM-DD oder ISO String
    wunsch_abreise?: string; // Format: YYYY-MM-DD oder ISO String
    nachricht?: string;
    status?: LookupValue;
  };
}

export interface PfotenPortraet {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    besitzer?: string; // applookup -> URL zu 'Besitzer' Record
    hund?: string; // applookup -> URL zu 'Hunde' Record
    titel?: string;
    widmung?: string;
    erlebnisse?: string;
    foto?: string;
    erstellungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
  };
}

export interface Website {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    unternehmensname?: string;
    slogan?: string;
    beschreibung?: string;
    anzahl_plaetze?: number;
    logo?: string;
    leistungen?: string;
    usps?: string;
    oeffnungszeiten?: string;
    kontakt_telefon?: string;
    kontakt_email?: string;
    website_url?: string;
    kontakt_strasse?: string;
    kontakt_hausnummer?: string;
    kontakt_plz?: string;
    kontakt_ort?: string;
  };
}

export const APP_IDS = {
  BESITZER: '6a85d6ae7a3982ed83f8b89b',
  HUNDE: '6a85d6b4c6fdd6eb1663710d',
  AUFENTHALTE: '6a85d6b5cf47d30c25f0f857',
  BUCHUNGSANFRAGEN: '6a85d6b569539e005500f1ab',
  PFOTEN_PORTRAET: '6a85d6b6b46d6f44a590e899',
  WEBSITE: '6a85d6b7d87fecb1657fb8ee',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'hunde': {
    geschlecht: [{ key: "maennlich", get label() { return lookupLabel('hunde', 'geschlecht', "maennlich") ?? "Männlich"; } }, { key: "weiblich", get label() { return lookupLabel('hunde', 'geschlecht', "weiblich") ?? "Weiblich"; } }, { key: "unbekannt", get label() { return lookupLabel('hunde', 'geschlecht', "unbekannt") ?? "Unbekannt"; } }],
    impfstatus: [{ key: "vollstaendig", get label() { return lookupLabel('hunde', 'impfstatus', "vollstaendig") ?? "Vollständig geimpft"; } }, { key: "teilweise", get label() { return lookupLabel('hunde', 'impfstatus', "teilweise") ?? "Teilweise geimpft"; } }, { key: "nicht_geimpft", get label() { return lookupLabel('hunde', 'impfstatus', "nicht_geimpft") ?? "Nicht geimpft"; } }, { key: "unbekannt", get label() { return lookupLabel('hunde', 'impfstatus', "unbekannt") ?? "Unbekannt"; } }],
  },
  'aufenthalte': {
    platznummer: [{ key: "platz_1", get label() { return lookupLabel('aufenthalte', 'platznummer', "platz_1") ?? "Platz 1"; } }, { key: "platz_2", get label() { return lookupLabel('aufenthalte', 'platznummer', "platz_2") ?? "Platz 2"; } }, { key: "platz_3", get label() { return lookupLabel('aufenthalte', 'platznummer', "platz_3") ?? "Platz 3"; } }, { key: "platz_4", get label() { return lookupLabel('aufenthalte', 'platznummer', "platz_4") ?? "Platz 4"; } }, { key: "platz_5", get label() { return lookupLabel('aufenthalte', 'platznummer', "platz_5") ?? "Platz 5"; } }, { key: "platz_6", get label() { return lookupLabel('aufenthalte', 'platznummer', "platz_6") ?? "Platz 6"; } }, { key: "platz_7", get label() { return lookupLabel('aufenthalte', 'platznummer', "platz_7") ?? "Platz 7"; } }, { key: "platz_8", get label() { return lookupLabel('aufenthalte', 'platznummer', "platz_8") ?? "Platz 8"; } }, { key: "platz_9", get label() { return lookupLabel('aufenthalte', 'platznummer', "platz_9") ?? "Platz 9"; } }, { key: "platz_10", get label() { return lookupLabel('aufenthalte', 'platznummer', "platz_10") ?? "Platz 10"; } }, { key: "platz_11", get label() { return lookupLabel('aufenthalte', 'platznummer', "platz_11") ?? "Platz 11"; } }, { key: "platz_12", get label() { return lookupLabel('aufenthalte', 'platznummer', "platz_12") ?? "Platz 12"; } }],
    status: [{ key: "geplant", get label() { return lookupLabel('aufenthalte', 'status', "geplant") ?? "Geplant"; } }, { key: "anwesend", get label() { return lookupLabel('aufenthalte', 'status', "anwesend") ?? "Anwesend"; } }, { key: "abgereist", get label() { return lookupLabel('aufenthalte', 'status', "abgereist") ?? "Abgereist"; } }, { key: "storniert", get label() { return lookupLabel('aufenthalte', 'status', "storniert") ?? "Storniert"; } }],
  },
  'buchungsanfragen': {
    hund_groesse: [{ key: "klein", get label() { return lookupLabel('buchungsanfragen', 'hund_groesse', "klein") ?? "Klein (bis 10 kg)"; } }, { key: "mittel", get label() { return lookupLabel('buchungsanfragen', 'hund_groesse', "mittel") ?? "Mittel (10–25 kg)"; } }, { key: "gross", get label() { return lookupLabel('buchungsanfragen', 'hund_groesse', "gross") ?? "Groß (über 25 kg)"; } }],
    status: [{ key: "neu", get label() { return lookupLabel('buchungsanfragen', 'status', "neu") ?? "Neu"; } }, { key: "bestaetigt", get label() { return lookupLabel('buchungsanfragen', 'status', "bestaetigt") ?? "Bestätigt"; } }, { key: "abgelehnt", get label() { return lookupLabel('buchungsanfragen', 'status', "abgelehnt") ?? "Abgelehnt"; } }, { key: "umgewandelt", get label() { return lookupLabel('buchungsanfragen', 'status', "umgewandelt") ?? "In Aufenthalt umgewandelt"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'besitzer': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'telefon': 'string/tel',
    'email': 'string/email',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
    'notizen': 'string/textarea',
  },
  'hunde': {
    'name': 'string/text',
    'rasse': 'string/text',
    'geburtsdatum': 'date/date',
    'geschlecht': 'lookup/radio',
    'gewicht_kg': 'number',
    'kastriert': 'bool',
    'impfstatus': 'lookup/select',
    'gesundheitshinweise': 'string/textarea',
    'tierarzt': 'string/text',
    'besitzer': 'applookup/select',
  },
  'aufenthalte': {
    'hund': 'applookup/select',
    'besitzer': 'applookup/select',
    'anreise': 'date/date',
    'abreise': 'date/date',
    'platznummer': 'lookup/select',
    'status': 'lookup/radio',
    'preis': 'number',
    'notizen': 'string/textarea',
  },
  'buchungsanfragen': {
    'anfrage_vorname': 'string/text',
    'anfrage_nachname': 'string/text',
    'anfrage_telefon': 'string/tel',
    'anfrage_email': 'string/email',
    'hund_name': 'string/text',
    'hund_rasse': 'string/text',
    'hund_groesse': 'lookup/radio',
    'wunsch_anreise': 'date/date',
    'wunsch_abreise': 'date/date',
    'nachricht': 'string/textarea',
    'status': 'lookup/select',
  },
  'pfoten_portraet': {
    'besitzer': 'applookup/select',
    'hund': 'applookup/select',
    'titel': 'string/text',
    'widmung': 'string/textarea',
    'erlebnisse': 'string/textarea',
    'foto': 'file',
    'erstellungsdatum': 'date/date',
  },
  'website': {
    'unternehmensname': 'string/text',
    'slogan': 'string/text',
    'beschreibung': 'string/textarea',
    'anzahl_plaetze': 'number',
    'logo': 'file',
    'leistungen': 'string/textarea',
    'usps': 'string/textarea',
    'oeffnungszeiten': 'string/textarea',
    'kontakt_telefon': 'string/tel',
    'kontakt_email': 'string/email',
    'website_url': 'string/url',
    'kontakt_strasse': 'string/text',
    'kontakt_hausnummer': 'string/text',
    'kontakt_plz': 'string/text',
    'kontakt_ort': 'string/text',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
  'besitzer': [
    { field: 'besitzer', entity: 'hunde' },
    { field: 'besitzer', entity: 'aufenthalte' },
    { field: 'besitzer', entity: 'pfoten_portraet' },
  ],
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateBesitzer = StripLookup<Besitzer['fields']>;
export type CreateHunde = StripLookup<Hunde['fields']>;
export type CreateAufenthalte = StripLookup<Aufenthalte['fields']>;
export type CreateBuchungsanfragen = StripLookup<Buchungsanfragen['fields']>;
export type CreatePfotenPortraet = StripLookup<PfotenPortraet['fields']>;
export type CreateWebsite = StripLookup<Website['fields']>;