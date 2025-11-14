// Admin Panel - Prijzenboek Beheer

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

let prijzenboekData = [];

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

        renderTable();
        updateStats();

    } catch (error) {
        console.error('Error loading prijzenboek:', error);
        document.getElementById('tableBody').innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #E74C3C;">
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

    if (prijzenboekData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px;">
                    <p>Geen items gevonden</p>
                    <button class="btn" onclick="showAddModal()" style="margin-top: 15px;">+ Voeg Eerste Item Toe</button>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = prijzenboekData.map((item, index) => `
        <tr data-index="${index}">
            <td>
                <div class="editable-cell" onclick="editCell(this, ${index}, 'code')">${item.code || ''}</div>
            </td>
            <td>
                <div class="editable-cell" onclick="editCell(this, ${index}, 'omschrijving')">${item.omschrijving || ''}</div>
            </td>
            <td>
                <div class="editable-cell" onclick="editCell(this, ${index}, 'eenheid')">${item.eenheid || ''}</div>
            </td>
            <td>
                <div class="editable-cell" onclick="editCell(this, ${index}, 'materiaal')">€${(item.materiaal || 0).toFixed(2)}</div>
            </td>
            <td>
                <div class="editable-cell" onclick="editCell(this, ${index}, 'uren')">€${(item.uren || 0).toFixed(2)}</div>
            </td>
            <td>
                <div class="actions">
                    <button class="btn btn-sm btn-danger" onclick="deleteItem(${index})">🗑️ Verwijder</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function editCell(cell, index, field) {
    const currentValue = prijzenboekData[index][field] || '';
    const displayValue = field === 'materiaal' || field === 'uren'
        ? currentValue
        : currentValue;

    cell.innerHTML = `
        <input type="${field === 'materiaal' || field === 'uren' ? 'number' : 'text'}"
               value="${displayValue}"
               onblur="saveCell(this, ${index}, '${field}')"
               onkeypress="if(event.key==='Enter') this.blur()"
               step="${field === 'materiaal' || field === 'uren' ? '0.01' : ''}"
               autofocus>
    `;
    cell.querySelector('input').focus();
}

function saveCell(input, index, field) {
    const value = input.value;

    if (field === 'materiaal' || field === 'uren') {
        prijzenboekData[index][field] = parseFloat(value) || 0;
    } else {
        prijzenboekData[index][field] = value;
    }

    renderTable();
}

function filterTable() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#tableBody tr');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function showAddModal() {
    document.getElementById('addModal').classList.add('active');
}

function closeModal() {
    document.getElementById('addModal').classList.remove('active');
    document.getElementById('addForm').reset();
}

function handleAddItem(event) {
    event.preventDefault();

    const newItem = {
        code: document.getElementById('newCode').value,
        omschrijving: document.getElementById('newOmschrijving').value,
        eenheid: document.getElementById('newEenheid').value || 'stu',
        materiaal: parseFloat(document.getElementById('newMateriaal').value) || 0,
        uren: parseFloat(document.getElementById('newUren').value) || 0
    };

    prijzenboekData.push(newItem);
    renderTable();
    updateStats();
    closeModal();

    return false;
}

function deleteItem(index) {
    if (confirm('Weet je zeker dat je dit item wilt verwijderen?')) {
        prijzenboekData.splice(index, 1);
        renderTable();
        updateStats();
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

        // Clear status after 3 seconds
        setTimeout(() => {
            statusSpan.textContent = '';
        }, 3000);

    } catch (error) {
        console.error('Error uploading prijzenboek:', error);
        statusSpan.textContent = `❌ ${error.message}`;
        statusSpan.style.color = '#E74C3C';
    }

    // Reset file input
    event.target.value = '';
}

function downloadTemplate() {
    // Create template matching the actual Excel structure
    // Columns: A-B (Code, Omschrijving), C-O (Ruimtes), Q (Totaal), R-Y (Eenheid, Prijzen, etc.)
    const template = [
        // Headers
        [
            'CODERING DATABASE',
            'OMSCHRIJVING VAKMAN MUTATIE',
            'Algemeen woning',
            'Hal / Overloop',
            'Woonkamer',
            'Keuken',
            'Toilet',
            'Badkamer',
            'Slaapk voor KL',
            'Slaapk voor GR',
            'Slaapk achter KL',
            'Slaapk achter GR',
            'Zolder',
            'Berging',
            'Meerwerk',
            '', // Kolom P leeg
            'TOTAAL',
            'EENHEID',
            'Materiaal per stuk EXCL BTW',
            'Uren per stuk EXCL BTW',
            'Prijs per stuk EXCL BTW',
            '', // Kolom V leeg
            'TOTAAL EXCL BTW',
            'TOTAAL INCL BTW',
            'OMSCHRIJVING OFFERTE MUTATIE'
        ],
        // Example rows
        [
            '0000011001',
            'Badkamerrenovatie >0 - 2 m2',
            '', '', '', '', '', '', '', '', '', '', '', '', '0', '',
            '0',
            'stu',
            '6285.20',
            '0.00',
            '6285.20',
            '',
            '0.00',
            '0.00',
            'Badkamerrenovatie >0 - 2 m2'
        ],
        [
            'A.01.001',
            'Voorbeeld werkzaamheid',
            '', '', '', '', '', '', '', '', '', '', '', '', '0', '',
            '0',
            'm2',
            '15.50',
            '2.00',
            '17.50',
            '',
            '0.00',
            '0.00',
            'Voorbeeld werkzaamheid'
        ]
    ];

    // Convert to CSV
    const csv = template.map(row => row.map(cell => {
        // Escape cells with commas or quotes
        const str = String(cell);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }).join(',')).join('\n');

    // Add UTF-8 BOM for proper Excel encoding
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csv;

    // Create blob and download
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'prijzenboek_sjabloon.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show confirmation
    const statusSpan = document.getElementById('uploadStatus');
    statusSpan.textContent = '✅ Sjabloon gedownload - Importeer in Excel voor beste resultaten';
    statusSpan.style.color = '#27AE60';
    setTimeout(() => {
        statusSpan.textContent = '';
    }, 4000);
}
