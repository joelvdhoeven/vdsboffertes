import { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useHeaderActions } from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatusMessage from '../components/ui/StatusMessage';
import { Save, RefreshCw, Trash2, Download } from 'lucide-react';

export default function Settings() {
  const { setActions } = useHeaderActions();
  const {
    rooms,
    prices,
    display,
    aiConfig,
    correctionsStats,
    isLoading,
    updateRoom,
    updatePrices,
    updateDisplay,
    saveRooms,
    savePrices,
    saveDisplay,
    saveAll,
    resetRooms,
    refreshAIStatus,
    clearCache,
    exportCorrectionsData,
  } = useSettings();

  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [localRooms, setLocalRooms] = useState(rooms);
  const [localPrices, setLocalPrices] = useState(prices);
  const [localDisplay, setLocalDisplay] = useState(display);

  const handleSaveRooms = () => {
    Object.keys(localRooms).forEach((key) => {
      updateRoom(key, localRooms[key]);
    });
    saveRooms();
    setStatus({ message: 'Ruimte instellingen opgeslagen!', type: 'success' });
  };

  const handleSavePrices = () => {
    updatePrices(localPrices);
    savePrices();
    setStatus({ message: 'Prijs instellingen opgeslagen!', type: 'success' });
  };

  const handleSaveDisplay = () => {
    updateDisplay(localDisplay);
    saveDisplay();
    setStatus({ message: 'Weergave instellingen opgeslagen!', type: 'success' });
  };

  const handleSaveAll = () => {
    handleSaveRooms();
    handleSavePrices();
    handleSaveDisplay();
    setStatus({ message: 'Alle instellingen zijn opgeslagen!', type: 'success' });
  };

  const handleResetRooms = () => {
    if (confirm('Weet je zeker dat je alle ruimte-instellingen wilt resetten naar standaard?')) {
      resetRooms();
      setLocalRooms(rooms);
      setStatus({ message: 'Ruimte instellingen hersteld naar standaard', type: 'success' });
    }
  };

  const handleClearCache = async () => {
    if (!confirm('Weet je zeker dat je de AI cache wilt wissen?')) return;
    try {
      await clearCache();
      setStatus({ message: 'AI cache gewist!', type: 'success' });
    } catch (error) {
      setStatus({ message: `Fout: ${error instanceof Error ? error.message : 'Onbekende fout'}`, type: 'error' });
    }
  };

  const handleExportCorrections = async () => {
    try {
      await exportCorrectionsData();
      setStatus({ message: 'Correcties geëxporteerd!', type: 'success' });
    } catch (error) {
      setStatus({ message: `Fout: ${error instanceof Error ? error.message : 'Onbekende fout'}`, type: 'error' });
    }
  };

  useEffect(() => {
    const saveAllHandler = () => {
      handleSaveRooms();
      handleSavePrices();
      handleSaveDisplay();
      setStatus({ message: 'Alle instellingen zijn opgeslagen!', type: 'success' });
    };

    setActions(
      <Button variant="success" onClick={saveAllHandler}>
        <Save className="w-4 h-4 mr-2" />
        Alles Opslaan
      </Button>
    );
    return () => setActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setActions]);

  return (
    <div className="space-y-6">
      {status && (
        <StatusMessage
          message={status.message}
          type={status.type}
          onClose={() => setStatus(null)}
        />
      )}

      {/* Room Configuration */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ruimte Configuratie</h2>
        <p className="text-sm text-gray-600 mb-4">
          Pas de weergavenamen van ruimtes aan en schakel ruimtes in/uit voor gebruik in offertes.
        </p>

        <div className="space-y-3 mb-6">
          {Object.entries(localRooms).map(([key, config]) => (
            <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="font-mono text-xs text-gray-500 bg-white px-2 py-1 rounded">{key}</div>
              <input
                type="text"
                value={config.name}
                onChange={(e) =>
                  setLocalRooms({ ...localRooms, [key]: { ...config, name: e.target.value } })
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) =>
                      setLocalRooms({ ...localRooms, [key]: { ...config, enabled: e.target.checked } })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-700"></div>
                  <span className="ml-3 text-sm text-gray-600">Actief</span>
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="primary" onClick={handleSaveRooms}>
            <Save className="w-4 h-4 mr-2" />
            Ruimtes Opslaan
          </Button>
          <Button variant="secondary" onClick={handleResetRooms}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Standaard Herstellen
          </Button>
        </div>
      </Card>

      {/* Price Settings */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Prijs Instellingen</h2>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              BTW Percentage (Hoog Tarief)
            </label>
            <p className="text-xs text-gray-600 mb-2">Standaard BTW tarief voor materialen en arbeid</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={localPrices.btwHoog}
                onChange={(e) => setLocalPrices({ ...localPrices, btwHoog: parseFloat(e.target.value) || 0 })}
                min="0"
                max="100"
                step="0.1"
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              <span className="text-gray-600">%</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              BTW Percentage (Laag Tarief)
            </label>
            <p className="text-xs text-gray-600 mb-2">Verlaagd BTW tarief voor bepaalde werkzaamheden</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={localPrices.btwLaag}
                onChange={(e) => setLocalPrices({ ...localPrices, btwLaag: parseFloat(e.target.value) || 0 })}
                min="0"
                max="100"
                step="0.1"
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              <span className="text-gray-600">%</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Uurtarief (excl. BTW)
            </label>
            <p className="text-xs text-gray-600 mb-2">Standaard uurtarief voor berekeningen</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={localPrices.uurtarief}
                onChange={(e) => setLocalPrices({ ...localPrices, uurtarief: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.50"
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              <span className="text-gray-600">€ / uur</span>
            </div>
          </div>
        </div>

        <Button variant="primary" onClick={handleSavePrices}>
          <Save className="w-4 h-4 mr-2" />
          Prijs Instellingen Opslaan
        </Button>
      </Card>

      {/* Display Settings */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Weergave Instellingen</h2>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">Bedrijfsnaam</label>
            <p className="text-xs text-gray-600 mb-2">Naam die wordt weergegeven in offertes</p>
            <input
              type="text"
              value={localDisplay.companyName}
              onChange={(e) => setLocalDisplay({ ...localDisplay, companyName: e.target.value })}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">Offerte Prefix</label>
            <p className="text-xs text-gray-600 mb-2">Voorvoegsel voor offertenummers (bijv. OFF-2024-001)</p>
            <input
              type="text"
              value={localDisplay.offertePrefix}
              onChange={(e) => setLocalDisplay({ ...localDisplay, offertePrefix: e.target.value })}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>

        <Button variant="primary" onClick={handleSaveDisplay}>
          <Save className="w-4 h-4 mr-2" />
          Weergave Opslaan
        </Button>
      </Card>

      {/* AI Matching Settings */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Matching Instellingen</h2>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">AI Status</label>
            <p className="text-xs text-gray-600 mb-2">Huidige status van AI matching</p>
            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              {aiConfig ? (
                <div className="space-y-2">
                  <div>
                    <strong>AI Matching:</strong>{' '}
                    {aiConfig.config.ai_matching_enabled ? '✅ Ingeschakeld' : '❌ Uitgeschakeld'}
                  </div>
                  <div>
                    <strong>API Beschikbaar:</strong>{' '}
                    {aiConfig.config.ai_available ? '✅ Ja' : '❌ Nee (API key niet geconfigureerd)'}
                  </div>
                  <div>
                    <strong>Model:</strong> {aiConfig.config.ai_model || 'Niet ingesteld'}
                  </div>
                  <div>
                    <strong>Confidence Drempel:</strong>{' '}
                    {Math.round((aiConfig.config.ai_confidence_threshold || 0.7) * 100)}%
                  </div>
                  <div>
                    <strong>Cache Items:</strong> {aiConfig.stats.cache_size || 0}
                  </div>
                  <div>
                    <strong>Learning:</strong>{' '}
                    {aiConfig.config.learning_enabled ? '✅ Ingeschakeld' : '❌ Uitgeschakeld'}
                  </div>
                </div>
              ) : (
                <div>Laden...</div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">Geleerde Correcties</label>
            <p className="text-xs text-gray-600 mb-2">Statistieken over geleerde correcties</p>
            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              {correctionsStats ? (
                <div className="space-y-2">
                  <div>
                    <strong>Totaal Correcties:</strong> {correctionsStats.total_corrections || 0}
                  </div>
                  <div>
                    <strong>Totaal Keer Gebruikt:</strong> {correctionsStats.total_uses || 0}
                  </div>
                  {correctionsStats.top_corrections && correctionsStats.top_corrections.length > 0 && (
                    <div>
                      <strong>Meest Gecorrigeerd:</strong>{' '}
                      {correctionsStats.top_corrections[0].opname_text} (
                      {correctionsStats.top_corrections[0].frequency}x)
                    </div>
                  )}
                  {correctionsStats.ai_feedback && (
                    <div>
                      <strong>AI Feedback:</strong> {correctionsStats.ai_feedback.total_suggestions} suggesties (
                      {Math.round(correctionsStats.ai_feedback.acceptance_rate || 0)}% geaccepteerd)
                    </div>
                  )}
                </div>
              ) : (
                <div>Laden...</div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="primary" onClick={refreshAIStatus} disabled={isLoading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Status Vernieuwen
          </Button>
          <Button variant="secondary" onClick={handleClearCache} disabled={isLoading}>
            <Trash2 className="w-4 h-4 mr-2" />
            Cache Wissen
          </Button>
          <Button variant="secondary" onClick={handleExportCorrections} disabled={isLoading}>
            <Download className="w-4 h-4 mr-2" />
            Exporteer Correcties
          </Button>
        </div>
      </Card>

      {/* Save All Button */}
      <div className="flex justify-end">
        <Button variant="success" onClick={handleSaveAll}>
          <Save className="w-4 h-4 mr-2" />
          Alles Opslaan
        </Button>
      </div>
    </div>
  );
}

