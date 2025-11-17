// Admin Panel - Prijzenboek Beheer

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

let prijzenboekData = [];
let filteredData = [];
let selectedItems = new Set(); // Track selected item codes

// Pagination state
let currentPage = 1;
let itemsPerPage = 100;
let totalPages = 1;

// Load prijzenboek on page load
window.addEventListener('DOMContentLoaded', function() {
    loadPrijzenboek();
});

async function loadPrijzenboek() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/prijzenboek`);

        if (!response.ok) {
            throw new Error('Failed to load prijzenboek');
        }

        const data = await response.json();
        prijzenboekData = data.items || [];
        filteredData = [...prijzenboekData];

        // Reset to first page
        currentPage = 1;
        selectedItems.clear();
        updateBulkActionsBar();

        renderTable();
        updateStats();
        updatePaginationControls();

    } catch (error) {
        console.error('Error loading prijzenboek:', error);
        document.getElementById('tableBody').innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #E74C3C;">
                    <p>❌ Fout bij laden van prijzenboek</p>
                    <p style="font-size: 12px; color: #7F8C8D;">${error.message}</p>
                    <button class="btn" onclick="loadPrijzenboek()" style="margin-top: 15px;">Opnieuw Proberen</button>
                </td>
            </tr>
        `;
    }
}

function renderTable() {
    const tbody = document.getElementById('tableBody');

    if (filteredData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px;">
                    <p>Geen items gevonden</p>
                    <button class="btn" onclick="showAddModal()" style="margin-top: 15px;">+ Voeg Eerste Item Toe</button>
                </td>
            </tr>
        `;
        updatePaginationControls();
        return;
    }

    // Calculate pagination
    totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
    const pageData = filteredData.slice(startIndex, endIndex);

    tbody.innerHTML = pageData.map((item, pageIndex) => {
        const globalIndex = startIndex + pageIndex;
        const isSelected = selectedItems.has(item.code);
        return `
        <tr data-index="${globalIndex}" data-code="${item.code}" class="${isSelected ? 'selected' : ''}">
            <td class="checkbox-cell">
                <input type="checkbox"
                       onchange="toggleItemSelection('${item.code}')"
                       ${isSelected ? 'checked' : ''}>
            </td>
            <td>
                <div class="editable-cell" onclick="editCell(this, ${globalIndex}, 'code')">${item.code || ''}</div>
            </td>
            <td>
                <div class="editable-cell" onclick="editCell(this, ${globalIndex}, 'omschrijving')">${item.omschrijving || ''}</div>
            </td>
            <td>
                <div class="editable-cell" onclick="editCell(this, ${globalIndex}, 'eenheid')">${item.eenheid || ''}</div>
            </td>
            <td>
                <div class="editable-cell" onclick="editCell(this, ${globalIndex}, 'materiaal')">€${(item.materiaal || 0).toFixed(2)}</div>
            </td>
            <td>
                <div class="editable-cell" onclick="editCell(this, ${globalIndex}, 'uren')">€${(item.uren || 0).toFixed(2)}</div>
            </td>
            <td>
                <div class="editable-cell" onclick="editCell(this, ${globalIndex}, 'prijs_per_stuk')">€${(item.prijs_per_stuk || 0).toFixed(2)}</div>
            </td>
            <td>
                <div class="actions">
                    <button class="btn btn-sm btn-danger" onclick="deleteItem('${item.code}')">🗑️</button>
                </div>
            </td>
        </tr>
    `}).join('');

    updatePaginationControls();
    updateSelectAllCheckbox();
}

function updatePaginationControls() {
    totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;

    document.getElementById('currentPageNum').textContent = currentPage;
    document.getElementById('totalPages').textContent = totalPages;
    document.getElementById('totalItemsCount').textContent = filteredData.length;

    const startItem = filteredData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredData.length);
    document.getElementById('showingRange').textContent = `${startItem}-${endItem}`;

    // Update button states
    const pagination = document.getElementById('pagination');
    const buttons = pagination.querySelectorAll('button');
    buttons[0].disabled = currentPage === 1; // First
    buttons[1].disabled = currentPage === 1; // Previous
    buttons[2].disabled = currentPage === totalPages; // Next
    buttons[3].disabled = currentPage === totalPages; // Last
}

function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTable();
    // Scroll to top of table
    document.querySelector('.table-container').scrollTop = 0;
}

function changeItemsPerPage() {
    itemsPerPage = parseInt(document.getElementById('itemsPerPage').value);
    currentPage = 1; // Reset to first page
    renderTable();
}

// Selection functions
function toggleItemSelection(code) {
    if (selectedItems.has(code)) {
        selectedItems.delete(code);
    } else {
        selectedItems.add(code);
    }

    // Update row visual
    const row = document.querySelector(`tr[data-code="${code}"]`);
    if (row) {
        row.classList.toggle('selected', selectedItems.has(code));
    }

    updateBulkActionsBar();
    updateSelectAllCheckbox();
}

function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('#tableBody input[type="checkbox"]');

    checkboxes.forEach(checkbox => {
        const row = checkbox.closest('tr');
        const code = row.getAttribute('data-code');

        if (selectAllCheckbox.checked) {
            selectedItems.add(code);
            row.classList.add('selected');
        } else {
            selectedItems.delete(code);
            row.classList.remove('selected');
        }
        checkbox.checked = selectAllCheckbox.checked;
    });

    updateBulkActionsBar();
}

function updateSelectAllCheckbox() {
    const checkboxes = document.querySelectorAll('#tableBody input[type="checkbox"]');
    const selectAllCheckbox = document.getElementById('selectAll');

    if (checkboxes.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
        return;
    }

    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;

    if (checkedCount === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedCount === checkboxes.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    }
}

function updateBulkActionsBar() {
    const bulkActions = document.getElementById('bulkActions');
    const selectedCount = document.getElementById('selectedCount');

    selectedCount.textContent = selectedItems.size;

    if (selectedItems.size > 0) {
        bulkActions.classList.add('visible');
    } else {
        bulkActions.classList.remove('visible');
    }
}

function clearSelection() {
    selectedItems.clear();
    updateBulkActionsBar();
    renderTable();
}

async function deleteSelected() {
    if (selectedItems.size === 0) return;

    const count = selectedItems.size;
    if (!confirm(`Weet je zeker dat je ${count} geselecteerde items wilt verwijderen?\n\nDit kan niet ongedaan worden gemaakt!`)) {
        return;
    }

    const codesToDelete = Array.from(selectedItems);
    let deleted = 0;
    let failed = 0;

    // Show progress
    const statusSpan = document.getElementById('uploadStatus');
    statusSpan.textContent = `⏳ Verwijderen... (0/${count})`;
    statusSpan.style.color = '#F7931E';

    for (let i = 0; i < codesToDelete.length; i++) {
        const code = codesToDelete[i];
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/prijzenboek/item/${encodeURIComponent(code)}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                deleted++;
                // Remove from local data
                const index = prijzenboekData.findIndex(item => item.code === code);
                if (index > -1) {
                    prijzenboekData.splice(index, 1);
                }
            } else {
                failed++;
            }
        } catch (error) {
            console.error(`Error deleting ${code}:`, error);
            failed++;
        }

        // Update progress
        statusSpan.textContent = `⏳ Verwijderen... (${i + 1}/${count})`;
    }

    // Clear selection
    selectedItems.clear();

    // Re-filter and render
    filterTable();
    updateStats();
    updateBulkActionsBar();

    // Show result
    if (failed === 0) {
        statusSpan.textContent = `✅ ${deleted} items verwijderd`;
        statusSpan.style.color = '#27AE60';
    } else {
        statusSpan.textContent = `⚠️ ${deleted} verwijderd, ${failed} mislukt`;
        statusSpan.style.color = '#F7931E';
    }

    setTimeout(() => {
        statusSpan.textContent = '';
    }, 3000);
}

function editCell(cell, index, field) {
    const currentValue = filteredData[index][field] || '';
    const displayValue = currentValue;
    const isNumericField = ['materiaal', 'uren', 'prijs_per_stuk'].includes(field);

    cell.innerHTML = `
        <input type="${isNumericField ? 'number' : 'text'}"
               value="${displayValue}"
               onblur="saveCell(this, ${index}, '${field}')"
               onkeypress="if(event.key==='Enter') this.blur()"
               step="${isNumericField ? '0.01' : ''}"
               autofocus>
    `;
    cell.querySelector('input').focus();
}

async function saveCell(input, index, field) {
    const value = input.value;
    const isNumericField = ['materiaal', 'uren', 'prijs_per_stuk'].includes(field);

    if (isNumericField) {
        filteredData[index][field] = parseFloat(value) || 0;
    } else {
        filteredData[index][field] = value;
    }

    // Update in main data array too
    const code = filteredData[index].code;
    const mainIndex = prijzenboekData.findIndex(item => item.code === code);
    if (mainIndex > -1) {
        prijzenboekData[mainIndex][field] = filteredData[index][field];
    }

    // Save to database
    try {
        const item = filteredData[index];
        const response = await fetch(`${API_BASE_URL}/api/admin/prijzenboek/item`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(item)
        });

        if (!response.ok) {
            throw new Error('Failed to save changes to database');
        }

        console.log(`Field ${field} updated for ${item.code}`);

    } catch (error) {
        console.error('Error saving cell:', error);
    }

    renderTable();
}

function filterTable() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    if (searchTerm === '') {
        filteredData = [...prijzenboekData];
    } else {
        filteredData = prijzenboekData.filter(item => {
            const code = (item.code || '').toLowerCase();
            const omschrijving = (item.omschrijving || '').toLowerCase();
            return code.includes(searchTerm) || omschrijving.includes(searchTerm);
        });
    }

    currentPage = 1; // Reset to first page when filtering
    renderTable();
}

function showAddModal() {
    document.getElementById('addModal').classList.add('active');
}

function closeModal() {
    document.getElementById('addModal').classList.remove('active');
    document.getElementById('addForm').reset();
}

async function handleAddItem(event) {
    event.preventDefault();

    const materiaal = parseFloat(document.getElementById('newMateriaal').value) || 0;
    const uren = parseFloat(document.getElementById('newUren').value) || 0;
    const prijs_per_stuk = parseFloat(document.getElementById('newPrijsPerStuk').value) || 0;

    const newItem = {
        code: document.getElementById('newCode').value,
        omschrijving: document.getElementById('newOmschrijving').value,
        omschrijving_offerte: document.getElementById('newOfferteOmschrijving').value || document.getElementById('newOmschrijving').value,

        // Ruimtes - allemaal op 0
        algemeen_woning: 0,
        hal_overloop: 0,
        woonkamer: 0,
        keuken: 0,
        toilet: 0,
        badkamer: 0,
        slaapk_voor_kl: 0,
        slaapk_voor_gr: 0,
        slaapk_achter_kl: 0,
        slaapk_achter_gr: 0,
        zolder: 0,
        berging: 0,
        meerwerk: 0,

        // Prijzen
        totaal: 0,
        eenheid: document.getElementById('newEenheid').value || 'stu',
        materiaal: materiaal,
        uren: uren,
        prijs_per_stuk: prijs_per_stuk,
        totaal_excl: 0,
        totaal_incl: 0
    };

    // Save directly to database
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/prijzenboek/item`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newItem)
        });

        if (!response.ok) {
            throw new Error('Failed to save item to database');
        }

        const result = await response.json();
        console.log('Item saved:', result);

        // Add to local list
        prijzenboekData.push(newItem);
        filterTable(); // Re-apply filter
        updateStats();
        closeModal();

        // Show success message
        alert(`✅ Item ${result.action}: ${newItem.code}`);

    } catch (error) {
        console.error('Error saving item:', error);
        alert('❌ Fout bij opslaan: ' + error.message);
    }

    return false;
}

async function deleteItem(code) {
    if (confirm(`Weet je zeker dat je item ${code} wilt verwijderen?`)) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/prijzenboek/item/${encodeURIComponent(code)}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete item from database');
            }

            // Remove from local lists
            const mainIndex = prijzenboekData.findIndex(item => item.code === code);
            if (mainIndex > -1) {
                prijzenboekData.splice(mainIndex, 1);
            }

            // Remove from selection if selected
            selectedItems.delete(code);

            filterTable();
            updateStats();
            updateBulkActionsBar();

            console.log(`Item ${code} deleted from database`);

        } catch (error) {
            console.error('Error deleting item:', error);
            alert('❌ Fout bij verwijderen: ' + error.message);
        }
    }
}

function updateStats() {
    document.getElementById('totalItems').textContent = prijzenboekData.length;
}

async function savePrijzenboek() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/prijzenboek`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                items: prijzenboekData
            })
        });

        if (!response.ok) {
            throw new Error('Failed to save prijzenboek');
        }

        alert('✅ Prijzenboek succesvol opgeslagen!');

    } catch (error) {
        console.error('Error saving prijzenboek:', error);
        alert('❌ Fout bij opslaan: ' + error.message);
    }
}

async function handlePrijzenboekUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusSpan = document.getElementById('uploadStatus');
    statusSpan.textContent = '⏳ Uploaden...';
    statusSpan.style.color = '#F7931E';

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/prijzenboek/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Upload failed');
        }

        const data = await response.json();
        statusSpan.textContent = `✅ ${data.items_loaded} items geladen`;
        statusSpan.style.color = '#27AE60';

        // Reload the table with new data
        await loadPrijzenboek();

        setTimeout(() => {
            statusSpan.textContent = '';
        }, 3000);

    } catch (error) {
        console.error('Error uploading prijzenboek:', error);
        statusSpan.textContent = `❌ ${error.message}`;
        statusSpan.style.color = '#E74C3C';
    }

    event.target.value = '';
}

function downloadTemplate() {
    const template = [
        [
            'CODERING DATABASE',
            'OMSCHRIJVING VAKMAN MUTATIE',
            'EENHEID',
            'Materiaal per stuk EXCL BTW',
            'Uren per stuk EXCL BTW',
            'Prijs per stuk EXCL BTW',
            'OMSCHRIJVING OFFERTE MUTATIE'
        ],
        [
            '0000011001',
            'Badkamerrenovatie >0 - 2 m²',
            'stu',
            '6285.20',
            '0.00',
            '6285.20',
            'Badkamerrenovatie >0 - 2 m²'
        ],
        [
            '0017004001',
            'woning bezemschoon opleveren',
            'won',
            '0.00',
            '132.06',
            '132.06',
            'woning bezemschoon opleveren'
        ],
        [
            '0017004005',
            'woning per m2 beschermen/afdekken',
            'm2',
            '1.12',
            '2.64',
            '3.76',
            'woning per m2 beschermen/afdekken'
        ]
    ];

    const csv = template.map(row => row.map(cell => {
        const str = String(cell);
        if (str.includes(';') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }).join(';')).join('\n');

    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csv;

    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'prijzenboek_sjabloon.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const statusSpan = document.getElementById('uploadStatus');
    statusSpan.textContent = '✅ Sjabloon gedownload';
    statusSpan.style.color = '#27AE60';
    setTimeout(() => {
        statusSpan.textContent = '';
    }, 4000);
}
