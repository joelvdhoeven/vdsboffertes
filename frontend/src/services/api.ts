import type {
  UploadNotesResponse,
  UploadNotesTextResponse,
  UploadPrijzenboekResponse,
  SessionStatus,
  ParseResult,
  MatchResult,
  GenerateRequest,
  GenerateResponse,
  AISuggestionResponse,
} from '../types/session';
import type {
  PrijzenboekResponse,
  PrijzenboekSaveRequest,
  PrijzenboekSaveResponse,
  PrijzenboekUploadResponse,
} from '../types/prijzenboek';
import type { AIConfigResponse, CorrectionsStats, CorrectionsExport } from '../types/settings';
import type { Match } from '../types/match';

const API_BASE_URL = (window as any).API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Make API_BASE_URL available globally for compatibility
if (typeof window !== 'undefined') {
  (window as any).API_BASE_URL = API_BASE_URL;
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Session & Upload APIs
export const uploadNotes = async (file: File): Promise<UploadNotesResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  return fetchAPI<UploadNotesResponse>('/api/upload/notes', {
    method: 'POST',
    body: formData,
  });
};

export const uploadNotesText = async (text: string): Promise<UploadNotesTextResponse> => {
  return fetchAPI<UploadNotesTextResponse>('/api/upload/notes-text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });
};

export const uploadPrijzenboek = async (sessionId: string, file: File): Promise<UploadPrijzenboekResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  return fetchAPI<UploadPrijzenboekResponse>(`/api/upload/prijzenboek?session_id=${sessionId}`, {
    method: 'POST',
    body: formData,
  });
};

export const getSessionStatus = async (sessionId: string): Promise<SessionStatus> => {
  return fetchAPI<SessionStatus>(`/api/session/${sessionId}/status`);
};

// Processing APIs
export const parseDocuments = async (sessionId: string): Promise<ParseResult> => {
  return fetchAPI<ParseResult>(`/api/process/parse?session_id=${sessionId}`, {
    method: 'POST',
  });
};

export const matchWerkzaamheden = async (sessionId: string): Promise<MatchResult> => {
  return fetchAPI<MatchResult>(`/api/process/match?session_id=${sessionId}`, {
    method: 'POST',
  });
};

export const generateExcel = async (request: GenerateRequest): Promise<GenerateResponse> => {
  return fetchAPI<GenerateResponse>('/api/generate/excel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
};

// Match APIs
export const updateMatch = async (
  sessionId: string,
  matchId: string,
  prijzenboekCode: string
): Promise<{ success: boolean; match: Match }> => {
  return fetchAPI<{ success: boolean; match: Match }>(
    `/api/matches/update?session_id=${sessionId}&match_id=${matchId}&prijzenboek_code=${prijzenboekCode}`,
    {
      method: 'POST',
    }
  );
};

export const requestAISuggestion = async (sessionId: string, matchId: string): Promise<AISuggestionResponse> => {
  return fetchAPI<AISuggestionResponse>(`/api/matches/${matchId}/ai-suggest?session_id=${sessionId}`, {
    method: 'POST',
  });
};

export const correctMatch = async (
  sessionId: string,
  matchId: string,
  newCode: string,
  saveCorrection: boolean = true
): Promise<{ success: boolean; match: Match; correction_saved: boolean; message: string }> => {
  return fetchAPI<{ success: boolean; match: Match; correction_saved: boolean; message: string }>(
    `/api/matches/${matchId}/correct?session_id=${sessionId}&new_code=${newCode}&save_correction=${saveCorrection}`,
    {
      method: 'POST',
    }
  );
};

// Admin APIs
export const getPrijzenboek = async (): Promise<PrijzenboekResponse> => {
  return fetchAPI<PrijzenboekResponse>('/api/admin/prijzenboek');
};

export const savePrijzenboek = async (data: PrijzenboekSaveRequest): Promise<PrijzenboekSaveResponse> => {
  return fetchAPI<PrijzenboekSaveResponse>('/api/admin/prijzenboek', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
};

export const addPrijzenboekItem = async (item: any): Promise<{ success: boolean; action: string; code: string; message: string }> => {
  return fetchAPI<{ success: boolean; action: string; code: string; message: string }>('/api/admin/prijzenboek/item', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(item),
  });
};

export const deletePrijzenboekItem = async (code: string): Promise<{ success: boolean; message: string }> => {
  return fetchAPI<{ success: boolean; message: string }>(`/api/admin/prijzenboek/item/${code}`, {
    method: 'DELETE',
  });
};

export const uploadPrijzenboekAdmin = async (file: File, locale: 'nl' | 'en' = 'nl'): Promise<PrijzenboekUploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('locale', locale);
  return fetchAPI<PrijzenboekUploadResponse>('/api/admin/prijzenboek/upload', {
    method: 'POST',
    body: formData,
  });
};

export const clearAllPrijzenboekItems = async (): Promise<{ success: boolean; message: string; items_deleted: number }> => {
  return fetchAPI<{ success: boolean; message: string; items_deleted: number }>('/api/admin/prijzenboek/clear-all', {
    method: 'DELETE',
  });
};

// Settings & AI APIs
export const getAIConfig = async (): Promise<AIConfigResponse> => {
  return fetchAPI<AIConfigResponse>('/api/ai/config');
};

export const clearAICache = async (): Promise<{ success: boolean; message: string }> => {
  return fetchAPI<{ success: boolean; message: string }>('/api/ai/clear-cache', {
    method: 'POST',
  });
};

export const getCorrectionsStats = async (): Promise<CorrectionsStats> => {
  return fetchAPI<CorrectionsStats>('/api/corrections/stats');
};

export const exportCorrections = async (): Promise<CorrectionsExport> => {
  return fetchAPI<CorrectionsExport>('/api/corrections/export');
};

export const addCorrection = async (data: {
  opname_text: string;
  opname_eenheid: string;
  chosen_code: string;
  chosen_omschrijving: string;
  original_code?: string;
  original_omschrijving?: string;
}): Promise<{ success: boolean; action: string; message: string }> => {
  return fetchAPI<{ success: boolean; action: string; message: string }>('/api/corrections/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
};

export default {
  uploadNotes,
  uploadNotesText,
  uploadPrijzenboek,
  getSessionStatus,
  parseDocuments,
  matchWerkzaamheden,
  generateExcel,
  updateMatch,
  requestAISuggestion,
  correctMatch,
  getPrijzenboek,
  savePrijzenboek,
  addPrijzenboekItem,
  deletePrijzenboekItem,
  uploadPrijzenboekAdmin,
  clearAllPrijzenboekItems,
  getAIConfig,
  clearAICache,
  getCorrectionsStats,
  exportCorrections,
  addCorrection,
};

