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
