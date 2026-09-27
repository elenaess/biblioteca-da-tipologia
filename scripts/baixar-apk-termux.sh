#!/usr/bin/env bash
set -euo pipefail
repo='elenaess/biblioteca-da-tipologia'
commit="${1:-}"
args=(--repo "$repo" --workflow android-apk.yml --limit 1 --json databaseId --jq '.[0].databaseId')
if [ -n "$commit" ]; then args+=(--commit "$commit"); fi
run_id="$(gh run list "${args[@]}")"
if [ -z "$run_id" ] || [ "$run_id" = 'null' ]; then echo 'O GitHub ainda não iniciou a compilação. Tente novamente em alguns segundos.'; exit 1; fi
gh run watch "$run_id" --repo "$repo" --exit-status
apk_dir="$(mktemp -d "$HOME/biblioteca-apk.XXXXXX")"
gh run download "$run_id" --repo "$repo" --name Biblioteca-da-Tipologia-APK --dir "$apk_dir"
if [ -d "$HOME/storage/downloads" ]; then
  cp "$apk_dir"/*.apk "$HOME/storage/downloads/"
  echo 'APK salvo em Downloads. Toque nele para instalar.'
else
  echo "APK salvo em: $apk_dir"
fi
