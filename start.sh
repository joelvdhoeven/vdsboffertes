#!/bin/bash
# Startup script for Offerte Generator MVP

echo "=================================================="
echo "  Offerte Generator MVP - Startup Script"
echo "=================================================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    exit 1
fi

echo "✓ Python 3 found: $(python3 --version)"

# Check if backend dependencies are installed
echo ""
echo "Checking backend dependencies..."

cd backend

# Check if packages are installed
python3 -c "import fastapi" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Installing backend dependencies..."
    pip3 install -r requirements.txt --quiet
    echo "✓ Dependencies installed"
else
    echo "✓ Dependencies already installed"
fi

# Start the backend server
echo ""
echo "Starting FastAPI backend server..."
echo "API will be available at: http://localhost:8000"
echo "API docs at: http://localhost:8000/docs"
echo ""

python3 main.py &
BACKEND_PID=$!

echo "✓ Backend started (PID: $BACKEND_PID)"

# Wait a moment for backend to start
sleep 2

# Open frontend
echo ""
echo "=================================================="
echo "  Frontend Instructions:"
echo "=================================================="
echo ""
echo "Open the frontend in your browser:"
echo ""
echo "  Option 1: Direct file access"
echo "    file://$(pwd)/../frontend/index.html"
echo ""
echo "  Option 2: HTTP server (recommended)"
echo "    cd ../frontend"
echo "    python3 -m http.server 8080"
echo "    Then open: http://localhost:8080"
echo ""
echo "=================================================="
echo ""
echo "Press Ctrl+C to stop the backend server"
echo ""

# Wait for interrupt
trap "echo ''; echo 'Stopping backend...'; kill $BACKEND_PID; exit 0" INT

wait $BACKEND_PID
