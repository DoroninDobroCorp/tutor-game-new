#!/bin/sh
# This script ensures the server restarts automatically after a crash. (test)

while true; do
  echo "[Auto-Restart] Starting Node.js server..."
  # We run the command that directly starts the node process
  node dist/index.js
  echo "[Auto-Restart] Server process exited with code $?. Restarting in 3 seconds..."
  sleep 3
done
