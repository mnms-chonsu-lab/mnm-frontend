// 화면 검토용 배포(API 주소 없음)에서 GET 응답 대신 쓰는 가짜 데이터. 실제 농가 정보가 아닌 예시 값만 쓴다
// 키는 쿼리를 뺀 API 경로. 쿼리(필터·검색)는 무시하고 같은 값을 준다
export * from './farmer';
import type { AdminDelivery, AdminUser, AdminUserRow, AiMetrics, AuditLog, EtlJob, EtlRun, Guide, Health, InferenceLog, Me, Org, Page, TodayMetrics } from '@mnm/api-client';

const page = <R,>(items: R[]): Page<R> => ({ items, has_next: false, next_cursor: null });
const AT = '2026-11-14T01:02:00Z';

const users: AdminUserRow[] = [
  { users_id: 1, role: 'farmer', name: '김한우', login_id: null, phone_masked: '010-****-0937', org_id: 1, org_name: '홍성축협', farm_no: '448012', farm_name: '김한우 농장', status: 'active', last_login_at: AT },
  { users_id: 2, role: 'receiver', name: '박서연', login_id: 'seoyeon.park', phone_masked: '041-***-1200', org_id: 1, org_name: '홍성축협', farm_no: null, farm_name: null, status: 'active', last_login_at: AT },
  { users_id: 3, role: 'farmer', name: '정순자', login_id: null, phone_masked: '010-****-3390', org_id: 1, org_name: '홍성축협', farm_no: '448027', farm_name: '정순자 농장', status: 'active', last_login_at: null },
  { users_id: 4, role: 'admin', name: '운영팀', login_id: 'ops', phone_masked: null, org_id: null, org_name: null, farm_no: null, farm_name: null, status: 'active', last_login_at: AT },
];

const detail = (u: AdminUserRow, more: Partial<AdminUser> = {}): AdminUser => {
  const { farm_no: _no, farm_name: _name, ...rest } = u;
  return { ...rest, must_change_pw: false, locked: false, created_at: AT, inbox_id: null, farm: null, ...more };
};

const orgs: Org[] = [
  {
    org_id: 1, name: '홍성축협', type: '축협', region_codes: ['4480000000'], phone: '041-000-1200', receiver_count: 2,
    inboxes: [
      { inbox_id: 'ib-1', type: 'history', name: '이력 담당', phone: null, receiver_count: 1 },
      { inbox_id: 'ib-2', type: 'biosecurity', name: '방역팀', phone: null, receiver_count: 1 },
    ],
  },
  {
    org_id: 2, name: '홍성군청 축산과', type: '시군청', region_codes: ['4480000000'], phone: '041-000-2000', receiver_count: 1,
    inboxes: [{ inbox_id: 'ib-3', type: 'biosecurity', name: '방역', phone: null, receiver_count: 1 }],
  },
];

const guide = (id: number, display_order: number, text: string, source_doc: string, status: Guide['status'], reviewer: string | null): Guide => ({
  biosecurity_rule_id: id, kind: 'question', disease: '구제역', stage: 'suspect', text, source_doc, clause: '의심증상', revised_at: '2026-05-06',
  display_order, example_image: null, part_code: null, photo_part: null, yes_required_parts: null, status, reviewer, version: 1,
});

const delivery = (d: Partial<AdminDelivery> & Pick<AdminDelivery, 'deliveries_id' | 'approved_at' | 'farmer_name'>): AdminDelivery => ({
  received_at: d.approved_at, farm_id: 1, kind: 'symptom', route: 'coop', org_name: '홍성축협 방역팀', cc_org_name: null, status: 'delivered', receiver_status: 'new', ...d,
});
const run = (id: number, job: EtlRun['job'], status: EtlRun['status'], at: string, rows: number | null, error: string | null = null): EtlRun =>
  ({ etl_job_run_id: id, job, status, started_at: at, finished_at: at, rows, error });
const runs = [run(3, 'disinfection_facility', 'failed', '2026-11-13T21:00:00Z', null, 'API 응답 시간 초과 (3회 재시도)'), run(2, 'disinfection_facility', 'success', '2026-11-12T21:00:00Z', 214)];
const ai = (feature: string | null, calls: number, failures: number, avg: number): AiMetrics['total'] =>
  ({ feature, calls, failures, error_rate: calls ? failures / calls : null, avg_latency_ms: avg, no_evidence: 0, bad_input: 0 });

export const adminMocks: Record<string, unknown> = {
  '/api/auth/me': { users_id: 9, role: 'admin', name: '이운영', login_id: 'ops.lee', must_change_pw: false, org: null, inbox_id: null } satisfies Me,
  '/api/admin/health': {
    checked_at: AT,
    components: [
      { key: 'api', status: 'normal', detail: null, last_at: AT },
      { key: 'db', status: 'normal', detail: null, last_at: AT },
      { key: 'ai', status: 'delayed', detail: '4.1s', last_at: AT },
      { key: 'etl', status: 'normal', detail: null, last_at: '2026-11-13T21:00:00Z' },
    ],
  } satisfies Health,
  '/api/admin/metrics/today': { records: 37, deliveries: 4, pending_receipts: 2, ai_error_rate: 0.008, since: '2026-11-13T15:00:00Z' } satisfies TodayMetrics,
  '/api/admin/users': page(users),
  '/api/admin/users/1': detail(users[0], {
    farm: { farm_id: 1, farm_no: '448012', name: '김한우 농장', address: '충남 홍성군 ○○읍', region_code: '4480000000', head_count: 42, org_id: 1, org_name: '홍성축협', cow_count: 3, records30d: 12, delivered_count: 1 },
  }),
  '/api/admin/users/2': detail(users[1], { inbox_id: 'ib-2' }),
  '/api/admin/users/3': detail(users[2]),
  '/api/admin/users/4': detail(users[3]),
  '/api/admin/orgs': page(orgs),
  '/api/admin/guides': page([
    guide(1, 1, '침을 흘리나요?', '구제역 SOP', 'published', '수의사'),
    guide(2, 2, '입이나 발굽 주변에 물집이 있나요?', '구제역 SOP', 'published', '수의사'),
    guide(3, 3, '사료를 안 먹거나 남기나요?', '구제역 SOP', 'review', null),
  ]),
  '/api/admin/deliveries': page<AdminDelivery>([
    delivery({ deliveries_id: 4, approved_at: '2026-11-02T00:42:00Z', farmer_name: '김한우', route: 'call', org_name: '신고센터', cc_org_name: '홍성축협 방역팀' }),
    delivery({ deliveries_id: 3, approved_at: '2026-11-01T23:15:00Z', farmer_name: '이영수', receiver_status: 'checking' }),
    delivery({ deliveries_id: 2, approved_at: '2026-11-01T11:10:00Z', farmer_name: '김한우', kind: 'birth', org_name: '홍성축협 이력', receiver_status: 'done' }),
    delivery({ deliveries_id: 1, approved_at: '2026-11-01T08:20:00Z', farmer_name: '최민호', route: 'web', status: 'failed', received_at: null, receiver_status: null }),
  ]),
  '/api/admin/etl/jobs': [
    { job: 'outbreak', schedule: 'daily', last_run: run(9, 'outbreak', 'success', '2026-11-13T21:00:00Z', 1284), last_success: run(9, 'outbreak', 'success', '2026-11-13T21:00:00Z', 1284), busy: false },
    { job: 'farm_scale', schedule: 'monthly', last_run: run(8, 'farm_scale', 'success', '2026-10-31T21:10:00Z', 3512), last_success: run(8, 'farm_scale', 'success', '2026-10-31T21:10:00Z', 3512), busy: false },
    { job: 'disinfection_facility', schedule: 'daily', last_run: runs[0], last_success: runs[1], busy: false },
  ] satisfies EtlJob[],
  '/api/admin/etl/jobs/outbreak/runs': page([run(9, 'outbreak', 'success', '2026-11-13T21:00:00Z', 1284)]),
  '/api/admin/etl/jobs/farm_scale/runs': page([run(8, 'farm_scale', 'success', '2026-10-31T21:10:00Z', 3512)]),
  '/api/admin/etl/jobs/disinfection_facility/runs': page(runs),
  '/api/admin/ai-metrics': {
    since: '2026-11-13T01:00:00Z', total: ai(null, 412, 3, 1200),
    features: [ai('stt', 120, 1, 2300), ai('route', 130, 1, 1800), ai('part_check', 80, 1, 800), ai('behavior', 30, 0, 3100), ai('guide', 40, 0, 900), ai('summary', 12, 0, 400)],
    diff_ok_rate: 0.62, diff_feedback_count: 21,
  } satisfies AiMetrics,
  '/api/admin/inference-logs': page<InferenceLog>([
    { inference_log_id: 3, at: '2026-11-14T01:01:22Z', feature: 'stt', model_version: 'whisper-1', input_kind: 'audio', result_summary: 'ok', latency_ms: 2300, error: null, http_status: 200 },
    { inference_log_id: 2, at: '2026-11-14T01:01:25Z', feature: 'route', model_version: 'gpt-4o-mini', input_kind: 'text', result_summary: 'intent=diary', latency_ms: 1800, error: null, http_status: 200 },
    { inference_log_id: 1, at: '2026-11-14T00:58:10Z', feature: 'part_check', model_version: 'siglip2-v1', input_kind: 'image', result_summary: 'hoof → hoof (0.91)', latency_ms: 800, error: null, http_status: 200 },
  ]),
  '/api/admin/audit-logs': page<AuditLog>([
    { audit_log_id: 3, at: '2026-11-14T00:52:00Z', users_id: 2, user_name: '박서연', user_role: 'receiver', action: 'update', target_type: 'delivery', target_id: 1 },
    { audit_log_id: 2, at: '2026-11-14T00:50:00Z', users_id: 2, user_name: '박서연', user_role: 'receiver', action: 'view', target_type: 'delivery', target_id: 1 },
    { audit_log_id: 1, at: '2026-11-13T09:00:00Z', users_id: 4, user_name: '운영팀', user_role: 'admin', action: 'publish', target_type: 'biosecurity_rule', target_id: 3 },
  ]),
};
export * from './receiver';
