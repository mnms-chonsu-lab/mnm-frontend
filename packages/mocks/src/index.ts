// 화면 검토용 배포(API 주소 없음)에서 GET 응답 대신 쓰는 가짜 데이터. 실제 농가 정보가 아닌 예시 값만 쓴다
// 키는 쿼리를 뺀 API 경로. 쿼리(필터·검색)는 무시하고 같은 값을 준다
export * from './farmer';
import type { AdminUser, AdminUserRow, AuditLog, Guide, Health, Org, Page, TodayMetrics } from '@mnm/api-client';

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

export const adminMocks: Record<string, unknown> = {
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
  '/api/admin/audit-logs': page<AuditLog>([
    { audit_log_id: 3, at: '2026-11-14T00:52:00Z', users_id: 2, user_name: '박서연', user_role: 'receiver', action: 'update', target_type: 'delivery', target_id: 1 },
    { audit_log_id: 2, at: '2026-11-14T00:50:00Z', users_id: 2, user_name: '박서연', user_role: 'receiver', action: 'view', target_type: 'delivery', target_id: 1 },
    { audit_log_id: 1, at: '2026-11-13T09:00:00Z', users_id: 4, user_name: '운영팀', user_role: 'admin', action: 'publish', target_type: 'biosecurity_rule', target_id: 3 },
  ]),
};
export * from './receiver';
