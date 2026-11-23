// 접수자 웹 API 응답 형식 (mnm-dev `docs/api/openapi.yaml` `/api/receiver/*`, `/api/auth/me`)
import type { Page, Role } from './index';

/** AUTH-03 내 계정. 접수자는 org · inbox_id가 채워진다 */
export type Me = {
  users_id: number;
  role: Role;
  name: string;
  login_id: string | null;
  must_change_pw: boolean;
  org: { org_id: number; name: string; type: string; region_codes: string[] } | null;
  inbox_id: string | null;
};

export type ReceiverStatus = 'new' | 'checking' | 'done';
/** RCV-03 처리 결과 (제안값, receiver_check.result 표준 목록 확정 전). 이력 대신 신고는 proxy_reported */
export type ReceiverResult = 'inspection_request' | 'vet_guide' | 'observe_guide' | 'not_applicable' | 'proxy_reported';
export type DeliveryKind = 'symptom' | 'history';
export type Route = 'call' | 'coop' | 'web' | 'gov';

/** RCV-01 접수 목록 한 줄 */
export type InboxRow = {
  delivery_id: number;
  kind: DeliveryKind;
  status: ReceiverStatus;
  result: ReceiverResult | null;
  farm_name: string;
  address: string | null;
  region_code: string | null;
  cow_tag4: string | null;
  matched_count: number | null;
  history_type: string | null;
  history_report_id: number | null;
  due_date: string | null;
  route: Route;
  approved_at: string;
  received_at: string;
};
export type InboxList = {
  counts: Record<'all' | ReceiverStatus, number>;
  outbreak: { fmd: number; lsd: number; base_at: string | null };
  page: Page<InboxRow>;
};

export type Ratio = { stand: number; lie: number; eat: number };
/** RCV-02 한 장 요약 */
export type InboxDetail = {
  delivery_id: number;
  kind: DeliveryKind;
  status: ReceiverStatus;
  result: ReceiverResult | null;
  route: Route;
  approved_at: string;
  received_at: string;
  farm: { farm_id: number; farm_no: string; name: string; owner_name: string; address: string | null; head_count: number | null; phone_shared: boolean; phone: string | null };
  symptom: {
    symptom_report_id: number;
    cow: { tag4: string; tag_full: string; breed: string | null; sex: string | null; birth_date: string | null } | null;
    matched_symptoms: string[];
    matched_count: number;
    found_at: string | null;
    barn: string | null;
    /** url: 원본 서명 URL (만료 10분). 올라오기 전이면 null. match null = 확인 중·확인 안 됨 */
    photos: { media_id: number; requested_part: string; predicted_part: string | null; match: boolean | null; url: string | null }[];
    video: { media_id: number; url: string | null; ratio: Ratio | null } | null;
  } | null;
  history: { history_report_id: number; type: string; fields: Record<string, string | null>; missing: string[]; due_date: string | null; d_day: number | null; status: string } | null;
  basics: { vaccine: string | null; disinfection: string | null; visit: string | null } | null;
  diary: { date: string; category: string; value: string | null; cow_tag4: string | null }[];
  timeline: { status: ReceiverStatus | null; result: ReceiverResult | null; memo: string | null; at: string; user_name: string | null; org_name: string | null }[];
  guides: { source_doc: string; revised_at: string | null }[];
};

/** RCV-03·04 결과 */
export type StatusResult = { delivery_id: number; status: ReceiverStatus; result: ReceiverResult | null; at: string };

/** RCV-05 신고서 6개 항목 */
export type Form6 = { delivery_id: number; items: { key: string; label: string; value: string | null }[]; missing: string[]; text: string };

/** RCV-06 관할 농가 */
export type AlertState = 'unanswered' | 'waiting' | 'seen';
export type JurisdictionFarm = {
  farm_id: number;
  name: string;
  address: string | null;
  region_code: string | null;
  head_count: number | null;
  phone_masked: string | null;
  phone_shared: boolean;
  phone: string | null;
  last_record_date: string | null;
  recorded_today: boolean;
  next_task: { kind: string; title: string; due_date: string; d_day: number } | null;
  alert_state: AlertState | null;
  reasons: ('unanswered' | 'due_soon' | 'small')[];
};
export type Jurisdiction = { kpis: { due_soon: number; unanswered: number; small_farms: number; recorded_today: number }; farms: JurisdictionFarm[] };

/** RCV-08 게시된 지침 요약 (문서별) */
export type GuideDoc = { source_doc: string; disease: string | null; revised_at: string | null; items: { rule_id: number; text: string; clause: string | null }[] };

/** RCV-09 주간 통계 (최근 7일, 한국 시간) */
export type WeeklyStats = { from: string; to: string; received: number; done: number; with_photo: number; daily: { date: string; count: number }[] };
