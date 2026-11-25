// 접수자 웹 화면 검토용 가짜 데이터 (API 주소 없는 빌드). 실제 농가 정보가 아닌 예시 값만 쓴다
import type { Form6, GuideDoc, InboxDetail, InboxList, InboxRow, Jurisdiction, Me, WeeklyStats } from '@mnm/api-client';

const row = (r: Partial<InboxRow> & Pick<InboxRow, 'delivery_id' | 'farm_name'>): InboxRow => ({
  kind: 'symptom', status: 'new', result: null, address: '충남 홍성군 ○○읍', region_code: '4480000000', cow_tag4: null, matched_count: null,
  history_type: null, history_report_id: null, due_date: null, route: 'coop', approved_at: '2026-11-02T00:42:00Z', received_at: '2026-11-02T00:42:00Z', ...r,
});
const rows = [
  row({ delivery_id: 1, farm_name: '김한우 농장', cow_tag4: '1234', matched_count: 2, route: 'call' }),
  row({ delivery_id: 2, farm_name: '이영수 농장', cow_tag4: '0871', status: 'checking', approved_at: '2026-11-01T23:15:00Z' }),
  row({ delivery_id: 3, farm_name: '김한우 농장', kind: 'history', history_type: '출생', history_report_id: 1, due_date: '2026-11-05', approved_at: '2026-11-01T11:10:00Z' }),
  row({ delivery_id: 4, farm_name: '최민호 농장', cow_tag4: '5520', status: 'done', result: 'vet_guide', route: 'web', approved_at: '2026-11-01T08:20:00Z' }),
];

const farm = { farm_id: 1, farm_no: '448012', name: '김한우 농장', owner_name: '김한우', address: '충남 홍성군 ○○읍', head_count: 42, phone_shared: true, phone: '010-0000-0937' };
const base = (id: number): Omit<InboxDetail, 'symptom' | 'history'> => ({
  delivery_id: id, kind: 'symptom', status: 'new', result: null, route: 'call', approved_at: '2026-11-02T00:42:00Z', received_at: '2026-11-02T00:42:00Z', farm,
  basics: {
    vaccine: { date: '2026-10-08', category: '접종', value: '전체', vaccine_type: '구제역 백신', cow_tag4: null },
    disinfection: { date: '2026-11-02', category: '소독', value: '2번 축사', vaccine_type: null, cow_tag4: null },
    visit: { date: '2026-10-31', category: '출입', value: '사료 차량', vaccine_type: null, cow_tag4: null },
  },
  diary: [
    { date: '2026-11-02', category: '소독', value: '2번 축사', vaccine_type: null, cow_tag4: null },
    { date: '2026-10-30', category: '관찰', value: '사료 조금 남김', vaccine_type: null, cow_tag4: '1234' },
  ],
  timeline: [],
  guides: [{ source_doc: '구제역 긴급행동지침(SOP)', revised_at: '2026-05-06' }, { source_doc: '가축전염병 예방법 시행규칙 제13조', revised_at: null }],
});

const symptomDetail: InboxDetail = {
  ...base(1),
  symptom: {
    symptom_report_id: 1, cow: { tag4: '1234', tag_full: '002123451234', breed: '한우', sex: '암', birth_date: '2022-03-14' },
    matched_symptoms: ['침 흘림', '사료 남김'], matched_count: 2, found_at: '2026-11-01T23:00:00Z', barn: '2번 축사',
    photos: [{ media_id: 1, requested_part: 'mouth', predicted_part: 'mouth', match: true, url: null }],
    video: { media_id: 2, url: null, ratio: { stand: 20, lie: 70, eat: 10 } },
  },
  history: null,
};

const historyDetail: InboxDetail = {
  ...base(3), kind: 'history', route: 'coop', symptom: null,
  history: { history_report_id: 1, type: '출생', fields: { mother_tag4: '0871', birth_date: '2026-11-01', sex: '암', breed: '한우', calf_tag: null }, missing: [], due_date: '2026-11-05', d_day: 3, status: 'sent' },
};

export const receiverMocks: Record<string, unknown> = {
  '/api/auth/me': { users_id: 2, role: 'receiver', name: '박서연', login_id: 'seoyeon.park', must_change_pw: false, org: { org_id: 1, name: '홍성축협', type: '축협', region_codes: ['4480000000'] }, inbox_id: 'ib-2' } satisfies Me,
  '/api/receiver/inbox': { counts: { all: 4, new: 2, checking: 1, done: 1 }, outbreak: { fmd: 0, lsd: 0, base_at: '2026-11-02T00:00:00Z' }, page: { items: rows, has_next: false, next_cursor: null } } satisfies InboxList,
  '/api/receiver/inbox/1': symptomDetail,
  '/api/receiver/inbox/2': { ...symptomDetail, delivery_id: 2, status: 'checking', route: 'coop' },
  '/api/receiver/inbox/3': historyDetail,
  '/api/receiver/inbox/4': { ...symptomDetail, delivery_id: 4, status: 'done', result: 'vet_guide', route: 'web' },
  '/api/receiver/inbox/1/form6': {
    delivery_id: 1, missing: [],
    items: [
      { key: 'owner_and_location', label: '소유자 성명 및 사육장소', value: '김한우 · 충남 홍성군 ○○읍 · 2번 축사' },
      { key: 'species_and_head_count', label: '가축의 종류 및 두수', value: '한우 1두 (1234번) / 전체 42두' },
      { key: 'condition', label: '질병명(추정 병명 또는 발견 당시 상태)', value: '발견 당시 상태: 침 흘림, 사료 남김' },
      { key: 'found_date', label: '죽은 연월일(불분명 시 발견 연월일)', value: '2026-11-02' },
      { key: 'reporter', label: '신고자 성명 및 주소', value: '김한우 · 충남 홍성군 ○○읍' },
      { key: 'other', label: '그 밖에 필요한 사항', value: null },
    ],
    text: '(화면 검토용 예시)',
  } satisfies Form6,
  '/api/receiver/jurisdiction/farms': {
    kpis: { due_soon: 1, unanswered: 1, small_farms: 1, recorded_today: 1 },
    farms: [
      { farm_id: 2, name: '정순자 농장', address: '충남 홍성군 결성면', region_code: '4480000000', head_count: 12, phone_masked: '010-****-3390', phone_shared: false, phone: null, last_record_date: '2026-10-24', recorded_today: false, next_task: { kind: 'birth_report', title: '출생 신고', due_date: '2026-11-03', d_day: 1 }, alert_state: 'unanswered', reasons: ['unanswered', 'due_soon', 'small'] },
      { farm_id: 1, name: '김한우 농장', address: '충남 홍성군 ○○읍', region_code: '4480000000', head_count: 42, phone_masked: '010-****-0937', phone_shared: true, phone: '010-0000-0937', last_record_date: '2026-11-02', recorded_today: true, next_task: null, alert_state: 'seen', reasons: [] },
    ],
  } satisfies Jurisdiction,
  '/api/receiver/guides': [
    { source_doc: '구제역 긴급행동지침(SOP)', disease: 'FMD', revised_at: '2026-05-06', items: [{ rule_id: 1, text: '(화면 검토용 예시 — 게시된 요약 원문이 여기에 보입니다)', clause: null }] },
  ] satisfies GuideDoc[],
  '/api/receiver/stats/weekly': {
    from: '2026-10-27', to: '2026-11-02', received: 4, done: 2, with_photo: 3,
    daily: ['10-27', '10-28', '10-29', '10-30', '10-31', '11-01', '11-02'].map((d, i) => ({ date: '2026-' + d, count: [1, 0, 2, 1, 0, 2, 3][i] })),
  } satisfies WeeklyStats,
};
