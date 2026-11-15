# mnm-frontend

촌수의사 — 농가 앱(모바일 반응형 웹앱)·접수자 웹·어드민 프론트엔드.

## 폴더 구조

```
mnm-frontend/
├── apps/
│   ├── farmer-app/     # 농가 앱
│   ├── receiver-web/   # 접수자 웹
│   └── admin/          # 어드민
├── packages/
│   ├── ui/             # 공통 디자인 토큰·컴포넌트
│   ├── mocks/          # 가짜 데이터 (API 연동 전 화면 작업용)
│   └── api-client/     # API 호출·타입
├── docs/               # 결정 기록
└── .github/            # 이슈·PR 템플릿, CODEOWNERS, 라벨
```

## 연결 레포

- API: [mnm-dev](https://github.com/mnms-chonsu-lab/mnm-dev)
- AI: [mnm-ai](https://github.com/mnms-chonsu-lab/mnm-ai)

## 브랜치 규칙

`YYYYMMDD_#이슈번호_요약` 브랜치에서 작업하고 `develop`으로 PR을 올립니다. 자세한 규칙은 [CONTRIBUTING.md](./CONTRIBUTING.md).

## 기술 스택

React 18 + TypeScript + Vite, `react-router-dom`, npm workspaces. 디자인 규격은 [DESIGN.md](./DESIGN.md).

## 로컬 실행

```bash
npm install
npm run dev:farmer     # 농가 앱      http://localhost:5173
npm run dev:receiver   # 접수자 웹    http://localhost:5174
npm run dev:admin      # 어드민       http://localhost:5175
npm run build          # 세 앱 모두 빌드 (apps/*/dist)
```

- 경로는 화면 ID 소문자입니다. 예) `F-S01` → `/f-s01`
- `/screens`에서 앱의 전체 화면 목록을 볼 수 있습니다.
- 지금은 화면과 버튼 전환만 있습니다. API 연동·상태 저장은 없습니다.

## 배포 (Vercel)

| 앱 | 주소 |
|---|---|
| 농가 앱 | https://chonsu-farmer.vercel.app |
| 접수자 웹 | https://chonsu-receiver.vercel.app |
| 어드민 | https://chonsu-admin.vercel.app |

```bash
npx vercel login   # 처음 한 번
npm run deploy     # 세 앱 빌드 후 운영 주소에 배포 (Git Bash 필요)
```

- `develop`에 푸시(머지)되면 GitHub Actions가 자동으로 배포합니다. 레포 Secrets에 `VERCEL_TOKEN`이 필요합니다.
- 위 명령은 로컬 작업 폴더의 코드를 그대로 올립니다. 평소에는 자동 배포를 씁니다.
- Vercel Hobby(무료) 요금제의 개인 계정 프로젝트입니다.
