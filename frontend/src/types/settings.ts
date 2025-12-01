export interface RoomConfig {
  name: string;
  enabled: boolean;
}

export interface RoomSettings {
  [key: string]: RoomConfig;
}

export interface PriceSettings {
  btwHoog: number;
  btwLaag: number;
  uurtarief: number;
}

export interface DisplaySettings {
  companyName: string;
  offertePrefix: string;
}

export interface AIConfig {
  ai_matching_enabled: boolean;
  ai_available: boolean;
  ai_model?: string;
  ai_confidence_threshold: number;
  learning_enabled: boolean;
}

export interface AIStats {
  cache_size: number;
}

export interface AIConfigResponse {
  config: AIConfig;
  stats: AIStats;
}

export interface CorrectionsStats {
  total_corrections: number;
  total_uses: number;
  top_corrections?: Array<{
    opname_text: string;
    frequency: number;
  }>;
  ai_feedback?: {
    total_suggestions: number;
    acceptance_rate: number;
  };
}

export interface CorrectionsExport {
  corrections: Array<{
    opname_text: string;
    opname_eenheid: string;
    chosen_code: string;
    chosen_omschrijving: string;
    original_code: string;
    original_omschrijving: string;
  }>;
  total: number;
}

