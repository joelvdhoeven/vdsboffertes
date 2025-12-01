import { useState, useCallback } from 'react';
import {
  uploadNotes,
  uploadNotesText,
  parseDocuments,
  matchWerkzaamheden,
  generateExcel,
  correctMatch,
  requestAISuggestion,
} from '../services/api';
import type { MatchResult, Match, GenerateRequest } from '../types/match';

type InputMode = 'file' | 'text';

interface UseOfferteGeneratorReturn {
  sessionId: string | null;
  matches: Match[];
  inputMode: InputMode;
  progress: number;
  progressText: string;
  status: { message: string; type: 'success' | 'error' | 'info' } | null;
  isProcessing: boolean;
  setInputMode: (mode: InputMode) => void;
  processOfferte: (file?: File, text?: string) => Promise<void>;
  acceptAndGenerate: () => Promise<string | null>;
  updateMatch: (matchId: string, newCode: string) => Promise<void>;
  getAISuggestion: (matchId: string) => Promise<void>;
  reset: () => void;
}

export function useOfferteGenerator(): UseOfferteGeneratorReturn {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processOfferte = useCallback(async (file?: File, text?: string) => {
    try {
      setIsProcessing(true);
      setProgress(0);
      setProgressText('Verwerken...');
      setStatus(null);

      // Step 1: Upload
      setProgress(25);
      setProgressText('Uploading opname notities...');
      let newSessionId: string;
      
      if (inputMode === 'file' && file) {
        const result = await uploadNotes(file);
        newSessionId = result.session_id;
      } else if (inputMode === 'text' && text) {
        setProgressText('Verwerken tekst...');
        const result = await uploadNotesText(text);
        newSessionId = result.session_id;
      } else {
        throw new Error('Geen bestand of tekst opgegeven');
      }

      setSessionId(newSessionId);

      // Step 2: Parse
      setProgress(50);
      setProgressText('Parseren document...');
      const parseResult = await parseDocuments(newSessionId);
      setStatus({
        message: `Gevonden: ${parseResult.werkzaamheden} werkzaamheden in ${parseResult.ruimtes} ruimtes`,
        type: 'info',
      });

      // Step 3: Match
      setProgress(75);
      setProgressText('Matching werkzaamheden met prijzenboek...');
      const matchResult = await matchWerkzaamheden(newSessionId);
      setMatches(matchResult.matches);

      setProgress(100);
      setProgressText('Klaar!');
      setTimeout(() => {
        setProgress(0);
        setProgressText('');
      }, 500);
    } catch (error) {
      setStatus({
        message: `Fout: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
        type: 'error',
      });
      setProgress(0);
      setProgressText('');
    } finally {
      setIsProcessing(false);
    }
  }, [inputMode]);

  const acceptAndGenerate = useCallback(async (): Promise<string | null> => {
    if (!sessionId) return null;

    try {
      setIsProcessing(true);
      setProgress(50);
      setProgressText('Genereren Excel bestand...');

      const request: GenerateRequest = {
        session_id: sessionId,
        matches: [],
      };

      const result = await generateExcel(request);
      setProgress(100);
      setProgressText('Klaar!');

      const apiBase = (window as any).API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      return `${apiBase}${result.download_url}`;
    } catch (error) {
      setStatus({
        message: `Fout bij genereren Excel: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
        type: 'error',
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [sessionId]);

  const updateMatch = useCallback(async (matchId: string, newCode: string) => {
    if (!sessionId) return;

    try {
      const result = await correctMatch(sessionId, matchId, newCode, true);
      setMatches((prev) =>
        prev.map((m) => (m.id === matchId ? result.match : m))
      );
      setStatus({
        message: result.correction_saved
          ? 'Match bijgewerkt en opgeslagen voor toekomstig leren'
          : 'Match bijgewerkt',
        type: 'success',
      });
    } catch (error) {
      setStatus({
        message: `Fout bij bijwerken match: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
        type: 'error',
      });
    }
  }, [sessionId]);

  const getAISuggestion = useCallback(async (matchId: string) => {
    if (!sessionId) return;

    try {
      const result = await requestAISuggestion(sessionId, matchId);
      // Update match with AI suggestion
      const updatedMatch = matches.find((m) => m.id === matchId);
      if (updatedMatch) {
        updatedMatch.prijzenboek_match = {
          ...updatedMatch.prijzenboek_match,
          code: result.ai_suggestion.code,
          omschrijving: result.ai_suggestion.omschrijving,
        };
        updatedMatch.ai_reasoning = result.ai_suggestion.reasoning;
        updatedMatch.match_type = 'ai_semantic';
        setMatches((prev) => prev.map((m) => (m.id === matchId ? updatedMatch : m)));
      }
    } catch (error) {
      setStatus({
        message: `Fout bij AI suggestie: ${error instanceof Error ? error.message : 'Onbekende fout'}`,
        type: 'error',
      });
    }
  }, [sessionId, matches]);

  const reset = useCallback(() => {
    setSessionId(null);
    setMatches([]);
    setProgress(0);
    setProgressText('');
    setStatus(null);
    setIsProcessing(false);
  }, []);

  return {
    sessionId,
    matches,
    inputMode,
    progress,
    progressText,
    status,
    isProcessing,
    setInputMode,
    processOfferte,
    acceptAndGenerate,
    updateMatch,
    getAISuggestion,
    reset,
  };
}

