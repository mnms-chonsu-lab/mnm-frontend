# packages/mocks

가짜 데이터. `VITE_API_BASE_URL`이 비어 있는 빌드(화면 검토용 배포)에서 GET 응답 대신 씁니다.

- 앱이 시작할 때 `setMocks(...)`(`@mnm/api-client`)로 등록합니다. 키는 쿼리를 뺀 API 경로입니다.
- 실제 농가 정보가 아닌 예시 값만 씁니다.
