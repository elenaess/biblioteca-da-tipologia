#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
REPO_NAME="${1:-biblioteca-da-tipologia}"
OWNER="${GITHUB_OWNER:-elenaess}"

command -v git >/dev/null || { echo 'Instale git: pkg install git'; exit 1; }
command -v gh >/dev/null || { echo 'Instale GitHub CLI: pkg install gh'; exit 1; }

gh auth status >/dev/null 2>&1 || gh auth login

if [ ! -d .git ]; then
  git init
  git branch -M main
fi

git add .
if ! git diff --cached --quiet; then
  git -c user.name="Elena" -c user.email="ehrenren629@gmail.com" commit -m "feat: Biblioteca da Tipologia"
fi

if gh repo view "$OWNER/$REPO_NAME" >/dev/null 2>&1; then
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$OWNER/$REPO_NAME.git"
  git push -u origin main
else
  gh repo create "$REPO_NAME" --public --source=. --remote=origin --push
fi

echo
echo "Repositorio: https://github.com/$OWNER/$REPO_NAME"
echo "Os workflows de Pages e APK iniciam no push para main."
echo "Se Pages ainda nao estiver habilitado: Settings > Pages > Source: GitHub Actions."
