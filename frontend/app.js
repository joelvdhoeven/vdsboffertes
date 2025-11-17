// Offerte Generator - Frontend JavaScript

// Auto-detect API URL: use environment variable or fall back to localhost
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

let sessionId = null;
let matches = [];
let inputMode = 'file'; // 'file' or 'text'

// Input mode toggle
function setInputMode(mode) {
    inputMode = mode;

    // Update toggle buttons
    document.getElementById('toggleFile').classList.toggle('active', mode === 'file');
    document.getElementById('toggleText').classList.toggle('active', mode === 'text');

    // Show/hide relevant sections
    document.getElementById('fileUploadMode').style.display = mode === 'file' ? 'block' : 'none';
    document.getElementById('textPasteMode').style.display = mode === 'text' ? 'block' : 'none';

    // Update button state
    checkInputReady();
}

// File input handlers
document.getElementById('notesFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        updateFileLabel('notesLabel', file.name, true);
        checkInputReady();
    }
});

// Text input handler
document.getElementById('notesText').addEventListener('input', function() {
    checkInputReady();
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

function checkInputReady() {
    const generateBtn = document.getElementById('generateBtn');

    if (inputMode === 'file') {
        const notesFile = document.getElementById('notesFile').files[0];
        generateBtn.disabled = !notesFile;
    } else {
        const notesText = document.getElementById('notesText').value.trim();
        generateBtn.disabled = notesText.length < 10; // Minimum 10 characters
    }
}

// Legacy function for backwards compatibility
function checkFilesReady() {
    checkInputReady();
}

// Generate button handler
document.getElementById('generateBtn').addEventListener('click', async function() {
    try {
        showProgress(true, 'Verwerken...');

        // Step 1: Upload notes (file or text)
        if (inputMode === 'file') {
            updateProgress(25, 'Uploading opname notities...');
            const notesFile = document.getElementById('notesFile').files[0];
            sessionId = await uploadNotes(notesFile);
        } else {
            updateProgress(25, 'Verwerken tekst...');
            const notesText = document.getElementById('notesText').value;
            sessionId = await uploadNotesText(notesText);
        }

        // Step 2: Parse documents (using default prijzenboek from admin)
        updateProgress(50, 'Parseren document...');
        const parseResult = await parseDocuments(sessionId);
        showStatus(`Gevonden: ${parseResult.werkzaamheden} werkzaamheden in ${parseResult.ruimtes} ruimtes`, 'info');

        // Step 3: Match werkzaamheden
        updateProgress(75, 'Matching werkzaamheden met prijzenboek...');
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

async function uploadNotesText(text) {
    const response = await fetch(`${API_BASE_URL}/api/upload/notes-text`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: text })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to upload text');
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

    // Count match types
    const aiMatches = matches.filter(m => m.match_type === 'ai_semantic').length;
    const learnedMatches = matches.filter(m => m.match_type === 'learned').length;

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
        ${aiMatches > 0 ? `
        <div class="stat-card">
            <div class="stat-number">${aiMatches}</div>
            <div class="stat-label">AI Matches</div>
        </div>
        ` : ''}
        ${learnedMatches > 0 ? `
        <div class="stat-card">
            <div class="stat-number">${learnedMatches}</div>
            <div class="stat-label">Geleerd</div>
        </div>
        ` : ''}
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

        // Match type badge
        let matchTypeBadge = '';
        if (match.match_type === 'ai_semantic') {
            matchTypeBadge = '<span class="match-type-badge ai-badge">AI</span>';
        } else if (match.match_type === 'learned') {
            matchTypeBadge = '<span class="match-type-badge learned-badge">Geleerd</span>';
        } else if (match.match_type === 'manual') {
            matchTypeBadge = '<span class="match-type-badge manual-badge">Handmatig</span>';
        }

        // AI reasoning display
        let aiReasoningHtml = '';
        if (match.ai_reasoning) {
            aiReasoningHtml = `
                <div class="ai-reasoning">
                    <div class="ai-reasoning-label">AI Uitleg:</div>
                    <div class="ai-reasoning-text">${match.ai_reasoning}</div>
                </div>
            `;
        }

        // Alternatives dropdown for corrections
        let alternativesHtml = '';
        if (match.alternatives && match.alternatives.length > 0) {
            const alternativeOptions = match.alternatives.map(alt =>
                `<option value="${alt.code}">${alt.omschrijving} (${(alt.score * 100).toFixed(0)}%)</option>`
            ).join('');

            alternativesHtml = `
                <div class="alternatives-section">
                    <select class="alternative-select" id="alt_${match.id}" onchange="selectAlternative('${match.id}', this.value)">
                        <option value="">-- Kies andere match --</option>
                        ${alternativeOptions}
                    </select>
                </div>
            `;
        }

        // AI suggestion button (only show if confidence < 95% and not already AI matched)
        let aiButtonHtml = '';
        if (match.match_type !== 'ai_semantic' && match.confidence < 0.95) {
            aiButtonHtml = `
                <button class="btn-ai-suggest" onclick="requestAISuggestion('${match.id}')" id="ai_btn_${match.id}">
                    🤖 Vraag AI
                </button>
            `;
        }

        return `
            <div class="match-item" data-match-id="${match.id}">
                <div class="match-header">
                    ${match.ruimte}
                    ${matchTypeBadge}
                </div>
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
                            <div class="match-value" id="match_value_${match.id}">
                                ${match.prijzenboek_match.omschrijving} (${match.prijzenboek_match.eenheid})
                            </div>
                            <div class="match-label" style="margin-top: 5px;" id="match_code_${match.id}">
                                Code: ${match.prijzenboek_match.code} | €${match.prijzenboek_match.prijs_excl.toFixed(2)} excl. BTW
                            </div>
                        </div>
                        <span class="confidence-badge ${confidenceClass}" id="conf_${match.id}">
                            ${(match.confidence * 100).toFixed(0)}% - ${confidenceLabel}
                        </span>
                    </div>
                    ${aiReasoningHtml}
                    <div class="match-actions">
                        ${alternativesHtml}
                        ${aiButtonHtml}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('matchesList').innerHTML = matchesHtml;
}

// Request AI suggestion for a specific match
async function requestAISuggestion(matchId) {
    const btn = document.getElementById(`ai_btn_${matchId}`);
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Laden...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/matches/${matchId}/ai-suggest?session_id=${sessionId}`, {
            method: 'POST'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'AI suggestion failed');
        }

        const result = await response.json();

        if (result.success) {
            // Show AI suggestion to user
            const suggestion = result.ai_suggestion;
            const currentMatch = result.current_match;

            const accept = confirm(
                `AI Suggestie (${(suggestion.confidence * 100).toFixed(0)}% zekerheid):\n\n` +
                `${suggestion.omschrijving}\n` +
                `Code: ${suggestion.code}\n` +
                `Prijs: €${suggestion.prijs_per_stuk.toFixed(2)}\n\n` +
                `Reden: ${suggestion.reasoning}\n\n` +
                `Huidige match: ${currentMatch.omschrijving}\n\n` +
                `Wil je de AI suggestie accepteren?`
            );

            if (accept) {
                // Apply AI suggestion
                await selectAlternative(matchId, suggestion.code);

                // Update the match to show AI reasoning
                const matchElement = document.querySelector(`[data-match-id="${matchId}"]`);
                if (matchElement) {
                    const existingReasoning = matchElement.querySelector('.ai-reasoning');
                    if (!existingReasoning) {
                        const matchContent = matchElement.querySelector('.match-content');
                        const reasoningHtml = `
                            <div class="ai-reasoning">
                                <div class="ai-reasoning-label">AI Uitleg:</div>
                                <div class="ai-reasoning-text">${suggestion.reasoning}</div>
                            </div>
                        `;
                        matchContent.insertAdjacentHTML('beforeend', reasoningHtml);
                    }
                }
            }
        }

        btn.innerHTML = '✅ AI Gevraagd';
        btn.disabled = true;

    } catch (error) {
        console.error('AI suggestion error:', error);
        alert('Fout bij AI suggestie: ' + error.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Select an alternative match and save correction
async function selectAlternative(matchId, newCode) {
    if (!newCode) return;

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/matches/${matchId}/correct?session_id=${sessionId}&new_code=${newCode}&save_correction=true`,
            { method: 'POST' }
        );

        if (!response.ok) {
            throw new Error('Failed to update match');
        }

        const result = await response.json();

        if (result.success) {
            // Update the UI
            const match = result.match;
            document.getElementById(`match_value_${matchId}`).innerHTML =
                `${match.prijzenboek_match.omschrijving} (${match.prijzenboek_match.eenheid})`;
            document.getElementById(`match_code_${matchId}`).innerHTML =
                `Code: ${match.prijzenboek_match.code} | €${match.prijzenboek_match.prijs_excl.toFixed(2)} excl. BTW`;

            // Update confidence badge
            const confBadge = document.getElementById(`conf_${matchId}`);
            confBadge.className = 'confidence-badge confidence-high';
            confBadge.innerHTML = '100% - Handmatig';

            // Update match type badge
            const matchItem = document.querySelector(`[data-match-id="${matchId}"]`);
            const header = matchItem.querySelector('.match-header');
            const existingBadge = header.querySelector('.match-type-badge');
            if (existingBadge) existingBadge.remove();
            header.innerHTML += '<span class="match-type-badge manual-badge">Handmatig</span>';

            // Update local matches array
            const matchIndex = matches.findIndex(m => m.id === matchId);
            if (matchIndex !== -1) {
                matches[matchIndex] = match;
            }

            // Show success message
            if (result.correction_saved) {
                showStatus(`Match bijgewerkt en opgeslagen voor toekomstig leren`, 'success');
            } else {
                showStatus(`Match bijgewerkt`, 'success');
            }
        }

    } catch (error) {
        console.error('Error updating match:', error);
        showStatus('Fout bij bijwerken match: ' + error.message, 'error');
    }
}
