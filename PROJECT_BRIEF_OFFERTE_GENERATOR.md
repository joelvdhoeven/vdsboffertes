# Offerte Generator - Project Brief voor Claude Code

## Projectomschrijving

Bouw een web-applicatie waarmee bouwopnames (aantekeningen in Samsung Notes) automatisch worden omgezet naar professionele offertes door matching met een prijzenboek.

## Bedrijfscontext

**Bedrijf:** Nippon Express NEC Logistics (Bouw/Onderhoud divisie)
**Gebruiker:** Joel en collega's die bouwopnames doen

**Huidige workflow:**
1. Collega doet opname bij woning
2. Maakt handmatige aantekeningen in Samsung Notes per ruimte
3. Moet daarna handmatig Excel invullen met werkzaamheden en aantallen
4. Excel genereert offerte voor klant + onderaannemer

**Probleem:** Handmatig invoeren is tijdrovend en foutgevoelig

## Gewenste Oplossing

### Input:
- **Opname notities** (txt/docx/pdf upload)
  - Gestructureerd per ruimte
  - Bevat werkzaamheden met hoeveelheden
  - Voorbeeld format:
    ```
    Slaapkamer boven achter
    - 10,6m2 behang verwijderen
    - 9,6m2 gipsplaten vervangen
    - Radiator demonteren
    - Vensterbank vervangen 1m1
    ```

- **Prijzenboek** (Excel bestand - 1697 werkzaamheden)
  - Kolommen: Codering, Omschrijving, Eenheid, Materiaal, Uren, Totaal excl/incl BTW, BTW splits
  - Structuur: Hiërarchisch met hoofdgroepen en subgroepen

### Output:
1. **Ingevuld Excel bestand**
   - "Blad vakman" (klant offerte) met ingevulde aantallen
   - "Blad vakman O.A." (onderaannemer offerte)
   
2. **PDF Offertes**
   - Professionele klant offerte
   - Onderaannemer offerte (optioneel)

3. **Matching Review Interface**
   - Overzicht van alle gevonden matches
   - Confidence scores
   - Mogelijkheid om matches aan te passen voor hergebruik

## Technische Requirements

### Core Functionaliteit:

**1. Document Parser**
- Upload Samsung Notes export (txt/docx/pdf)
- Parse structuur: ruimtes → werkzaamheden → hoeveelheden
- Extractie van:
  - Ruimtenaam (bijv. "Slaapkamer boven achter")
  - Werkzaamheid (bijv. "behang verwijderen")
  - Hoeveelheid + eenheid (bijv. "10,6m2" → 10.6, "m2")

**2. Prijzenboek Manager**
- Upload/opslag van Excel prijzenboek
- Parse 1697 werkzaamheden met alle kolommen
- Indexering voor snelle zoekacties
- Cache mechanisme (prijzenboek verandert zelden)

**3. Intelligent Matching Engine**
- **Fuzzy matching** voor tekstuele overeenkomsten
  - "behang verwijderen" matched met "behang verwijderen incl. lijmresten"
  - Omgaan met typefouten/variaties
  
- **Semantische matching** met Claude API
  - Begrijpt synoniemen: "deur vervangen" = "opdek deur vervangen"
  - Contextueel: "schilderen" matched anders bij "kozijn" vs "radiator"
  
- **Unit conversion**
  - Herkent m2, m1, stu (stuks), etc.
  - Converteert indien nodig
  
- **Confidence scoring**
  - Hoge zekerheid (>90%): auto-accepteren
  - Medium (70-90%): ter review
  - Laag (<70%): handmatige keuze

**4. Excel Generator**
- Laad originele Excel template
- Vul kolom F (Aantal) in "Blad vakman"
- Vul kolom F in "Blad vakman O.A."
- Behoud alle formules en formatting
- Output als downloadable .xlsx

**5. PDF Generator**
- Genereer professionele PDF vanuit Excel data
- Template met:
  - Header (bedrijfsinfo, datum, adres)
  - Tabel met werkzaamheden per ruimte
  - Totalen incl/excl BTW
  - Footer (voorwaarden)

### Web Interface:

**Home Page:**
```
┌─────────────────────────────────────┐
│   OFFERTE GENERATOR                 │
├─────────────────────────────────────┤
│                                     │
│  [Upload Samsung Notes]   📄        │
│  [Upload Prijzenboek]     📊        │
│                                     │
│  [GENEREER OFFERTE]  →              │
│                                     │
└─────────────────────────────────────┘
```

**Processing Page:**
```
┌─────────────────────────────────────┐
│   Verwerking...                     │
├─────────────────────────────────────┤
│  ✓ Document ingelezen               │
│  ✓ 47 werkzaamheden gevonden        │
│  ⏳ Matching met prijzenboek...     │
│     [████████░░] 80%                │
└─────────────────────────────────────┘
```

**Review Page:**
```
┌─────────────────────────────────────────────────────┐
│   Matches Review (47 werkzaamheden gevonden)        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Slaapkamer boven achter                           │
│  ┌───────────────────────────────────────────────┐ │
│  │ "10,6m2 behang verwijderen"                   │ │
│  │ ↓ MATCHED (95% zekerheid)                     │ │
│  │ Prijzenboek: "Behang verwijderen incl. lijm" │ │
│  │ Code: 123456 | €2.50/m2                       │ │
│  │ [✓ Accepteren] [✗ Andere match]              │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ "9,6m2 gipsplaten vervangen"                  │ │
│  │ ↓ MATCHED (88% zekerheid)                     │ │
│  │ Prijzenboek: "Gipsplaten vervangen"          │ │
│  │ [✓ Accepteren] [✗ Andere match]              │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  [ALLE ACCEPTEREN] [GENEREER OFFERTES]            │
└─────────────────────────────────────────────────────┘
```

**Download Page:**
```
┌─────────────────────────────────────┐
│   ✓ Offertes gegenereerd!           │
├─────────────────────────────────────┤
│                                     │
│  📄 [Download Excel Offerte]        │
│  📑 [Download PDF Klant]            │
│  📑 [Download PDF Onderaannemer]    │
│                                     │
│  Totaal: €12.458,50 incl BTW       │
│  47 werkzaamheden                   │
│  6 ruimtes                          │
│                                     │
│  [NIEUWE OFFERTE]                   │
└─────────────────────────────────────┘
```

## Tech Stack Suggestie

### Frontend:
- **React** met TypeScript
- **Tailwind CSS** voor styling
- **Shadcn/ui** voor components
- **React Dropzone** voor file uploads
- **Recharts** voor visualisaties (optioneel)

### Backend:
- **Python FastAPI** of **Node.js Express**
- **Claude API** voor semantische matching
- **openpyxl** (Python) voor Excel manipulatie
- **mammoth** voor docx parsing
- **PyPDF2** of **ReportLab** voor PDF generatie
- **fuzzywuzzy** voor fuzzy text matching

### Storage:
- **Local file system** voor uploads (tijdelijk)
- **SQLite** of **PostgreSQL** voor matching history/cache
- **Redis** (optioneel) voor session management

## Data Structuren

### Parsed Opname:
```json
{
  "metadata": {
    "datum": "2025-11-05",
    "adres": "Voorofscheweg 218",
    "opzichter": "Mireille Onos"
  },
  "ruimtes": [
    {
      "naam": "Slaapkamer boven achter",
      "werkzaamheden": [
        {
          "omschrijving": "behang verwijderen",
          "hoeveelheid": 10.6,
          "eenheid": "m2"
        },
        {
          "omschrijving": "gipsplaten vervangen",
          "hoeveelheid": 9.6,
          "eenheid": "m2"
        }
      ]
    }
  ]
}
```

### Match Result:
```json
{
  "opname_item": {
    "ruimte": "Slaapkamer boven achter",
    "omschrijving": "behang verwijderen",
    "hoeveelheid": 10.6,
    "eenheid": "m2"
  },
  "prijzenboek_match": {
    "code": "123456",
    "omschrijving": "Behang verwijderen incl. lijmresten",
    "eenheid": "m2",
    "prijs_excl": 2.50,
    "prijs_incl": 3.025,
    "btw_laag": 0.225,
    "btw_hoog": 0.30
  },
  "confidence": 0.95,
  "match_type": "fuzzy+semantic",
  "status": "accepted"
}
```

## API Endpoints

```
POST /api/upload/notes
POST /api/upload/prijzenboek
POST /api/process/parse
POST /api/process/match
POST /api/matches/accept/{id}
POST /api/matches/reject/{id}
POST /api/generate/excel
POST /api/generate/pdf-klant
POST /api/generate/pdf-oa
GET  /api/session/{id}/status
```

## Matching Algoritme Flow

```
1. Parse opname notitie
   ↓
2. Voor elke werkzaamheid:
   ↓
3. Fuzzy match (top 5 kandidaten)
   ↓
4. Claude API semantische matching
   ↓
5. Score berekening:
   - Tekst similarity: 40%
   - Semantic match: 40%
   - Eenheid match: 20%
   ↓
6. Beste match selecteren
   ↓
7. Confidence check:
   - >90% → Auto accept
   - 70-90% → Manual review
   - <70% → Manual selection required
```

## Voorbeeld Bestanden

### Input: Samsung Notes (zie uploads)
- **Voorofscheweg_218_251107_094114.docx**
  - 6 ruimtes
  - ~47 werkzaamheden
  - Gestructureerd met bullet points

### Prijzenboek (zie uploads)
- **Opnamelijst_-_Woonforte_2025_22-04__Nieuw_.xlsm**
  - Sheet "Prijzenboek": 1697 items
  - Sheet "Blad vakman": Template klant offerte
  - Sheet "Blad vakman O.A.": Template onderaannemer offerte

## Matching Voorbeelden

| Opname Notitie | Beste Match Prijzenboek | Code |
|----------------|------------------------|------|
| "behang verwijderen 10,6m2" | "Behang verwijderen incl. lijmresten" | 234567 |
| "gipsplaten vervangen 9,6m2" | "Gipsplaten wand vervangen" | 345678 |
| "Opdek deur vervangen rechts 83x201" | "Opdek binnendeur rechts 83x201 incl. beslag" | 456789 |
| "Radiator demonteren" | "Radiator demonteren en opnieuw aanbrengen" | 567890 |

## Security & Privacy

- ✅ Geen data opslag langer dan sessie duur
- ✅ Files worden gewist na processing
- ✅ Claude API via secure backend (geen client-side keys)
- ✅ HTTPS verplicht
- ✅ Rate limiting op API calls

## Performance Requirements

- **Upload**: <5 sec voor 5MB bestand
- **Parsing**: <10 sec voor 50 werkzaamheden
- **Matching**: <30 sec voor 50 werkzaamheden
- **Excel generatie**: <5 sec
- **PDF generatie**: <10 sec

## Future Enhancements (Nice to Have)

1. **Learning systeem**: Train op goedgekeurde matches
2. **Multi-user**: Verschillende prijzenboeken per gebruiker
3. **Template management**: Eigen Excel templates uploaden
4. **Batch processing**: Meerdere opnames tegelijk
5. **Mobile app**: Foto's maken → direct proces
6. **Integratie**: Koppeling met ERP/CRM systemen

## Success Criteria

✅ **90%+ correcte matches** (zonder handmatige correctie)
✅ **<5 minuten** van upload tot download
✅ **Excel formules blijven intact**
✅ **PDF's zijn presentabel** voor klanten
✅ **Gebruiksvriendelijk** voor niet-technische gebruikers

## Development Prioriteit

### Phase 1 (MVP):
1. File upload interface
2. Document parser
3. Basic fuzzy matching
4. Excel generator
5. Simple review interface

### Phase 2:
1. Claude API semantische matching
2. Confidence scoring
3. PDF generator
4. Betere UI/UX

### Phase 3:
1. Learning & improvement
2. Analytics dashboard
3. Advanced features

## Claude API Integration

### Voor semantische matching:

```python
# Voorbeeld Claude API call voor matching
prompt = f"""
Gegeven deze werkzaamheid uit een bouwopname:
"{opname_werkzaamheid}"

En deze top 5 kandidaten uit het prijzenboek:
1. {kandidaat_1}
2. {kandidaat_2}
3. {kandidaat_3}
4. {kandidaat_4}
5. {kandidaat_5}

Welke kandidaat is de beste match? 
Geef antwoord in JSON format met score 0-100 per kandidaat.
"""
```

## Contact & Questions

**Developer:** Claude Code
**Opdrachtgever:** Joel (Nippon Express NEC Logistics)
**Project Type:** Internal tool / Productivity enhancement
**Timeline:** MVP in 2-3 dagen development

---

## SAMENGEVAT: START INSTRUCTIE VOOR CLAUDE CODE

**Bouw een web app met:**
- Upload interface voor Samsung Notes + Excel prijzenboek
- Parser die werkzaamheden extracteert uit notes
- Matching engine (fuzzy + Claude API) die werkzaamheden matched met prijzenboek
- Review interface waar gebruiker matches kan checken/aanpassen
- Excel generator die template invult met aantallen
- PDF generator voor professionele offertes
- Download interface voor Excel + PDF outputs

**Start met:** React frontend + Python FastAPI backend + Claude API voor matching

**Prioriteit:** Snelheid en gebruiksgemak boven perfectie
