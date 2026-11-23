// 농가 앱 화면 검토용 가짜 데이터 (API 주소 없는 빌드). 실제 농가 정보가 아닌 예시 값만 쓴다
import type { Actions, Alert, Cow, DiaryDay, DiaryDetail, Facility, FarmerMe, HistoryReport, Home, MyFarm, Page, Question, Sent, Settings, Summary, CopyText } from '@mnm/api-client';

const page = <R,>(items: R[]): Page<R> => ({ items, has_next: false, next_cursor: null });

const cow = (id: number, tag: string, sex: string, age: number, barn: string): Cow => ({
  cow_id: id, tag_last4: tag.slice(-4), tag_full: tag, breed: '한우', sex, birth_date: `${2026 - age}-03-14`, age_years: age, barn,
  vaccine_last_date: '2026-04-02', vaccine_last_order: 7, source: 'trace', trace_checked_at: '2026-11-12T00:00:00Z', status: 'active',
});
const cows = [cow(1, '002123451234', '암', 4, '2번 축사'), cow(2, '002123450871', '암', 6, '1번 축사'), cow(3, '002123455520', '수', 2, '3번 축사')];

const days: DiaryDay[] = [
  { date: '2026-11-02', entries: [
    { entry_id: 1, date: '2026-11-02', category: '소독', cow_id: null, cow_tag4: null, value: '2번 축사', vaccine_type: null, head_count: null },
    { entry_id: 2, date: '2026-11-02', category: '관찰', cow_id: 1, cow_tag4: '1234', value: '사료 남김', vaccine_type: null, head_count: null },
  ] },
  { date: '2026-10-30', entries: [{ entry_id: 3, date: '2026-10-30', category: '관찰', cow_id: 1, cow_tag4: '1234', value: '사료 조금 남김', vaccine_type: null, head_count: null }] },
];

const report: HistoryReport = {
  history_report_id: 1, type: '출생', fields: { mother_tag4: '0871', birth_date: '2026-11-01', sex: '암', breed: '한우' }, missing: [], next_question: null, can_submit: true,
  due_date: '2026-11-05', d_day: 3, mode: null, status: 'draft', cows: [],
  farm: { owner_name: '김한우', farm_name: '김한우 농장', farm_no: '448012', address: '충남 홍성군 ○○읍', org_name: '홍성축협' },
};

const q = (rule_id: number, answer_key: Question['answer_key'], text: string): Question => ({ rule_id, answer_key, text, example_image: null, yes_required_parts: [], source_doc: '구제역 긴급행동지침(SOP)', clause: null });

export const farmerMocks: Record<string, unknown> = {
  '/api/auth/me': { users_id: 1, name: '김한우', phone: '010-0000-0937', farm: { farm_id: 1, farm_no: '448012', name: '김한우 농장', head_count: 42, org_id: 1, org_name: '홍성축협' } } satisfies FarmerMe,
  '/api/farmer/home': {
    farmer_name: '김한우', task_count: 1, unread_alert_count: 2,
    tasks: [{ tasks_id: 1, kind: 'birth_report', title: '송아지 출생 신고', due_date: '2026-11-05', d_day: 3, ref_id: 1 }],
    region: { region_name: '홍성군', fmd_count: 0, lsd_count: 0, base_at: '2026-11-02T00:00:00Z' },
  } satisfies Home,
  '/api/farmer/farms/me/cows': page(cows),
  '/api/farmer/diary': page(days),
  '/api/farmer/diary/1': { entry: days[0].entries[0], raw_text: '아침에 2번 축사 소독했고, 1234번이 사료를 좀 남겼어.', audio_url: null, deliveries: [{ delivery_id: 1, approved_at: '2026-11-02T00:42:00Z', org_name: '홍성축협 방역팀', receiver_status: 'done' }] } satisfies DiaryDetail,
  '/api/farmer/history-reports/1': report,
  '/api/farmer/history-reports/1/copy-text': {
    title: '출생 신고서', can_submit: true, text: '(화면 검토용 예시)',
    lines: [{ label: '신고인', value: '김한우' }, { label: '어미 소', value: '0871번' }, { label: '태어난 날', value: '2026-11-01' }, { label: '성별', value: '암' }, { label: '품종', value: '한우' }],
  } satisfies CopyText,
  '/api/farmer/guide/questions': page([q(1, 'drool', '침을 흘리나요?'), q(2, 'blister', '입이나 발굽 주변에 물집이 있나요?'), q(3, 'feed', '사료를 안 먹거나 남기나요?'), q(4, 'lump', '피부에 혹이 있나요?')]),
  '/api/farmer/symptom-reports/1/summary': {
    symptom_report_id: 1, cow: cows[0], matched_count: 2, matched: ['침 흘림', '사료 남김'], observed_text: '사료를 안 먹고 침을 흘려.', head_count: 1, found_date: '2026-11-02', barn: '2번 축사',
    related_diary: [days[1].entries[0]], vaccine: { date: '2026-10-08', value: '구제역 백신' }, photos: [{ media_id: 1, part: 'mouth', match: true, url: null }],
    video: { media_id: 2, url: null, ratio: { stand: 20, lie: 70, eat: 10 } }, disease: 'FMD', delivered: false, form6: null, form6_text: '(화면 검토용 예시)',
  } satisfies Summary,
  '/api/farmer/guide/actions': { disease: 'FMD', guide_name: '구제역 긴급행동지침(SOP)', actions: [{ rule_id: 1, text: '(화면 검토용 예시 — 게시된 조치 문구 원문이 여기에 보입니다)', source_doc: '구제역 긴급행동지침(SOP)', clause: null, revised_at: null }] } satisfies Actions,
  '/api/farmer/facilities/nearest': { name: '홍성 거점소독소', address: null, distance_km: 4.2, operating_hours: '24시간 운영', phone: '041-000-0000' } satisfies Facility,
  '/api/farmer/deliveries/mine': page<Sent>([{ delivery_id: 1, approved_at: '2026-11-02T00:42:00Z', kind: 'symptom', title: '소 상태 기록 (1234번)', route: 'coop', org_name: '홍성축협 방역팀', status: 'delivered', receiver_status: 'done', receiver_result: 'vet_guide', symptom_report_id: 1, history_report_id: null }]),
  '/api/farmer/alerts': page<Alert>([
    { alerts_id: 1, kind: 'diff', title: '1234번, 평소와 다른 모습이 보여요', body: '10월 30일과 11월 2일에 사료 남김을 기록했어요. 한 번 살펴봐 주세요.', ref_id: null, feedback: null, read_at: null, created_at: '2026-11-02T00:00:00Z' },
    { alerts_id: 2, kind: 'deadline', title: '송아지 출생 신고 · 3일 남음', body: null, ref_id: 1, feedback: null, read_at: null, created_at: '2026-11-02T00:00:00Z' },
    { alerts_id: 3, kind: 'result', title: '홍성축협이 기록을 확인했어요', body: '결과: 수의사 진료 안내', ref_id: 1, feedback: null, read_at: '2026-11-02T01:00:00Z', created_at: '2026-11-02T01:00:00Z' },
  ]),
  '/api/farmer/me/settings': { font_step: 1, high_contrast: false, auto_speak: false } satisfies Settings,
  '/api/farmer/me/farm': { farm_no: '448012', farm_name: '김한우 농장', address: '충남 홍성군 ○○읍', owner_name: '김한우', phone: '01000000937', head_count: 42, org_name: '홍성축협', cow_count: 3, sent_count: 1 } satisfies MyFarm,
};
