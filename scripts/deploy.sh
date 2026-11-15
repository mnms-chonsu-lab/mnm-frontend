#!/usr/bin/env bash
# 세 앱을 빌드해 Vercel 운영 주소에 올린다. 사전 조건: `npx vercel login` 또는 환경변수 VERCEL_TOKEN (CI)
# 레포 밖 임시 폴더에서 올린다: Hobby 요금제는 마지막 커밋 작성자가 Vercel 계정 주인이 아니면 배포를 막는다.
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
auth=()
if [ -n "${VERCEL_TOKEN:-}" ]; then auth=(--token "$VERCEL_TOKEN"); fi
for app in farmer-app receiver-web admin; do
  tmp="$(mktemp -d)"
  mkdir -p "$tmp/.vercel/output"
  cp -r "apps/$app/dist" "$tmp/.vercel/output/static"
  # 모든 경로를 index.html로 보낸다 (새로고침·직접 접속 대응)
  echo '{"version":3,"routes":[{"handle":"filesystem"},{"src":"/(.*)","dest":"/index.html"}]}' > "$tmp/.vercel/output/config.json"
  (cd "$tmp" && npx --yes vercel link --yes --project "chonsu-$app" "${auth[@]}" && npx --yes vercel deploy --prebuilt --prod --yes "${auth[@]}")
done
