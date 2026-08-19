import type { Aufenthalte, Hunde, PfotenPortraet } from './app';

export type EnrichedHunde = Hunde & {
  besitzerName: string;
};

export type EnrichedAufenthalte = Aufenthalte & {
  hundName: string;
  besitzerName: string;
};

export type EnrichedPfotenPortraet = PfotenPortraet & {
  besitzerName: string;
  hundName: string;
};
