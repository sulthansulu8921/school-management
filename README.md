# Offline School Payment Management System

This is a complete standalone system handling student management, fee generation, collections, and reports, using a Django backend locally embedded within an Electron environment.

## Requirements
- Node.js (v18+)
- Python (v3.10+)

## Quick Start (Development)

### 1. Setup Backend DB
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
```

### 2. Setup & Build Frontend
```bash
cd frontend
npm install
npm run build
```

### 3. Run Application via Electron
```bash
cd electron
npm install
npm start
```

*Note: The `electron/main.js` automatically starts the Django backend locally, waits for it, and then loads the React frontend UI.*

## Packaging for Distribution

To package the application into a standalone executable (e.g., `.app` for Mac or `.exe` for Windows):

```bash
cd electron
npm install electron-builder --save-dev
npm run dist
```
Check the `electron/release/` directory for your packaged bundle.

## Default Credentials
- **Username:** admin
- **Password:** admin
