// 어드민 API 응답 형식 (mnm-dev `docs/api/openapi.yaml` `/api/admin/*`)
import type { Role } from './index';

export type HealthStatus = 'normal' | 'delayed' | 'error' | 'unknown';
/** ADM-01 서비스 상태. key: api · db · ai · etl */
export type Health = { components: { key: string; status: HealthStatus; detail: string | null; last_at: string | null }[]; checked_at: string };
/** ADM-01 오늘 수치. ai_error_rate 0~1, 오늘 호출이 없으면 null */
export type TodayMetrics = { records: number; deliveries: number; pending_receipts: number; ai_error_rate: number | null; since: string };

export type UserStatus = 'active' | 'suspended' | 'invited';
/** ADM-02 사용자 목록 한 줄. org = 접수자 소속 기관 또는 농가 담당 축협 */
export type AdminUserRow = {
  users_id: number;
  role: Role;
  name: string;
  login_id: string | null;
  phone_masked: string | null;
  org_id: number | null;
  org_name: string | null;
  farm_no: string | null;
  farm_name: string | null;
  status: UserStatus;
  last_login_at: string | null;
};
export type AdminFarm = {
  farm_id: number;
  farm_no: string;
  name: string;
  address: string | null;
  region_code: string | null;
  head_count: number | null;
  org_id: number | null;
  org_name: string | null;
  cow_count: number;
  records30d: number;
  delivered_count: number;
};
/** ADM-02 사용자 상세. farm은 농가만 */
export type AdminUser = Omit<AdminUserRow, 'farm_no' | 'farm_name'> & {
  must_change_pw: boolean;
  locked: boolean;
  created_at: string;
  inbox_id: string | null;
  farm: AdminFarm | null;
};

export type OrgType = '축협' | '방역기관' | '시군청';
export type Inbox = { inbox_id?: string; type: 'history' | 'biosecurity'; name: string; phone: string | null; receiver_count?: number };
/** ADM-05 접수 기관 */
export type Org = { org_id: number; name: string; type: OrgType; region_codes: string[]; phone: string | null; inboxes: Inbox[]; receiver_count: number };

export type GuideKind = 'question' | 'photo_guide' | 'action' | 'form_field' | 'summary' | 'clause';
export type GuideStatus = 'draft' | 'review' | 'published';
/** ADM-07·08 안내 문구 내용. 수정할 때 전체를 보낸다 */
export type GuideContent = {
  disease: string | null;
  stage: 'suspect' | 'after_report' | 'regional' | null;
  text: string;
  source_doc: string;
  clause: string | null;
  revised_at: string | null;
  display_order: number | null;
  example_image: string | null;
  part_code: string | null;
  photo_part: string | null;
  yes_required_parts: string[] | null;
};
export type Guide = GuideContent & { biosecurity_rule_id: number; kind: GuideKind; status: GuideStatus; reviewer: string | null; version: number };

/** ADM-12 감사 로그 한 줄 */
export type AuditLog = { audit_log_id: number; at: string; users_id: number | null; user_name: string | null; user_role: Role | null; action: string; target_type: string; target_id: number | null };
