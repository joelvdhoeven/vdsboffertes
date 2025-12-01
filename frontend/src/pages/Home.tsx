import { useState, useEffect } from 'react';
import { useOfferteGenerator } from '../hooks/useOfferteGenerator';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import FileUpload from '../components/ui/FileUpload';
import ProgressBar from '../components/ui/ProgressBar';
import StatusMessage from '../components/ui/StatusMessage';
import Badge from '../components/ui/Badge';
import { Upload, FileText, Download, RefreshCw, Bot, ChevronDown, Mic, MicOff } from 'lucide-react';
import type { Match } from '../types/match';

export default function Home() {
  const {
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
  } = useOfferteGenerator();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [showMatches, setShowMatches] = useState(false);

  const {
    isListening,
    transcript: speechTranscript,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: isSpeechSupported,
  } = useSpeechRecognition();

  const handleGenerate = async () => {
    if (inputMode === 'file' && selectedFile) {
      await processOfferte(selectedFile);
    } else if (inputMode === 'text' && textInput.trim().length >= 10) {
      await processOfferte(undefined, textInput);
    }
  };

  // Show matches when they're available
  useEffect(() => {
    if (matches.length > 0) {
      setShowMatches(true);
    }
  }, [matches]);

  // Update text input when speech transcript changes
  useEffect(() => {
    if (speechTranscript) {
      // Remove interim markers and update text
      const cleanedTranscript = speechTranscript.replace(/\s*\[.*?\]\s*/g, '');
      setTextInput(cleanedTranscript);
    }
  }, [speechTranscript]);

  const handleAccept = async () => {
    const url = await acceptAndGenerate();
    if (url) {
      setDownloadUrl(url);
      setShowMatches(false);
    } else {
      setStatus({
        message: 'Fout bij genereren Excel bestand',
        type: 'error',
      });
    }
  };

  const handleMatchChange = async (matchId: string, newCode: string) => {
    await updateMatch(matchId, newCode);
  };

  const handleAISuggestion = async (matchId: string) => {
    await getAISuggestion(matchId);
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.9) {
      return <Badge variant="success">{Math.round(confidence * 100)}% - Hoge zekerheid</Badge>;
    } else if (confidence >= 0.7) {
      return <Badge variant="warning">{Math.round(confidence * 100)}% - Medium</Badge>;
    } else {
      return <Badge variant="danger">{Math.round(confidence * 100)}% - Lage zekerheid</Badge>;
    }
  };

  const getMatchTypeBadge = (matchType: string) => {
    switch (matchType) {
      case 'ai_semantic':
        return <Badge variant="info" className="bg-purple-100 text-purple-700">AI</Badge>;
      case 'learned':
        return <Badge variant="info" className="bg-cyan-100 text-cyan-700">Geleerd</Badge>;
      case 'manual':
        return <Badge variant="default">Handmatig</Badge>;
      default:
        return null;
    }
  };

  const stats = matches.length > 0 ? {
    total: matches.length,
    high: matches.filter((m) => m.confidence >= 0.9).length,
    medium: matches.filter((m) => m.confidence >= 0.7 && m.confidence < 0.9).length,
    low: matches.filter((m) => m.confidence < 0.7).length,
    ai: matches.filter((m) => m.match_type === 'ai_semantic').length,
    learned: matches.filter((m) => m.match_type === 'learned').length,
  } : null;

  if (downloadUrl) {
    return (
      <Card className="text-center">
        <div className="py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <Download className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Offerte Gegenereerd</h2>
          <p className="text-gray-600 mb-6">Je Excel bestand is klaar om te downloaden.</p>
          <a
            href={downloadUrl}
            download
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
          >
            <Download className="w-5 h-5" />
            DOWNLOAD EXCEL
          </a>
          <div className="mt-4">
            <Button variant="secondary" onClick={() => { reset(); setDownloadUrl(null); setSelectedFile(null); setTextInput(''); }}>
              <RefreshCw className="w-4 h-4 mr-2" />
              NIEUWE OFFERTE
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (showMatches && matches.length > 0) {
    return (
      <div className="space-y-6">
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Matches Review</h2>
          
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-500">{stats.total}</div>
                <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">Totaal</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-500">{stats.high}</div>
                <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">Hoge Zekerheid</div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-500">{stats.medium + stats.low}</div>
                <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">Review Nodig</div>
              </div>
              {stats.ai > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-orange-500">{stats.ai}</div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">AI Matches</div>
                </div>
              )}
              {stats.learned > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-orange-500">{stats.learned}</div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">Geleerd</div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4 mb-6">
            {matches.map((match) => (
              <MatchItem
                key={match.id}
                match={match}
                onMatchChange={handleMatchChange}
                onAISuggestion={handleAISuggestion}
                getConfidenceBadge={getConfidenceBadge}
                getMatchTypeBadge={getMatchTypeBadge}
              />
            ))}
          </div>

          <Button variant="primary" onClick={handleAccept} className="w-full" disabled={isProcessing}>
            ACCEPTEER & GENEREER EXCEL
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Offerte Generator</h1>
        <p className="text-gray-600 mb-4">Upload je opname notities om automatisch een offerte te genereren</p>
        <p className="text-sm text-orange-500 mb-6">Het prijzenboek wordt automatisch geladen uit de admin instellingen</p>

        {status && (
          <StatusMessage
            message={status.message}
            type={status.type}
            onClose={() => {}}
          />
        )}

        {/* Input Mode Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => setInputMode('file')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              inputMode === 'file'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            Upload Bestand
          </button>
          <button
            onClick={() => setInputMode('text')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              inputMode === 'text'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Plak Tekst
          </button>
        </div>

        {/* File Upload Mode */}
        {inputMode === 'file' && (
          <div className="mb-6">
            <FileUpload
              accept=".docx,.txt"
              onFileSelect={setSelectedFile}
              label="Samsung Notes Document"
              hint=".docx of .txt bestanden"
            />
          </div>
        )}

        {/* Text Paste Mode */}
        {inputMode === 'text' && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-gray-900">
                Plak je opname notities hieronder of spreek in
              </label>
              {isSpeechSupported && (
                <div className="flex items-center gap-2">
                  {isListening ? (
                    <Button
                      variant="danger"
                      onClick={stopListening}
                      className="text-sm"
                    >
                      <MicOff className="w-4 h-4 mr-1" />
                      Stop Inspreken
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={startListening}
                      className="text-sm"
                      disabled={isProcessing}
                    >
                      <Mic className="w-4 h-4 mr-1" />
                      Start Inspreken
                    </Button>
                  )}
                </div>
              )}
            </div>
            {isListening && (
              <div className="mb-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-orange-700 font-medium">Aan het luisteren...</span>
                </div>
              </div>
            )}
            {speechError && (
              <StatusMessage
                message={speechError}
                type="error"
                onClose={() => {}}
              />
            )}
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="w-full min-h-[200px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Plak hier de tekst van je Samsung Notes of klik op 'Start Inspreken' om te dicteren..."
            />
            {textInput && (
              <div className="mt-2 flex justify-end">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setTextInput('');
                    resetTranscript();
                  }}
                  className="text-xs"
                >
                  Wissen
                </Button>
              </div>
            )}
          </div>
        )}

        <ProgressBar progress={progress} text={progressText} show={isProcessing} />

        <Button
          variant="primary"
          onClick={handleGenerate}
          disabled={
            isProcessing ||
            (inputMode === 'file' && !selectedFile) ||
            (inputMode === 'text' && textInput.trim().length < 10)
          }
          className="w-full"
        >
          GENEREER OFFERTE
        </Button>
      </Card>
    </div>
  );
}

interface MatchItemProps {
  match: Match;
  onMatchChange: (matchId: string, newCode: string) => void;
  onAISuggestion: (matchId: string) => void;
  getConfidenceBadge: (confidence: number) => React.ReactNode;
  getMatchTypeBadge: (matchType: string) => React.ReactNode;
}

function MatchItem({ match, onMatchChange, onAISuggestion, getConfidenceBadge, getMatchTypeBadge }: MatchItemProps) {
  const [showAlternatives, setShowAlternatives] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-orange-500 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{match.ruimte}</span>
          {getMatchTypeBadge(match.match_type)}
        </div>
        {getConfidenceBadge(match.confidence)}
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-xs text-gray-500 uppercase mb-1">Opname</div>
          <div className="text-sm font-medium text-gray-900">
            {match.opname_item.hoeveelheid} {match.opname_item.eenheid} | {match.opname_item.omschrijving}
          </div>
        </div>

        <div className="flex items-center justify-center text-orange-500">
          <ChevronDown className="w-5 h-5" />
        </div>

        <div>
          <div className="text-xs text-gray-500 uppercase mb-1">Prijzenboek Match</div>
          <div className="text-sm font-medium text-gray-900">
            {match.prijzenboek_match.omschrijving} ({match.prijzenboek_match.eenheid})
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Code: {match.prijzenboek_match.code} | €{match.prijzenboek_match.prijs_excl.toFixed(2)} excl. BTW
          </div>
        </div>

        {match.ai_reasoning && (
          <div className="bg-purple-50 border-l-4 border-purple-500 rounded p-3">
            <div className="text-xs font-semibold text-purple-700 uppercase mb-1">AI Uitleg:</div>
            <div className="text-sm text-gray-700">{match.ai_reasoning}</div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {match.alternatives && match.alternatives.length > 0 && (
            <select
              className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              onChange={(e) => {
                if (e.target.value) {
                  onMatchChange(match.id, e.target.value);
                }
              }}
              defaultValue=""
            >
              <option value="">-- Kies andere match --</option>
              {match.alternatives.map((alt) => (
                <option key={alt.code} value={alt.code}>
                  {alt.omschrijving} ({Math.round(alt.score * 100)}%)
                </option>
              ))}
            </select>
          )}

          {match.match_type !== 'ai_semantic' && match.confidence < 0.95 && (
            <Button
              variant="secondary"
              onClick={() => onAISuggestion(match.id)}
              className="text-sm"
            >
              <Bot className="w-4 h-4 mr-1" />
              Vraag AI
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

