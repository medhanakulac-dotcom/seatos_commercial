#!/usr/bin/env bash
# Link this repo's operator-watch-ai pieces into a Hermes profile (idempotent). Anything already there that is not
# our symlink is moved to <profile>/backups/install-<timestamp>/ first. Config and secrets are NOT touched — see
# profile.example.yaml and .env.example for what the profile needs.
#
#   ./install.sh                      # ~/.hermes/profiles/operator-watch-ai
#   ./install.sh /path/to/profile
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
PROFILE="${1:-$HOME/.hermes/profiles/operator-watch-ai}"
STAMP="$(date +%Y%m%d-%H%M%S)"
[ -d "$PROFILE" ] || { echo "No Hermes profile at $PROFILE" >&2; exit 1; }

link() {  # link <source> <target>
  local src="$1" dst="$2"
  mkdir -p "$(dirname "$dst")"
  if [ -L "$dst" ] && [ "$(readlink "$dst")" = "$src" ]; then echo "ok      ${dst#$PROFILE/}"; return; fi
  if [ -e "$dst" ] || [ -L "$dst" ]; then
    local bak="$PROFILE/backups/install-$STAMP/${dst#$PROFILE/}"
    mkdir -p "$(dirname "$bak")" && mv "$dst" "$bak" && echo "backup  ${dst#$PROFILE/} -> ${bak#$PROFILE/}"
  fi
  ln -s "$src" "$dst" && echo "linked  ${dst#$PROFILE/}"
}

link "$SRC/plugins/operator-hindsight" "$PROFILE/plugins/operator-hindsight"
for skill in "$SRC"/skills/*/*/; do
  skill="${skill%/}"
  link "$skill" "$PROFILE/skills/${skill#$SRC/skills/}"
done

echo
grep -q '^ *provider: operator-hindsight' "$PROFILE/config.yaml" 2>/dev/null \
  || echo "WARN: $PROFILE/config.yaml has no 'memory.provider: operator-hindsight' (see profile.example.yaml)"
grep -q '^HINDSIGHT_API_URL=' "$PROFILE/.env" 2>/dev/null \
  || echo "WARN: $PROFILE/.env has no HINDSIGHT_API_URL (see .env.example)"
echo "Restart the gateway to load changes:  launchctl kickstart -k gui/\$(id -u)/ai.hermes.gateway-$(basename "$PROFILE")"
