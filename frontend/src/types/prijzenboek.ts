export interface PrijzenboekItem {
  code: string;
  omschrijving: string;
  omschrijving_offerte?: string;
  eenheid: string;
  materiaal: number;
  uren: number;
  prijs_per_stuk: number;
  totaal_excl?: number;
  totaal_incl?: number;
  row_num?: number;
  // Room-specific fields
  algemeen_woning?: number;
  hal_overloop?: number;
  woonkamer?: number;
  keuken?: number;
  toilet?: number;
  badkamer?: number;
  slaapk_voor_kl?: number;
  slaapk_voor_gr?: number;
  slaapk_achter_kl?: number;
  slaapk_achter_gr?: number;
  zolder?: number;
  berging?: number;
  meerwerk?: number;
  totaal?: number;
}

export interface PrijzenboekResponse {
  items: PrijzenboekItem[];
  total: number;
}

export interface PrijzenboekSaveRequest {
  items: PrijzenboekItem[];
}

export interface PrijzenboekSaveResponse {
  success: boolean;
  message: string;
  items_saved: number;
  added: number;
  updated: number;
}

export interface PrijzenboekUploadResponse {
  success: boolean;
  message: string;
  items_loaded: number;
  filename: string;
  locale: string;
}

