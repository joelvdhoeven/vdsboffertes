# Deployment Guide - Offerte Generator

Deze guide helpt je om de Offerte Generator te deployen naar productie.

## Architectuur

- **Frontend** → Vercel (static hosting)
- **Backend** → Railway (gratis FastAPI hosting)

## Stap 1: Deploy Backend naar Railway

### 1.1 Maak Railway Account
1. Ga naar [railway.app](https://railway.app)
2. Sign up met GitHub account

### 1.2 Deploy Backend
1. Klik op "New Project"
2. Selecteer "Deploy from GitHub repo"
3. Kies de `vdsboffertes` repository
4. Railway detecteert automatisch Python
5. Wacht tot deployment klaar is (~2-3 minuten)

### 1.3 Kopieer Backend URL
1. Ga naar je project in Railway
2. Klik op "Settings"
3. Scroll naar "Domains"
4. Klik op "Generate Domain"
5. Kopieer de gegenereerde URL (bijv. `https://vdsboffertes-production.up.railway.app`)

### 1.4 Test Backend
Open in je browser: `https://jouw-app.up.railway.app/`

Je zou moeten zien:
```json
{"status":"ok","message":"Offerte Generator API is running"}
```

## Stap 2: Deploy Frontend naar Vercel

### 2.1 Update Backend URL
1. Open `frontend/config.js`
2. Vervang de URL:
```javascript
// Van:
window.API_BASE_URL = 'http://localhost:8000';

// Naar:
window.API_BASE_URL = 'https://jouw-railway-app.up.railway.app';
```
3. Commit en push deze wijziging:
```bash
git add frontend/config.js
git commit -m "Update API URL for production"
git push origin main
```

### 2.2 Deploy naar Vercel
1. Ga naar [vercel.com](https://vercel.com)
2. Sign up met GitHub account
3. Klik op "Add New..." → "Project"
4. Importeer de `vdsboffertes` repository
5. Vercel detecteert automatisch de configuratie
6. Klik op "Deploy"
7. Wacht ~1 minuut

### 2.3 Test de Applicatie
1. Klik op de gegenereerde Vercel URL (bijv. `https://vdsboffertes.vercel.app`)
2. Je zou de Offerte Generator interface moeten zien
3. Test de upload flow met voorbeeldbestanden

## Stap 3: CORS Configuratie (indien nodig)

Als je CORS errors krijgt, update `backend/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://vdsboffertes.vercel.app",  # Je Vercel URL
        "http://localhost:8080"  # Voor lokale development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Commit en push, Railway zal automatisch re-deployen.

## Alternatief: Render (in plaats van Railway)

Als je Render wilt gebruiken:

1. Ga naar [render.com](https://render.com)
2. Sign up met GitHub
3. Klik op "New +" → "Web Service"
4. Selecteer `vdsboffertes` repository
5. Configuratie:
   - **Name**: vdsboffertes-api
   - **Root Directory**: (laat leeg)
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free
6. Klik "Create Web Service"
7. Kopieer de URL en update `frontend/config.js`

## Troubleshooting

### Backend Deploy Fails
- Check dat `backend/requirements.txt` bestaat
- Controleer Railway logs voor error messages
- Zorg dat Python 3.11 wordt gebruikt (zie `runtime.txt`)

### Frontend toont "Failed to fetch"
- Controleer dat backend URL correct is in `frontend/config.js`
- Check CORS configuratie in `backend/main.py`
- Test backend URL direct in browser

### File Upload Fails
- Railway free tier heeft file size limits (mogelijk probleem voor grote Excel files)
- Overweeg upgrade naar betaald plan of andere hosting

### 404 op Vercel
- Check dat `vercel.json` correct is geconfigureerd
- Controleer dat frontend files in `frontend/` directory staan
- Herstart deployment in Vercel dashboard

## Custom Domain (optioneel)

### Vercel Custom Domain
1. Ga naar project settings in Vercel
2. Klik op "Domains"
3. Voeg je custom domain toe
4. Update DNS records volgens Vercel instructies

### Railway Custom Domain
1. Ga naar project settings in Railway
2. Klik op "Domains"
3. Voeg custom domain toe
4. Update DNS CNAME record

## Monitoring

### Railway Logs
- Ga naar je project in Railway
- Klik op "Deployments"
- Klik op actieve deployment
- Zie logs in real-time

### Vercel Logs
- Ga naar je project in Vercel
- Klik op "Deployments"
- Klik op deployment voor logs

## Kosten

### Free Tier Limits
- **Railway**: 500 uur/maand, $5 gratis credit
- **Vercel**: Unlimited deployments, 100GB bandwidth

Voor normale gebruik is dit meer dan voldoende voor een internal tool.

## Security Checklist

- [ ] Backend URL alleen toegankelijk via HTTPS
- [ ] CORS correct geconfigureerd (alleen toegestaan origins)
- [ ] File uploads limiet ingesteld
- [ ] Geen gevoelige data in environment variables
- [ ] Session cleanup geïmplementeerd (automatisch na N uur)

## Support

Bij problemen:
- Check Railway status: [status.railway.app](https://status.railway.app)
- Check Vercel status: [vercel-status.com](https://www.vercel-status.com)
- Review deployment logs
- Test lokaal met `./start.sh`
