export interface OpnameItem {
  omschrijving: string;
  hoeveelheid: number;
  eenheid: string;
}

export interface PrijzenboekItem {
  code: string;
  omschrijving: string;
  omschrijving_offerte?: string;
  eenheid: string;
  materiaal: number;
  uren: number;
  prijs_per_stuk: number;
  prijs_excl: number;
  prijs_incl: number;
  row_num?: number;
}

export interface Alternative {
  code: string;
  omschrijving: string;
  eenheid: string;
  score: number;
}

export interface Match {
  id: string;
  ruimte: string;
  opname_item: OpnameItem;
  prijzenboek_match: PrijzenboekItem;
  confidence: number;
  match_type: 'ai_semantic' | 'learned' | 'manual' | 'fuzzy';
  ai_reasoning?: string;
  alternatives?: Alternative[];
}

export interface MatchResult {
  session_id: string;
  total_matches: number;
  high_confidence: number;
  medium_confidence: number;
  low_confidence: number;
  matches: Match[];
}

export interface ParseResult {
  session_id: string;
  parsed: boolean;
  ruimtes: number;
  werkzaamheden: number;
  prijzenboek_items: number;
}

export interface GenerateRequest {
  session_id: string;
  matches: MatchReview[];
}

export interface MatchReview {
  werkzaamheid_id: string;
  prijzenboek_code: string;
  accepted: boolean;
}

export interface GenerateResponse {
  success: boolean;
  file_path: string;
  download_url: string;
}

export interface AISuggestion {
  code: string;
  omschrijving: string;
  eenheid: string;
  prijs_per_stuk: number;
  confidence: number;
  reasoning: string;
}

export interface AISuggestionResponse {
  success: boolean;
  match_id: string;
  ai_suggestion: AISuggestion;
  current_match: {
    code: string;
    omschrijving: string;
  };
  alternatives: Alternative[];
}

