#!/usr/bin/env bash
set -euo pipefail
source_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
repo='elenaess/biblioteca-da-tipologia'
expected='ddbedc0071397291c5721c30d74fa4e76a3ad515'
for command_name in git gh rsync; do command -v "$command_name" >/dev/null || { echo "Instale antes: pkg install git gh rsync unzip"; exit 1; }; done
if ! gh auth status --hostname github.com >/dev/null 2>&1; then
  gh auth login --hostname github.com --git-protocol https --web --scopes repo,workflow
fi
gh auth setup-git --hostname github.com
work_dir="$(mktemp -d "$HOME/biblioteca-envio.XXXXXX")"
git clone --branch main "https://github.com/$repo.git" "$work_dir/repo"
cd "$work_dir/repo"
if [ "$(git rev-parse HEAD)" != "$expected" ]; then
  echo 'O repositório mudou depois desta entrega. Parei para não sobrescrever novas alterações.'
  echo "A cópia local está em: $work_dir/repo"
  exit 1
fi
# Remove obsolete runtime files, preserving documentation and repository governance.
while IFS= read -r -d '' old_path; do
  case "$old_path" in README*|docs/*|AGENTS.md|LICENSE*|.github/CODEOWNERS) continue ;; esac
  if [ ! -e "$source_dir/$old_path" ]; then git rm -- "$old_path"; fi
done < <(git ls-files -z)
rsync -a --exclude='.git/' --exclude='.openai/' --exclude='node_modules/' --exclude='dist/' --exclude='apps/mobile/android/' --exclude='apps/mobile/ios/' --exclude='apps/mobile/src/generated/' "$source_dir/" ./
if ! git config user.name >/dev/null; then git config user.name 'Elena'; fi
if ! git config user.email >/dev/null; then git config user.email 'elenaess@users.noreply.github.com'; fi
git add --all
if git diff --cached --quiet; then echo 'Nenhuma alteração para enviar.'; exit 0; fi
git commit -m 'Adiciona leitor por capítulos, progresso sincronizado e build Android 1.1.0'
git push origin HEAD:main
commit="$(git rev-parse HEAD)"
echo "Enviado. Commit: $commit"
echo 'O GitHub Actions vai publicar o site e gerar o APK automaticamente.'
echo "Acompanhe: https://github.com/$repo/actions"
echo 'Depois de concluir, o APK fica em Artifacts → Biblioteca-da-Tipologia-APK.'
echo "Para baixar pelo Termux: bash $source_dir/scripts/baixar-apk-termux.sh $commit"
