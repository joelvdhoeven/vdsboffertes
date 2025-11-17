# Prijzenboek CSV Import Handleiding

## Overzicht

Dit systeem maakt het mogelijk om prijzenboek data te importeren via een vereenvoudigd CSV formaat. Dit is handig voor het snel toevoegen van nieuwe renovatie items zonder alle ruimte kolommen handmatig in te vullen.

## Bestanden

- **`prijzenboek_import_template.csv`** - Voorbeeld CSV bestand met renovatie data
- **`import_prijzenboek_csv.py`** - Import script om CSV data toe te voegen aan Excel prijzenboek
- **`Juiste opnamelijst.xlsx`** - Hoofd Excel prijzenboek bestand

## CSV Formaat

De CSV gebruikt **puntkomma (;)** als delimiter en heeft de volgende kolommen:

```
CODERING DATABASE;OMSCHRIJVING VAKMAN MUTATIE;EENHEID;Materiaal per stuk EXCL BTW;Uren per stuk EXCL BTW;Prijs per stuk EXCL BTW;TOTAAL EXCL BTW;TOTAAL INCL BTW;OMSCHRIJVING OFFERTE MUTATIE
```

### Kolommen

| Kolom | Beschrijving | Voorbeeld |
|-------|--------------|-----------|
| CODERING DATABASE | Unieke code voor het item | 0000011001 |
| OMSCHRIJVING VAKMAN MUTATIE | Beschrijving voor de vakman | Badkamerrenovatie >0 - 2 m² |
| EENHEID | Eenheid van meting | stu, m2, m1 |
| Materiaal per stuk EXCL BTW | Materiaalkosten | 6285.20 |
| Uren per stuk EXCL BTW | Arbeidsuren kosten | 0.00 |
| Prijs per stuk EXCL BTW | Totale prijs per stuk | 6285.20 |
| TOTAAL EXCL BTW | Totaal excl BTW | 0.00 |
| TOTAAL INCL BTW | Totaal incl BTW | 0.00 |
| OMSCHRIJVING OFFERTE MUTATIE | Beschrijving voor offerte | Badkamerrenovatie >0 - 2 m² |

### Voorbeeld Rijen

```csv
0000011001;Badkamerrenovatie >0 - 2 m²;stu;6285.20;0.00;6285.20;0.00;0.00;Badkamerrenovatie >0 - 2 m²
0000021001;Toiletrenovatie gemiddeld 1.10 m² incl. fontein;stu;2759.78;0.00;2759.78;0.00;0.00;Toiletrenovatie gemiddeld 1.10 m² incl. fontein
0000031001;Keukenrenovatie tot en met 1800 mm;stu;4380.76;0.00;4380.76;0.00;0.00;Keukenrenovatie tot en met 1800 mm
```

## Gebruik

### Stap 1: Maak een CSV bestand

Maak een CSV bestand met de vereenvoudigde structuur. Je kunt `prijzenboek_import_template.csv` als voorbeeld gebruiken.

**Belangrijk:**
- Gebruik **puntkomma (;)** als delimiter
- Gebruik **punt (.)** voor decimalen, niet komma
- Zorg dat de CODERING DATABASE uniek is
- Gebruik UTF-8 encoding

### Stap 2: Voer het import script uit

```bash
cd /home/user/vdsboffertes/backend
python3 import_prijzenboek_csv.py
```

Of specificeer een ander CSV bestand:

```bash
python3 import_prijzenboek_csv.py /pad/naar/jouw/bestand.csv
```

Of specificeer zowel CSV als Excel bestand:

```bash
python3 import_prijzenboek_csv.py /pad/naar/csv.csv /pad/naar/excel.xlsx
```

### Stap 3: Verificatie

Het script zal:
1. Een backup maken van het bestaande Excel bestand (met timestamp)
2. Elk item in de CSV verwerken
3. Bestaande items updaten (op basis van CODERING DATABASE)
4. Nieuwe items toevoegen
5. Een samenvatting tonen

Voorbeeld output:
```
================================================================================
PRIJZENBOEK CSV IMPORT
================================================================================
Parsing CSV: /home/user/vdsboffertes/backend/prijzenboek_import_template.csv
Found 17 items in CSV
Backup created: /home/user/vdsboffertes/backend/Juiste opnamelijst_backup_20251114_160531.xlsx
Opening Excel: /home/user/vdsboffertes/backend/Juiste opnamelijst.xlsx
  UPDATED: 0000011001 - Badkamerrenovatie >0 - 2 m²
  ...
Done!
  Added: 0
  Updated: 17
  Total: 17
================================================================================
```

## Wat gebeurt er achter de schermen?

### Ruimte Kolommen

Het vereenvoudigde CSV formaat heeft **geen** ruimte kolommen (Algemeen woning, Hal/Overloop, etc.).

Bij import worden **alle 13 ruimte kolommen automatisch op 0.0 gezet**:
- C: Algemeen woning
- D: Hal/Overloop
- E: Woonkamer
- F: Keuken
- G: Toilet
- H: Badkamer
- I-L: Slaapkamers (4 kolommen)
- M: Zolder
- N: Berging
- O: Meerwerk

Deze kunnen later via het admin panel aangepast worden indien nodig.

### Update vs Add

- **Update**: Als een item met dezelfde CODERING DATABASE al bestaat, wordt het bijgewerkt
- **Add**: Als de code nog niet bestaat, wordt een nieuwe rij toegevoegd

### Backup

Bij elke import wordt automatisch een backup gemaakt:
```
Juiste opnamelijst_backup_YYYYMMDD_HHMMSS.xlsx
```

Je kunt deze bestanden gebruiken om terug te gaan naar een eerdere versie indien nodig.

## Geïmporteerde Renovatie Items

De volgende renovatie items zijn al geïmporteerd:

### Badkamer Renovaties (0000011xxx)
- 0000011001: Badkamerrenovatie >0 - 2 m² (€6,285.20)
- 0000011002: Badkamerrenovatie >2 - 3 m² (€7,351.41)
- 0000011003: Badkamerrenovatie >3 - 4 m² (€8,179.59)
- 0000011004: Badkamerrenovatie >4 - 5 m² (€8,947.05)
- 0000011005: Badkamerrenovatie >5 - 6 m² (€9,759.12)
- 0000011006: Badkamerrenovatie >6 m² (€10,815.94)

### Badkamer Toeslagen (0000011xxx)
- 0000011010: toeslag wasmachine aansluiting vervangen incl. riolering (€160.47)
- 0000011011: toeslag toilet in badkamer incl. aanpassen waterleidingen en riolering (€723.69)
- 0000011012: toeslag radiator vervangen (€182.30)

### Toilet Renovaties (0000021xxx)
- 0000021001: Toiletrenovatie gemiddeld 1.10 m² incl. fontein (€2,759.78)
- 0000021010: Minderwerk toiletrenovatie excl. fontein (-€249.78)

### Keuken Renovaties (0000031xxx)
- 0000031001: Keukenrenovatie tot en met 1800 mm (€4,380.76)
- 0000031002: Keukenrenovatie groter dan 1800 mm (€4,837.87)
- 0000031010: Perilex voorziening t.b.v. elektrisch koken inclusief gasvoorziening afdoppen en verwijderen (€221.64)
- 0000031011: Toeslag keukenladekast (€140.78)

### Overige (0000051xxx, 0010005xxx)
- 0000051050: Coating met Schönox HA Pro (WOONFORTE REGEL) (€14.97 per M2)
- 0010005001: afvalcontainer open 6 m3 alleen van toepassing bij werkzaamheden buiten het prijzenboek om (€354.20)

## Troubleshooting

### Foutmelding: "No module named 'openpyxl'"

Installeer de vereiste packages:
```bash
pip3 install openpyxl
```

### CSV parse errors

Zorg ervoor dat:
- Je puntkomma (;) gebruikt als delimiter
- Je punt (.) gebruikt voor decimalen
- Het bestand UTF-8 encoded is
- Er geen extra komma's in de velden staan

### Excel bestand is locked

Zorg dat het Excel bestand niet geopend is in een andere applicatie.

## Volgende Stappen

Na het importeren van de data kun je:
1. Het Excel bestand openen en verifiëren
2. Via het admin panel (`/admin.html`) de items bekijken en bewerken
3. De nieuwe items gebruiken in offerte generatie

## Contact

Voor vragen of problemen, neem contact op met de systeembeheerder.
