// Offerte Generator - Frontend JavaScript

// Auto-detect API URL: use environment variable or fall back to localhost
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

let sessionId = null;
let matches = [];

// File input handlers
document.getElementById('notesFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        updateFileLabel('notesLabel', file.name, true);
        checkFilesReady();
    }
});

document.getElementById('prijzenboekFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        updateFileLabel('prijzenboekLabel', file.name, true);
        checkFilesReady();
    }
});

function updateFileLabel(labelId, fileName, hasFile) {
    const label = document.getElementById(labelId);
    if (hasFile) {
        label.classList.add('has-file');
        label.innerHTML = `
            <div class="file-info">
                <div class="file-icon">✓</div>
                <div class="file-name">${fileName}</div>
                <div class="file-hint">Bestand geselecteerd</div>
            </div>
        `;
    }
}

function checkFilesReady() {
    const notesFile = document.getElementById('notesFile').files[0];
    const prijzenboekFile = document.getElementById('prijzenboekFile').files[0];
    const generateBtn = document.getElementById('generateBtn');

    if (notesFile && prijzenboekFile) {
        generateBtn.disabled = false;
    }
}

// Generate button handler
document.getElementById('generateBtn').addEventListener('click', async function() {
    try {
        showProgress(true, 'Uploading bestanden...');

        // Step 1: Upload notes
        updateProgress(20, 'Uploading opname notities...');
        const notesFile = document.getElementById('notesFile').files[0];
        sessionId = await uploadNotes(notesFile);

        // Step 2: Upload prijzenboek
        updateProgress(40, 'Uploading prijzenboek...');
        const prijzenboekFile = document.getElementById('prijzenboekFile').files[0];
        await uploadPrijzenboek(sessionId, prijzenboekFile);

        // Step 3: Parse documents
        updateProgress(60, 'Parseren documenten...');
        const parseResult = await parseDocuments(sessionId);
        showStatus(`Gevonden: ${parseResult.werkzaamheden} werkzaamheden in ${parseResult.ruimtes} ruimtes`, 'info');

        // Step 4: Match werkzaamheden
        updateProgress(80, 'Matching werkzaamheden met prijzenboek...');
        const matchResult = await matchWerkzaamheden(sessionId);

        updateProgress(100, 'Klaar!');
        setTimeout(() => {
            showProgress(false);
            displayMatches(matchResult);
        }, 500);

    } catch (error) {
        console.error('Error:', error);
        showStatus('Fout: ' + error.message, 'error');
        showProgress(false);
    }
});

// Accept & Generate button handler
document.getElementById('acceptBtn').addEventListener('click', async function() {
    try {
        showProgress(true, 'Genereren Excel bestand...');

        // Generate Excel
        const result = await generateExcel(sessionId);

        showProgress(false);

        // Show download section
        document.getElementById('matchesSection').style.display = 'none';
        document.getElementById('downloadSection').style.display = 'block';
        document.getElementById('downloadLink').href = `${API_BASE_URL}${result.download_url}`;

    } catch (error) {
        console.error('Error:', error);
        showStatus('Fout bij genereren Excel: ' + error.message, 'error');
        showProgress(false);
    }
});

// API Functions
async function uploadNotes(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/upload/notes`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error('Failed to upload notes');
    }

    const data = await response.json();
    return data.session_id;
}

async function uploadPrijzenboek(sessionId, file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/upload/prijzenboek?session_id=${sessionId}`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error('Failed to upload prijzenboek');
    }

    return await response.json();
}

async function parseDocuments(sessionId) {
    const response = await fetch(`${API_BASE_URL}/api/process/parse?session_id=${sessionId}`, {
        method: 'POST'
    });

    if (!response.ok) {
        throw new Error('Failed to parse documents');
    }

    return await response.json();
}

async function matchWerkzaamheden(sessionId) {
    const response = await fetch(`${API_BASE_URL}/api/process/match?session_id=${sessionId}`, {
        method: 'POST'
    });

    if (!response.ok) {
        throw new Error('Failed to match werkzaamheden');
    }

    return await response.json();
}

async function generateExcel(sessionId) {
    const response = await fetch(`${API_BASE_URL}/api/generate/excel`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            session_id: sessionId,
            matches: []  // In MVP, we accept all matches as-is
        })
    });

    if (!response.ok) {
        throw new Error('Failed to generate Excel');
    }

    return await response.json();
}

// UI Helper Functions
function showProgress(show, text = '') {
    const progress = document.getElementById('progress');
    const progressText = document.getElementById('progressText');

    if (show) {
        progress.style.display = 'block';
        progressText.textContent = text;
    } else {
        progress.style.display = 'none';
    }
}

function updateProgress(percent, text) {
    document.getElementById('progressFill').style.width = percent + '%';
    document.getElementById('progressText').textContent = text;
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.className = 'status ' + type;
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';

    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}

function displayMatches(matchResult) {
    matches = matchResult.matches;

    // Show matches section
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('matchesSection').style.display = 'block';

    // Display statistics
    const statsHtml = `
        <div class="stat-card">
            <div class="stat-number">${matchResult.total_matches}</div>
            <div class="stat-label">Totaal</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${matchResult.high_confidence}</div>
            <div class="stat-label">Hoge Zekerheid</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${matchResult.medium_confidence + matchResult.low_confidence}</div>
            <div class="stat-label">Review Nodig</div>
        </div>
    `;
    document.getElementById('stats').innerHTML = statsHtml;

    // Display matches
    const matchesHtml = matches.map(match => {
        const confidenceClass = match.confidence >= 0.9 ? 'confidence-high' :
                               match.confidence >= 0.7 ? 'confidence-medium' :
                               'confidence-low';

        const confidenceLabel = match.confidence >= 0.9 ? 'Hoge zekerheid' :
                               match.confidence >= 0.7 ? 'Medium' :
                               'Lage zekerheid';

        return `
            <div class="match-item">
                <div class="match-header">${match.ruimte}</div>
                <div class="match-content">
                    <div class="match-row">
                        <div class="match-text">
                            <div class="match-label">Opname</div>
                            <div class="match-value">
                                ${match.opname_item.hoeveelheid} ${match.opname_item.eenheid} | ${match.opname_item.omschrijving}
                            </div>
                        </div>
                    </div>
                    <div class="match-arrow">↓</div>
                    <div class="match-row">
                        <div class="match-text">
                            <div class="match-label">Prijzenboek Match</div>
                            <div class="match-value">
                                ${match.prijzenboek_match.omschrijving} (${match.prijzenboek_match.eenheid})
                            </div>
                            <div class="match-label" style="margin-top: 5px;">
                                Code: ${match.prijzenboek_match.code} | €${match.prijzenboek_match.prijs_excl.toFixed(2)} excl. BTW
                            </div>
                        </div>
                        <span class="confidence-badge ${confidenceClass}">
                            ${(match.confidence * 100).toFixed(0)}% - ${confidenceLabel}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('matchesList').innerHTML = matchesHtml;
}
