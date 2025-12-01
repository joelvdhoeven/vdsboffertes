import { useState, useRef, useEffect } from 'react';
import { usePrijzenboek } from '../hooks/usePrijzenboek';
import { useHeaderActions } from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import StatusMessage from '../components/ui/StatusMessage';
import FileUpload from '../components/ui/FileUpload';
import { Plus, Upload, Download, RefreshCw, Trash2, Save, Search } from 'lucide-react';
import type { PrijzenboekItem } from '../types/prijzenboek';

export default function Admin() {
  const { setActions } = useHeaderActions();
  const {
    filteredItems,
    currentPage,
    itemsPerPage,
    totalPages,
    searchQuery,
    selectedItems,
    isLoading,
    error,
    setSearchQuery,
    setCurrentPage,
    setItemsPerPage,
    toggleItemSelection,
    toggleSelectAll,
    clearSelection,
    loadPrijzenboek,
    saveItems,
    addItem,
    deleteItem,
    deleteSelectedItems,
    uploadFile,
  } = usePrijzenboek();

  const [showAddModal, setShowAddModal] = useState(false);
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [uploadLocale, setUploadLocale] = useState<'nl' | 'en'>('nl');
  const [uploadFileState, setUploadFileState] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageItems = filteredItems.slice(startIndex, endIndex);
  const allPageItemsSelected = pageItems.length > 0 && pageItems.every((item) => selectedItems.has(item.code));

  const handleSave = async () => {
    try {
      await saveItems();
      setStatus({ message: 'Prijzenboek opgeslagen!', type: 'success' });
    } catch (err) {
      setStatus({ message: `Fout: ${err instanceof Error ? err.message : 'Onbekende fout'}`, type: 'error' });
    }
  };

  const handleUpload = async () => {
    if (!uploadFileState) return;
    try {
      await uploadFile(uploadFileState, uploadLocale);
      setStatus({ message: 'Prijzenboek geüpload!', type: 'success' });
      setUploadFileState(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setStatus({ message: `Fout: ${err instanceof Error ? err.message : 'Onbekende fout'}`, type: 'error' });
    }
  };

  const handleAddItem = async (item: PrijzenboekItem) => {
    try {
      await addItem(item);
      setShowAddModal(false);
      setStatus({ message: 'Item toegevoegd!', type: 'success' });
    } catch (err) {
      setStatus({ message: `Fout: ${err instanceof Error ? err.message : 'Onbekende fout'}`, type: 'error' });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Weet je zeker dat je ${selectedItems.size} item(s) wilt verwijderen?`)) return;
    try {
      await deleteSelectedItems();
      setStatus({ message: `${selectedItems.size} item(s) verwijderd!`, type: 'success' });
    } catch (err) {
      setStatus({ message: `Fout: ${err instanceof Error ? err.message : 'Onbekende fout'}`, type: 'error' });
    }
  };

  useEffect(() => {
    setActions(
      <Button variant="primary" onClick={() => setShowAddModal(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Nieuwe Regel
      </Button>
    );
    return () => setActions(null);
  }, [setActions]);

  const stats = {
    total: filteredItems.length,
    rooms: 13,
  };

  return (
    <div className="space-y-6">
      {status && (
        <StatusMessage
          message={status.message}
          type={status.type}
          onClose={() => setStatus(null)}
        />
      )}

      {/* Upload Section */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Prijzenboek Importeren</h3>
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <select
            value={uploadLocale}
            onChange={(e) => setUploadLocale(e.target.value as 'nl' | 'en')}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="nl">NL Excel (decimaal: komma)</option>
            <option value="en">EN Excel (decimaal: punt)</option>
          </select>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xlsm,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setUploadFileState(file);
            }}
          />
          <Button variant="primary" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Excel/CSV
          </Button>
          {uploadFileState && (
            <Button variant="success" onClick={handleUpload} disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              Uploaden
            </Button>
          )}
          <Button variant="secondary" onClick={() => {}}>
            <Download className="w-4 h-4 mr-2" />
            Download Sjabloon
          </Button>
        </div>
        <p className="text-xs text-gray-600">
          Upload een Excel of CSV bestand met kolommen: Code, Omschrijving, Eenheid (R), Materiaal (S), Uren (T)
          <br />
          <strong>NL Excel:</strong> Gebruikt komma als decimaalteken (10,50)
          <br />
          <strong>EN Excel:</strong> Gebruikt punt als decimaalteken (10.50)
        </p>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="text-3xl font-bold text-orange-500 mb-1">{stats.total}</div>
          <div className="text-xs text-gray-600 uppercase tracking-wide">Totaal Items</div>
        </Card>
        <Card>
          <div className="text-3xl font-bold text-orange-500 mb-1">{stats.rooms}</div>
          <div className="text-xs text-gray-600 uppercase tracking-wide">Ruimtes</div>
        </Card>
      </div>

      {/* Search and Actions */}
      <Card>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Zoek op code of omschrijving..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="50">50 per pagina</option>
            <option value="100">100 per pagina</option>
            <option value="200">200 per pagina</option>
            <option value="500">500 per pagina</option>
          </select>
          <Button variant="secondary" onClick={loadPrijzenboek} disabled={isLoading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Ververs
          </Button>
          <Button variant="success" onClick={handleSave} disabled={isLoading}>
            <Save className="w-4 h-4 mr-2" />
            Opslaan
          </Button>
        </div>

        {/* Bulk Actions */}
        {selectedItems.size > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-orange-700">
              {selectedItems.size} items geselecteerd
            </span>
            <div className="flex gap-2">
              <Button variant="danger" onClick={handleDeleteSelected} disabled={isLoading}>
                <Trash2 className="w-4 h-4 mr-2" />
                Verwijder Geselecteerde
              </Button>
              <Button variant="secondary" onClick={clearSelection}>
                Deselecteer Alles
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        {isLoading && filteredItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Laden...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Geen items gevonden</p>
            <Button variant="primary" onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Voeg Eerste Item Toe
            </Button>
          </div>
        ) : (
          <>
            <Table
              headers={['', 'Code', 'Omschrijving', 'Eenheid', 'Materiaal', 'Uren', 'Prijs/stuk', 'Acties']}
            >
              <tr>
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={allPageItemsSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                  />
                </td>
                <td colSpan={7} className="px-4 py-2 text-xs text-gray-500">
                  Selecteer alles op deze pagina
                </td>
              </tr>
              {pageItems.map((item) => (
                <tr
                  key={item.code}
                  className={`hover:bg-gray-50 ${selectedItems.has(item.code) ? 'bg-orange-50 border-l-4 border-orange-500' : ''}`}
                >
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.code)}
                      onChange={() => toggleItemSelection(item.code)}
                      className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.omschrijving}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.eenheid}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">€{item.materiaal.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.uren.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">€{item.prijs_per_stuk.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <Button
                      variant="danger"
                      onClick={() => {
                        if (confirm(`Weet je zeker dat je ${item.code} wilt verwijderen?`)) {
                          deleteItem(item.code);
                        }
                      }}
                      className="text-xs px-2 py-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="text-xs px-3 py-1"
              >
                Eerste
              </Button>
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="text-xs px-3 py-1"
              >
                Vorige
              </Button>
              <span className="text-sm text-gray-600 px-4">
                Pagina <strong>{currentPage}</strong> van <strong>{totalPages}</strong>
                {' '}({startIndex + 1}-{Math.min(endIndex, filteredItems.length)} van {filteredItems.length} items)
              </span>
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="text-xs px-3 py-1"
              >
                Volgende
              </Button>
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="text-xs px-3 py-1"
              >
                Laatste
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* Add Item Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Nieuwe Regel Toevoegen" size="md">
        <AddItemForm
          onSubmit={handleAddItem}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>
    </div>
  );
}

interface AddItemFormProps {
  onSubmit: (item: PrijzenboekItem) => void;
  onCancel: () => void;
}

function AddItemForm({ onSubmit, onCancel }: AddItemFormProps) {
  const [formData, setFormData] = useState<Partial<PrijzenboekItem>>({
    code: '',
    omschrijving: '',
    omschrijving_offerte: '',
    eenheid: '',
    materiaal: 0,
    uren: 0,
    prijs_per_stuk: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.code && formData.omschrijving && formData.eenheid && formData.prijs_per_stuk !== undefined) {
      onSubmit(formData as PrijzenboekItem);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-1">Code *</label>
        <input
          type="text"
          required
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          placeholder="Bijv. 0000011001"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-1">Omschrijving Vakman Mutatie *</label>
        <input
          type="text"
          required
          value={formData.omschrijving}
          onChange={(e) => setFormData({ ...formData, omschrijving: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-1">Omschrijving Offerte Mutatie</label>
        <input
          type="text"
          value={formData.omschrijving_offerte}
          onChange={(e) => setFormData({ ...formData, omschrijving_offerte: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-1">Eenheid *</label>
          <input
            type="text"
            required
            value={formData.eenheid}
            onChange={(e) => setFormData({ ...formData, eenheid: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="m2, m1, stu, won"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-1">Materiaal per stuk (excl. BTW) *</label>
          <input
            type="number"
            step="0.01"
            required
            value={formData.materiaal}
            onChange={(e) => setFormData({ ...formData, materiaal: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-1">Uren per stuk (excl. BTW)</label>
          <input
            type="number"
            step="0.01"
            value={formData.uren}
            onChange={(e) => setFormData({ ...formData, uren: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-1">Prijs per stuk (excl. BTW) *</label>
          <input
            type="number"
            step="0.01"
            required
            value={formData.prijs_per_stuk}
            onChange={(e) => setFormData({ ...formData, prijs_per_stuk: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Annuleren
        </Button>
        <Button variant="success" type="submit">
          Toevoegen
        </Button>
      </div>
    </form>
  );
}

