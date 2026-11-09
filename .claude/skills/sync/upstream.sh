#!/usr/bin/env bash
# Herdr's originals that Antoine's copies come from, kept in upstream/ (git) as
# they were when the copies were last brought up to date.
#   bash upstream.sh diff       what Herdr changed since (exit 1 when something changed)
#   bash upstream.sh snapshot   record Herdr's current originals as the new reference
#   bash upstream.sh check      Herdr files used as-is by Antoine's mods that are gone
# Every copy and what Antoine added to it: COPIES.md, next to this script.
set -euo pipefail
HOME_DIR="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
SNAP="$REPO/upstream"
# Original (in Herdr's folder) -> where it lives in the snapshot.
ORIGINALS=(mods/agents mods/spaces mods/tabs layouts/main.json themes/monokai.json
  mods/files/main.js mods/workspace-chrome/spinner.svg mods/confirm/main.js mods/new-menu)

case "${1:-}" in
  snapshot)
    rm -rf "$SNAP"; mkdir -p "$SNAP/mods" "$SNAP/layouts"
    for o in "${ORIGINALS[@]}"; do mkdir -p "$(dirname "$SNAP/$o")"; cp -R "$HOME_DIR/$o" "$SNAP/$o"; done
    # Type declarations are refreshed by Herdr in every mod: not worth comparing.
    find "$SNAP" -name '*.d.ts' -delete
    herdr-app --version > "$SNAP/VERSION"
    echo "Référence enregistrée : $(cat "$SNAP/VERSION")"
    ;;
  diff)
    [ -d "$SNAP" ] || { echo "Pas de référence : lance d'abord « snapshot »." >&2; exit 2; }
    echo "Référence : $(cat "$SNAP/VERSION") — Herdr installé : $(herdr-app --version)"
    changed=0
    for o in "${ORIGINALS[@]}"; do
      diff -ru -x '*.d.ts' "$SNAP/$o" "$HOME_DIR/$o" || changed=1
    done
    [ "$changed" = 0 ] && echo "Aucun changement dans les originaux de Herdr."
    exit "$changed"
    ;;
  check)
    missing=0
    for f in $(grep -rhoE 'mods/[a-z0-9-]+/[A-Za-z0-9_./-]+\.svg' "$HOME_DIR"/mods/antoine* | sort -u); do
      case "$f" in mods/antoine*) continue ;; esac
      [ -e "$HOME_DIR/$f" ] || { echo "Disparu : $f"; missing=1; }
    done
    [ "$missing" = 0 ] && echo "Tous les fichiers de Herdr utilisés existent."
    exit "$missing"
    ;;
  *) echo "Usage : bash upstream.sh diff|snapshot|check" >&2; exit 2 ;;
esac
