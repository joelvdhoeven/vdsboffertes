# 🚀 QUICK START - Offerte Generator met Claude Code

## Wat je hebt ontvangen:

1. **PROJECT_BRIEF_OFFERTE_GENERATOR.md** - Complete project specificatie
2. **Opnamelijst_-_Woonforte_2025_22-04__Nieuw_.xlsm** - Voorbeeld prijzenboek
3. **Voorofscheweg_218_251107_094114.docx** - Voorbeeld opname notities

## Hoe te gebruiken met Claude Code:

### Optie 1: Direct in Claude Code (Terminal)

```bash
# Navigeer naar je project folder
cd ~/projects/offerte-generator

# Start Claude Code
claude-code

# Geef deze instructie aan Claude Code:
"Lees het bestand PROJECT_BRIEF_OFFERTE_GENERATOR.md en bouw de 
web applicatie zoals beschreven. Begin met een MVP versie met:
1. React frontend met upload interface
2. Python FastAPI backend
3. Document parser voor docx/txt
4. Fuzzy matching engine
5. Excel generator die het template invult

Gebruik de meegeleverde bestanden als test data."
```

### Optie 2: Via GitHub Repository

```bash
# Maak een nieuwe repo aan
gh repo create offerte-generator --private

# Push de bestanden
git init
git add .
git commit -m "Initial commit: Project brief en test data"
git push origin main

# Clone in Claude Code environment
claude-code --repo https://github.com/jouw-username/offerte-generator
```

## Wat Claude Code moet bouwen:

### MVP Fase 1 (Start hier!):
✅ Upload interface (drag & drop)
✅ Parse Word document → extracteer werkzaamheden
✅ Parse Excel prijzenboek → laad in database
✅ Fuzzy matching tussen werkzaamheden en prijzenboek
✅ Review interface met matches
✅ Excel generator die aantallen invult

### Fase 2 (Na MVP):
⏳ Claude API integratie voor semantische matching
⏳ Confidence scores en auto-accept
⏳ PDF generator
⏳ Betere UI/UX

## Tech Stack voor Claude Code:

**Frontend:**
```bash
npx create-react-app offerte-generator --template typescript
cd offerte-generator
npm install tailwindcss @shadcn/ui react-dropzone
```

**Backend:**
```bash
pip install fastapi uvicorn openpyxl mammoth fuzzywuzzy python-Levenshtein
```

## Test Flow:

1. Upload `Voorofscheweg_218_251107_094114.docx` als opname
2. Upload `Opnamelijst_-_Woonforte_2025_22-04__Nieuw_.xlsm` als prijzenboek
3. Klik "Verwerk"
4. Check de matches in review screen
5. Genereer Excel met ingevulde aantallen

## Expected Output:

- ✅ Excel bestand met kolom F ingevuld in "Blad vakman"
- ✅ Alle formules intact
- ✅ Herkende ~47 werkzaamheden uit het voorbeeld document

## Tips voor Claude Code:

1. **Start simpel**: Begin met hardcoded matching, verfijn later
2. **Test driven**: Gebruik het voorbeeld document als test case
3. **Iteratief**: Bouw feature-by-feature, niet alles tegelijk
4. **Focus op UX**: Moet super makkelijk zijn voor niet-technische gebruikers

## Vragen tijdens development?

Stuur de vraag terug naar mij (Claude) met context:
- Wat werkt al?
- Wat lukt niet?
- Welke output zie je nu?

## Deployment (later):

```bash
# Frontend
npm run build
# Deploy naar Vercel/Netlify

# Backend
# Deploy naar Railway/Render/DigitalOcean
```

## Success Metrics:

- ⏱️ <5 minuten van upload tot Excel download
- 🎯 >85% correcte matches zonder handmatige correctie
- 😊 Collega's kunnen het zelfstandig gebruiken

---

**LET OP:** Begin met de MVP! Perfectie komt later. 
Eerste doel: werkende prototype in 1-2 dagen.

**VEEL SUCCES! 🚀**
