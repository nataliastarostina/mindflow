#!/bin/bash
# Start the MindFlow static development server
# The static build is in out/ and serves the app at localhost:3000/mindflow/

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="$SCRIPT_DIR/out"
SERVE_DIR="/tmp/mindflow-serve"

# Create serve directory structure matching basePath /mindflow
mkdir -p "$SERVE_DIR/mindflow"
cp -r "$OUT_DIR"/. "$SERVE_DIR/mindflow/"

echo "Starting MindFlow static server at http://localhost:3000/mindflow/"
echo "Editor: http://localhost:3000/mindflow/editor/"
cd "$SERVE_DIR"
python3 -m http.server 3000
