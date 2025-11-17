# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Offerte Generator MVP - A Dutch construction quote generation tool that automatically generates professional quotes (offertes) from Samsung Notes work inspections by fuzzy-matching against a pricing database (prijzenboek).

## Development Commands

### Backend (FastAPI/Python)
```bash
# Install dependencies
pip install -r requirements.txt

# Run backend server
python backend/main.py
# API available at http://localhost:8000
# Swagger docs at http://localhost:8000/docs

# Run directly from backend directory
cd backend && python main.py
```

### Frontend (Static HTML/JS)
```bash
# Serve frontend
cd frontend
python -m http.server 8080
# Open http://localhost:8080
```

### Full Stack Startup
```bash
./start.sh  # Unix/Linux/Mac
```

### Production (Railway)
```bash
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

## Architecture

### Backend Core Modules (`backend/`)
- **main.py** - FastAPI application with session-based workflow endpoints
- **document_parser.py** - Parses DOCX inspection documents into structured werkzaamheden (work items)
- **excel_parser_new.py** - Primary prijzenboek Excel parser (use this, not excel_parser.py)
- **matcher.py** - Fuzzy matching engine using Levenshtein distance + unit compatibility scoring
- **excel_generator.py** - Generates filled Excel quotes from matched items
- **database.py** - SQLite database manager for prijzenboek persistence (singleton pattern via `get_db()`)

### Data Flow
1. Upload DOCX inspection → `document_parser.parse_docx_opname()`
2. Parse prijzenboek → `excel_parser_new.parse_prijzenboek_new()`
3. Fuzzy match werkzaamheden → `matcher.match_werkzaamheden()`
4. Generate Excel quote → `excel_generator.generate_filled_excel()`

### Matching Algorithm (matcher.py)
- **Text similarity**: 70% weight - Levenshtein ratio with substring bonus
- **Unit matching**: 30% weight - Exact match (1.0), compatible (0.7-0.9), mismatch (0.0)
- **Confidence thresholds**: ≥90% auto-accept, 70-89% review, <70% manual selection

### Session Management
- In-memory session storage (dict) with UUID keys
- Sessions store: notes_path, prijzenboek_path, parsed_opname, prijzenboek_data, matches
- Production uses `/tmp/uploads` for file storage

### Frontend Configuration
Configure backend URL in `frontend/config.js`:
```javascript
window.API_BASE_URL = 'http://localhost:8000';  // Local development
// window.API_BASE_URL = 'https://vdsboffertes-production.up.railway.app';  // Production
```

## Key Domain Concepts

- **Werkzaamheid** (work item) - Individual task extracted from inspection document
- **Prijzenboek** (pricing book) - Database of priced work items with codes
- **Ruimte** (room) - Spatial grouping of werkzaamheden in inspection
- **Eenheid** (unit) - Measurement unit (m2, m1, stu, won, etc.)
- **Opname** (inspection) - Source document from Samsung Notes

## Database Schema

SQLite database (`backend/prijzenboek.db`) with columns:
- code (unique identifier)
- omschrijving (internal description)
- omschrijving_offerte (customer-facing description)
- eenheid (unit)
- materiaal, uren, prijs_per_stuk (pricing components)
- Room-specific quantities (algemeen_woning, hal_overloop, woonkamer, etc.)
- totaal_excl, totaal_incl (final prices)

## Deployment

- **Backend**: Railway (Python, uses Procfile)
- **Frontend**: Vercel (static hosting, uses vercel.json)
- CORS configured for both local and production origins
