# Offerte Generator - MVP

Automatisch genereren van professionele offertes uit Samsung Notes opnames en Excel prijzenboek.

## Projectstructuur

```
vdsboffertes/
├── backend/                    # Python FastAPI backend
│   ├── main.py                # FastAPI application
│   ├── document_parser.py     # Parse DOCX opnames
│   ├── excel_parser.py        # Parse Excel prijzenboek
│   ├── matcher.py             # Fuzzy matching engine
│   ├── excel_generator.py     # Generate filled Excel
│   └── requirements.txt       # Python dependencies
│
├── frontend/                   # HTML/JS frontend
│   ├── index.html             # Main UI
│   └── app.js                 # Frontend logic
│
├── uploads/                    # Temporary file storage
│
└── Voorbeeld bestanden:
    ├── Voorofscheweg_218_251107_094114.docx
    └── Opnamelijst_-_Woonforte_2025_22-04__Nieuw_.xlsm
```

## Installatie

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

### Dependencies

De volgende Python packages worden geïnstalleerd:
- FastAPI (web framework)
- Uvicorn (ASGI server)
- python-docx (DOCX parsing)
- openpyxl (Excel manipulatie)
- python-Levenshtein (fuzzy matching)
- pydantic (data validation)

## Gebruik

### 1. Start de Backend Server

```bash
cd backend
python main.py
```

De API is beschikbaar op: `http://localhost:8000`

API documentatie: `http://localhost:8000/docs`

### 2. Open de Frontend

Open `frontend/index.html` in je browser.

Of gebruik een simple HTTP server:

```bash
cd frontend
python -m http.server 8080
```

Dan open: `http://localhost:8080`

### 3. Gebruik de App

1. **Upload Samsung Notes document** (.docx of .txt)
2. **Upload Excel prijzenboek** (.xlsx of .xlsm)
3. Klik op **GENEREER OFFERTE**
4. Review de matches
5. Klik op **ACCEPTEER & GENEREER EXCEL**
6. Download het gegenereerde Excel bestand

## Features (MVP Fase 1)

- ✅ File upload interface (drag & drop stijl)
- ✅ DOCX document parser (extracteert werkzaamheden per ruimte)
- ✅ Excel prijzenboek parser (1697 items)
- ✅ Fuzzy matching engine (tekst + eenheid matching)
- ✅ Confidence scoring (hoog/medium/laag)
- ✅ Review interface met matches
- ✅ Excel generator (vult template in)
- ✅ Download interface

## Workflow

```
[Upload Files]
     ↓
[Parse Documents]
     ↓
[Extract Werkzaamheden] → ~47 items from example
     ↓
[Match with Prijzenboek] → Fuzzy + Unit matching
     ↓
[Review Matches] → Confidence scores
     ↓
[Generate Excel] → Fill template
     ↓
[Download]
```

## Matching Algoritme

Het matching proces gebruikt:

1. **Text Similarity** (70% weight)
   - Levenshtein ratio voor fuzzy text matching
   - Substring matching bonus

2. **Unit Match** (30% weight)
   - Exacte eenheid match: 100%
   - Compatibele eenheden: 70-90%
   - Geen match: 0%

3. **Confidence Levels**
   - ≥90%: Hoge zekerheid (auto-accept)
   - 70-89%: Medium (review aanbevolen)
   - <70%: Lage zekerheid (handmatige selectie)

## Testing met Voorbeeldbestanden

De repository bevat voorbeeldbestanden:

### Opname Document
`Voorofscheweg_218_251107_094114.docx`
- 6-8 ruimtes
- ~47 werkzaamheden
- Verschillende eenheden (m2, m1, stuks)

### Prijzenboek
`Opnamelijst_-_Woonforte_2025_22-04__Nieuw_.xlsm`
- Sheet "Prijzenboek": 1697 items
- Sheet "Blad vakman": Klant offerte template
- Sheet "Blad vakman O.A.": Onderaannemer template

## API Endpoints

### Upload
- `POST /api/upload/notes` - Upload opname document
- `POST /api/upload/prijzenboek` - Upload prijzenboek

### Processing
- `POST /api/process/parse` - Parse uploaded documents
- `POST /api/process/match` - Match werkzaamheden

### Generation
- `POST /api/generate/excel` - Generate filled Excel
- `GET /api/download/excel/{session_id}` - Download generated file

### Status
- `GET /api/session/{session_id}/status` - Get session status

## Data Structuren

### Parsed Opname
```json
{
  "metadata": {
    "adres": "Voorofscheweg 218"
  },
  "ruimtes": [
    {
      "naam": "Slaapkamer boven achter",
      "werkzaamheden": [
        {
          "omschrijving": "behang verwijderen",
          "hoeveelheid": 10.6,
          "eenheid": "m2"
        }
      ]
    }
  ]
}
```

### Match Result
```json
{
  "id": "uuid",
  "ruimte": "Slaapkamer boven achter",
  "opname_item": {
    "omschrijving": "behang verwijderen",
    "hoeveelheid": 10.6,
    "eenheid": "m2"
  },
  "prijzenboek_match": {
    "code": "123456",
    "omschrijving": "Behang verwijderen incl. lijmresten",
    "eenheid": "m2",
    "prijs_excl": 2.50,
    "prijs_incl": 3.025
  },
  "confidence": 0.95,
  "status": "auto"
}
```

## Troubleshooting

### CORS Errors
Als je CORS errors krijgt, zorg dat de backend draait op `localhost:8000` en dat je de frontend opent via `localhost` (niet `file://`).

### Excel Generatie Errors
De Excel generator verwacht de exacte structuur van het prijzenboek. Zorg dat je het correcte template gebruikt.

### Matching Issues
Als matches te laag scoren:
- Check of eenheden correct worden gedetecteerd
- Verhoog matching threshold in `matcher.py`
- Voeg synoniemen toe aan de matching logica

## Volgende Stappen (Fase 2)

- [ ] Claude API semantische matching
- [ ] Verbeterde confidence scoring
- [ ] PDF generator
- [ ] Betere UI/UX met React
- [ ] Multi-ruimte support in Excel
- [ ] Learning from user corrections
- [ ] Batch processing

## Performance

Met voorbeeldbestanden:
- Upload: <2 sec
- Parsing: 3-5 sec
- Matching: 5-10 sec (afhankelijk van aantal werkzaamheden)
- Excel generatie: 2-3 sec

**Totaal: <1 minuut van upload tot download**

## Licentie

Internal tool voor Nippon Express NEC Logistics

## Contact

Voor vragen of problemen, neem contact op met het development team.
