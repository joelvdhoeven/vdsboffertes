"""
FastAPI backend for Offerte Generator MVP
"""
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import sys
import shutil
from pathlib import Path
import uuid

# Add backend directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))

# Import backend modules
try:
    # Try relative imports first (when running as package)
    from .document_parser import parse_docx_opname
    from .excel_parser import parse_prijzenboek
    from .matcher import match_werkzaamheden
    from .excel_generator import generate_filled_excel
except ImportError:
    # Fall back to absolute imports (when running directly)
    from document_parser import parse_docx_opname
    from excel_parser import parse_prijzenboek
    from matcher import match_werkzaamheden
    from excel_generator import generate_filled_excel

app = FastAPI(title="Offerte Generator API", version="1.0.0")

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*",  # Allow all origins
        "https://vdsboffertes-production.up.railway.app",
        "https://vdsboffertes.vercel.app",
    ],
    allow_credentials=False,  # Must be False when using "*" origin
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Storage paths
UPLOAD_DIR = Path("/tmp/uploads") if os.getenv("RAILWAY_ENVIRONMENT") else Path("../uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# In-memory storage for sessions (in production, use Redis or DB)
sessions = {}


class MatchReview(BaseModel):
    """Model for match review data"""
    werkzaamheid_id: str
    prijzenboek_code: str
    accepted: bool


class GenerateRequest(BaseModel):
    """Model for generate request"""
    session_id: str
    matches: List[MatchReview]


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "Offerte Generator API is running"}


@app.post("/api/upload/notes")
async def upload_notes(file: UploadFile = File(...)):
    """Upload Samsung Notes document (docx/txt)"""
    try:
        # Validate file type
        if not file.filename.endswith(('.docx', '.txt', '.pdf')):
            raise HTTPException(status_code=400, detail="Only .docx, .txt, and .pdf files are supported")

        # Create session
        session_id = str(uuid.uuid4())
        session_dir = UPLOAD_DIR / session_id
        session_dir.mkdir(exist_ok=True)

        # Save file
        notes_path = session_dir / f"notes_{file.filename}"
        with open(notes_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Store session
        sessions[session_id] = {
            "notes_path": str(notes_path),
            "prijzenboek_path": None,
            "parsed_opname": None,
            "prijzenboek_data": None,
            "matches": None
        }

        return {
            "session_id": session_id,
            "filename": file.filename,
            "message": "Notes uploaded successfully"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/upload/prijzenboek")
async def upload_prijzenboek(session_id: str, file: UploadFile = File(...)):
    """Upload Excel prijzenboek"""
    try:
        # Validate session
        if session_id not in sessions:
            raise HTTPException(status_code=404, detail="Session not found")

        # Validate file type
        if not file.filename.endswith(('.xlsx', '.xlsm', '.xls')):
            raise HTTPException(status_code=400, detail="Only Excel files are supported")

        # Save file
        session_dir = UPLOAD_DIR / session_id
        prijzenboek_path = session_dir / f"prijzenboek_{file.filename}"
        with open(prijzenboek_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Update session
        sessions[session_id]["prijzenboek_path"] = str(prijzenboek_path)

        return {
            "session_id": session_id,
            "filename": file.filename,
            "message": "Prijzenboek uploaded successfully"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/process/parse")
async def process_parse(session_id: str):
    """Parse uploaded documents"""
    try:
        # Validate session
        if session_id not in sessions:
            raise HTTPException(status_code=404, detail="Session not found")

        session = sessions[session_id]

        if not session["notes_path"]:
            raise HTTPException(status_code=400, detail="Notes not uploaded")

        # Parse opname
        parsed_opname = parse_docx_opname(session["notes_path"])
        session["parsed_opname"] = parsed_opname

        # Use default prijzenboek from admin if not uploaded for this session
        if not session["prijzenboek_path"]:
            default_prijzenboek_path = Path(__file__).parent / "Juiste opnamelijst.xlsx"
            if not default_prijzenboek_path.exists():
                raise HTTPException(status_code=404, detail="Default prijzenboek not found. Please upload via admin panel.")
            session["prijzenboek_path"] = str(default_prijzenboek_path)

        # Parse prijzenboek using new parser
        try:
            from .excel_parser_new import parse_prijzenboek_new
        except ImportError:
            from excel_parser_new import parse_prijzenboek_new

        prijzenboek_data = parse_prijzenboek_new(session["prijzenboek_path"])
        session["prijzenboek_data"] = prijzenboek_data

        # Count werkzaamheden
        total_werkzaamheden = sum(
            len(ruimte["werkzaamheden"])
            for ruimte in parsed_opname["ruimtes"]
        )

        return {
            "session_id": session_id,
            "parsed": True,
            "ruimtes": len(parsed_opname["ruimtes"]),
            "werkzaamheden": total_werkzaamheden,
            "prijzenboek_items": len(prijzenboek_data)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/process/match")
async def process_match(session_id: str):
    """Match werkzaamheden with prijzenboek"""
    try:
        # Validate session
        if session_id not in sessions:
            raise HTTPException(status_code=404, detail="Session not found")

        session = sessions[session_id]

        if not session["parsed_opname"] or not session["prijzenboek_data"]:
            raise HTTPException(status_code=400, detail="Documents not parsed yet")

        # Perform matching
        matches = match_werkzaamheden(
            session["parsed_opname"],
            session["prijzenboek_data"]
        )

        session["matches"] = matches

        # Calculate statistics
        high_confidence = sum(1 for m in matches if m["confidence"] >= 0.9)
        medium_confidence = sum(1 for m in matches if 0.7 <= m["confidence"] < 0.9)
        low_confidence = sum(1 for m in matches if m["confidence"] < 0.7)

        return {
            "session_id": session_id,
            "total_matches": len(matches),
            "high_confidence": high_confidence,
            "medium_confidence": medium_confidence,
            "low_confidence": low_confidence,
            "matches": matches
        }

    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n\nTraceback:\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=error_detail)


@app.post("/api/matches/update")
async def update_match(session_id: str, match_id: str, prijzenboek_code: str):
    """Update a specific match with a different prijzenboek item"""
    try:
        # Validate session
        if session_id not in sessions:
            raise HTTPException(status_code=404, detail="Session not found")

        session = sessions[session_id]

        if not session["matches"]:
            raise HTTPException(status_code=400, detail="No matches found")

        # Find and update the match
        for match in session["matches"]:
            if match["id"] == match_id:
                # Find the new prijzenboek item
                new_item = None
                for item in session["prijzenboek_data"]:
                    if item["code"] == prijzenboek_code:
                        new_item = item
                        break

                if not new_item:
                    raise HTTPException(status_code=404, detail="Prijzenboek item not found")

                # Update match
                match["prijzenboek_match"] = new_item
                match["confidence"] = 1.0  # Manual selection = 100% confidence
                match["match_type"] = "manual"

                return {"success": True, "match": match}

        raise HTTPException(status_code=404, detail="Match not found")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate/excel")
async def generate_excel(request: GenerateRequest):
    """Generate filled Excel file"""
    try:
        # Validate session
        if request.session_id not in sessions:
            raise HTTPException(status_code=404, detail="Session not found")

        session = sessions[request.session_id]

        if not session["matches"]:
            raise HTTPException(status_code=400, detail="No matches found")

        # Generate Excel file
        output_path = generate_filled_excel(
            template_path=session["prijzenboek_path"],
            matches=session["matches"],
            session_dir=UPLOAD_DIR / request.session_id
        )

        session["output_excel"] = output_path

        return {
            "success": True,
            "file_path": output_path,
            "download_url": f"/api/download/excel/{request.session_id}"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/download/excel/{session_id}")
async def download_excel(session_id: str):
    """Download generated Excel file"""
    try:
        # Validate session
        if session_id not in sessions:
            raise HTTPException(status_code=404, detail="Session not found")

        session = sessions[session_id]

        if not session.get("output_excel"):
            raise HTTPException(status_code=404, detail="Excel file not generated yet")

        file_path = session["output_excel"]
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")

        return FileResponse(
            path=file_path,
            filename="Offerte_Generated.xlsx",
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/session/{session_id}/status")
async def get_session_status(session_id: str):
    """Get session status"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = sessions[session_id]

    return {
        "session_id": session_id,
        "notes_uploaded": session["notes_path"] is not None,
        "prijzenboek_uploaded": session["prijzenboek_path"] is not None,
        "parsed": session["parsed_opname"] is not None,
        "matched": session["matches"] is not None,
        "generated": session.get("output_excel") is not None
    }


# Admin endpoints
@app.get("/api/admin/prijzenboek")
async def get_prijzenboek_admin():
    """Get prijzenboek data for admin panel from database"""
    try:
        # Import database
        try:
            from .database import get_db
        except ImportError:
            from database import get_db

        db = get_db()
        items = db.get_all_items()

        return {
            "items": items,
            "total": len(items)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/admin/prijzenboek")
async def save_prijzenboek_admin(data: Dict[str, Any]):
    """Save updated prijzenboek data to database"""
    try:
        # Import database
        try:
            from .database import get_db
        except ImportError:
            from database import get_db

        db = get_db()
        items = data.get("items", [])

        # Use bulk upsert to update database
        result = db.bulk_upsert(items)

        return {
            "success": True,
            "message": f"Prijzenboek successfully updated (added: {result['added']}, updated: {result['updated']})",
            "items_saved": len(items),
            "added": result['added'],
            "updated": result['updated']
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/admin/prijzenboek/item")
async def add_prijzenboek_item(item: Dict[str, Any]):
    """Add single item to prijzenboek database"""
    try:
        # Import database
        try:
            from .database import get_db
        except ImportError:
            from database import get_db

        db = get_db()
        result = db.upsert_item(item)

        return {
            "success": True,
            "action": result,
            "code": item.get("code", ""),
            "message": f"Item {result}: {item.get('code', '')}"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/admin/prijzenboek/item/{code}")
async def delete_prijzenboek_item(code: str):
    """Delete item from prijzenboek database"""
    try:
        # Import database
        try:
            from .database import get_db
        except ImportError:
            from database import get_db

        db = get_db()
        success = db.delete_item(code)

        if success:
            return {
                "success": True,
                "message": f"Item {code} deleted"
            }
        else:
            raise HTTPException(status_code=404, detail=f"Item {code} not found")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/admin/prijzenboek/clear-all")
async def clear_all_prijzenboek_items():
    """Delete ALL items from prijzenboek database"""
    try:
        # Import database
        try:
            from .database import get_db
        except ImportError:
            from database import get_db

        db = get_db()
        count_before = db.count_items()
        db.clear_all()

        return {
            "success": True,
            "message": f"All {count_before} items deleted from database",
            "items_deleted": count_before
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/admin/prijzenboek/upload")
async def upload_prijzenboek_admin(file: UploadFile = File(...), locale: str = Form("nl")):
    """Upload and replace prijzenboek Excel or CSV file

    Args:
        file: Excel (.xlsx, .xlsm, .xls) or CSV file
        locale: 'nl' for Dutch (decimal comma, semicolon delimiter) or 'en' for English (decimal dot, comma delimiter)
    """
    try:
        # Validate file type
        if not file.filename.endswith(('.xlsx', '.xlsm', '.xls', '.csv')):
            raise HTTPException(status_code=400, detail="Only Excel or CSV files are supported")

        # Import database
        try:
            from .database import get_db
        except ImportError:
            from database import get_db

        db = get_db()

        if file.filename.endswith('.csv'):
            # Handle CSV file with locale support
            import csv
            import io

            content = await file.read()
            text_content = content.decode('utf-8-sig')  # Handle BOM

            # Determine delimiter based on locale
            delimiter = ';' if locale == 'nl' else ','

            # Parse CSV
            reader = csv.reader(io.StringIO(text_content), delimiter=delimiter)
            rows = list(reader)

            if len(rows) < 2:
                raise HTTPException(status_code=400, detail="CSV file must have at least a header and one data row")

            # Skip header row
            prijzenboek_items = []
            for row_num, row in enumerate(rows[1:], start=2):
                if len(row) < 6:
                    continue  # Skip incomplete rows

                # Parse based on locale
                def parse_number(value):
                    if not value:
                        return 0.0
                    value = str(value).strip()
                    if locale == 'nl':
                        # Dutch: comma is decimal separator
                        value = value.replace('.', '').replace(',', '.')
                    return float(value) if value else 0.0

                code = row[0].strip() if len(row) > 0 else ""
                omschrijving = row[1].strip() if len(row) > 1 else ""

                if not code or not omschrijving:
                    continue  # Skip empty rows

                eenheid = row[2].strip().lower() if len(row) > 2 else ""
                materiaal = parse_number(row[3]) if len(row) > 3 else 0.0
                uren = parse_number(row[4]) if len(row) > 4 else 0.0
                prijs_per_stuk = parse_number(row[5]) if len(row) > 5 else 0.0
                omschrijving_offerte = row[6].strip() if len(row) > 6 else omschrijving

                item = {
                    "code": code,
                    "omschrijving": omschrijving,
                    "omschrijving_offerte": omschrijving_offerte,
                    "algemeen_woning": 0.0,
                    "hal_overloop": 0.0,
                    "woonkamer": 0.0,
                    "keuken": 0.0,
                    "toilet": 0.0,
                    "badkamer": 0.0,
                    "slaapk_voor_kl": 0.0,
                    "slaapk_voor_gr": 0.0,
                    "slaapk_achter_kl": 0.0,
                    "slaapk_achter_gr": 0.0,
                    "zolder": 0.0,
                    "berging": 0.0,
                    "meerwerk": 0.0,
                    "totaal": 0.0,
                    "eenheid": eenheid,
                    "materiaal": materiaal,
                    "uren": uren,
                    "prijs_per_stuk": prijs_per_stuk,
                    "totaal_excl": 0.0,
                    "totaal_incl": 0.0,
                    "row_num": row_num
                }

                prijzenboek_items.append(item)
                db.upsert_item(item)

        else:
            # Handle Excel file
            # Save uploaded file
            prijzenboek_path = Path(__file__).parent / "Juiste opnamelijst.xlsx"

            # Backup old file
            backup_path = Path(__file__).parent / "Juiste opnamelijst_backup.xlsx"
            if prijzenboek_path.exists():
                shutil.copy(str(prijzenboek_path), str(backup_path))

            # Save new file
            with open(prijzenboek_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            # Parse the new file to verify it's valid
            try:
                from .excel_parser_new import parse_prijzenboek_new
            except ImportError:
                from excel_parser_new import parse_prijzenboek_new

            prijzenboek_items = parse_prijzenboek_new(str(prijzenboek_path))

            # Save all items to database
            for item in prijzenboek_items:
                db.upsert_item(item)

        return {
            "success": True,
            "message": f"Prijzenboek uploaded successfully ({locale.upper()} format)",
            "items_loaded": len(prijzenboek_items),
            "filename": file.filename,
            "locale": locale
        }

    except Exception as e:
        # Restore backup if upload failed (only for Excel)
        if 'backup_path' in locals() and backup_path.exists():
            shutil.copy(str(backup_path), str(prijzenboek_path))
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
