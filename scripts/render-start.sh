#!/usr/bin/env bash
# Start script for the Render web service (see render.yaml).
#
# 1. Point Payload's local upload folders at the persistent disk so artwork
#    masters, production assets and public media survive redeploys.
# 2. Run pending database migrations (Payload does not push schema changes in
#    production).
# 3. Start the Next.js server.
set -euo pipefail

DATA_DIR="${RENDER_DATA_DIR:-}"

link_dir() {
  local target="$1" # folder Payload writes to, relative to the repo root
  local store="$2"  # folder on the persistent disk
  mkdir -p "$store"
  if [ -d "$target" ] && [ ! -L "$target" ]; then
    # Carry over anything that shipped with the build, then replace the folder.
    cp -an "$target/." "$store/" 2>/dev/null || true
    rm -rf "$target"
  fi
  mkdir -p "$(dirname "$target")"
  ln -sfn "$store" "$target"
}

if [ -n "$DATA_DIR" ]; then
  link_dir uploads "$DATA_DIR/uploads"
  link_dir public/media "$DATA_DIR/media"
fi

pnpm payload migrate
exec pnpm start
