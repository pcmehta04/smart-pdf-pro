#!/bin/bash
# ==============================================================================
# PCM SMART PDF PRO - 1-CLICK MACOS / IMAC APPLICATION LAUNCHER
# Architect & Sole Copyright Owner: PRAKASH CHAND MEHTA (prakashcmehta@gmail.com)
# ==============================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

PORT=8080

# Start lightweight local Python server if not already active on port 8080
if ! lsof -i :$PORT > /dev/null 2>&1; then
    echo "Starting PCM Smart PDF local server on port $PORT..."
    python3 -m http.server $PORT > /dev/null 2>&1 &
    sleep 1
else
    echo "PCM Smart PDF server is already running on port $PORT."
fi

if [ -f "$DIR/mobile_app/index.html" ]; then
    URL="http://localhost:$PORT/mobile_app/index.html"
else
    URL="http://localhost:$PORT/index.html"
fi

echo "---------------------------------------------------------------"
echo "  PCM Smart PDF Pro - macOS Desktop Edition"
echo "  Opening in Safari: $URL"
echo "---------------------------------------------------------------"
echo ""
echo "TO INSTALL AS STANDALONE APP ON YOUR DOCK / TASKBAR:"
echo "   1. In Safari's top menu bar, click 'File'"
echo "   2. Click 'Add to Dock...'"
echo "   3. Click 'Add' in the dialog"
echo "   PCM Smart PDF is now in your Applications & Dock!"
echo "---------------------------------------------------------------"

open -a Safari "$URL"
