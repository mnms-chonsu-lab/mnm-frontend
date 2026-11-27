// 농가 앱 API 응답 형식 (mnm-dev `docs/api/openapi.yaml` `/api/farmer/*`)

/** AUTH-03 내 계정 (농가). farm은 농가만 */
export type FarmerMe = {
  users_id: number;
  name: string;
  phone: string | null;
  farm: { farm_id: number; farm_no: string; name: string; head_count: number | null; org_id: number | null; org_name: string | null } | null;
};

export type Region = { region_name: string | null; fmd_count: number; lsd_count: number; base_at: string | null };
export type TaskKind = 'birth_report' | 'death_report' | 'move_report' | 'ear_tag';
/** FARM-05 홈 요약. tasks: 끝내지 않은 할 일 (기한 임박순), ref_id = 이력 신고서 번호 */
export type Home = {
  farmer_name: string;
  task_count: number;
  tasks: { tasks_id: number; kind: TaskKind; title: string; due_date: string | null; d_day: number | null; ref_id: number | null }[];
  unread_alert_count: number;
  region: Region;
};
/** FARM-17 가장 가까운 거점소독시설 (없으면 null) */
export type Facility = { name: string; address: string | null; distance_km: number | null; operating_hours: string | null; phone: string | null } | null;

export type Category = '사육현황' | '접종' | '소독' | '관찰' | '출입' | '출생' | '폐사' | '이동' | '메모';
export type ReportType = '출생' | '폐사' | '양도' | '양수' | '이동';
export type DraftItem = { category: Category; value: string | null; cow_tag4: string | null; cow_id: number | null; vaccine_type: string | null; head_count: number | null };
/** FARM-03·25 저장하지 않은 정리 초안. fallback: text_input(글로 쓰기) · select_input(선택형 입력) */
/** 말 → 글 (F-S08 · F-S08S). 못 알아들으면 text=null, fallback=text_input */
export type SpeechText = { text: string | null; fallback: 'text_input' | null };
export type RecordDraft = {
  raw_text: string | null;
  intent: 'diary' | 'history_report' | 'symptom' | null;
  items: DraftItem[];
  report_type: ReportType | null;
  report_fields: Record<string, string | null> | null;
  missing: string[];
  report_notice: { report_due: string; d_day: number } | null;
  fallback: null | 'text_input' | 'select_input';
  audio_media_id: number | null;
};

/** FARM-06 이력 신고서 */
export type HistoryReport = {
  history_report_id: number;
  type: ReportType;
  fields: Record<string, string | null>;
  missing: string[];
  next_question: string | null;
  can_submit: boolean;
  due_date: string | null;
  d_day: number | null;
  mode: 'self' | 'coop' | null;
  status: 'draft' | 'sent' | 'checking' | 'done';
  cows: { field: string; cow_id: number; tag_last4: string; tag_full: string; breed: string | null; sex: string | null; birth_date: string | null; age_years: number | null }[];
  farm: { owner_name: string; farm_name: string; farm_no: string; address: string | null; org_name: string | null };
};
/** FARM-04 일지 저장 결과 */
export type DiarySaved = { entry_ids: number[]; history_report: HistoryReport | null };
export type CopyText = { title: string; lines: { label: string; value: string }[]; text: string; can_submit: boolean };
export type SubmitResult = { history_report_id: number; status: string; mode: 'self' | 'coop'; delivery_id: number | null; org_name: string | null; ear_tag_due: string | null };

export type DiaryEntry = { entry_id: number; date: string; category: Category | '신고'; cow_id: number | null; cow_tag4: string | null; value: string | null; vaccine_type: string | null; head_count: number | null };
export type DiaryDay = { date: string; entries: DiaryEntry[] };
export type ReceiverStatusF = 'new' | 'checking' | 'done';
/** FARM-26 일지 한 건. audio_url: [듣기] 서명 URL (없으면 null) */
export type DiaryDetail = { entry: DiaryEntry; raw_text: string | null; audio_url: string | null; deliveries: { delivery_id: number; approved_at: string; org_name: string; receiver_status: ReceiverStatusF }[] };

/** FARM-02 소 */
export type Cow = {
  cow_id: number; tag_last4: string; tag_full: string; breed: string | null; sex: string | null; birth_date: string | null; age_years: number | null; barn: string | null;
  vaccine_last_date: string | null; vaccine_last_order: number | null; source: 'trace' | 'manual'; trace_checked_at: string | null; status: string;
};
/** FARM-22 이력제 조회 */
export type CowLookup = { tag_no: string; breed: string | null; sex: string | null; birth_date: string | null; vaccine_last_date: string | null; vaccine_last_order: number | null; already_registered: boolean };

export type AnswerKey = 'drool' | 'blister' | 'feed' | 'lump';
export type Answer = 'yes' | 'no' | 'unknown';
/** FARM-10 공식 증상 질문 */
export type Question = { rule_id: number; answer_key: AnswerKey; text: string; example_image: string | null; yes_required_parts: string[]; source_doc: string; clause: string | null };
export type Part = 'mouth' | 'udder' | 'hoof' | 'flank';
export type Disease = 'FMD' | 'LSD';
/** FARM-11 저장 결과. matched_count는 "예"로 답한 공식 질문 수 (판정 아님) */
export type SymptomSaved = { symptom_report_id: number; matched_count: number; matched: string[]; required_parts: { part: Part; part_name: string; guide: string; guide_rule_id: number }[]; disease: Disease | null };
export type Ratio = { stand: number; lie: number; eat: number };
/** FARM-14 오늘 기록 요약. url은 원본 서명 URL (만료 10분), 올라오기 전이면 null */
export type Summary = {
  symptom_report_id: number;
  cow: Cow | null;
  matched_count: number;
  matched: string[];
  observed_text: string | null;
  head_count: number | null;
  found_date: string | null;
  barn: string | null;
  related_diary: DiaryEntry[];
  vaccine: { date: string; value: string | null } | null;
  photos: { media_id: number; part: Part; match: boolean | null; url: string | null }[];
  video: { media_id: number; url: string | null; ratio: Ratio | null } | null;
  disease: Disease | null;
  delivered: boolean;
  form6: Record<string, string | null> | null;
  form6_text: string | null;
};
/** FARM-12 업로드 양식: upload_url에 fields + file을 multipart POST (저장소 204 = 성공) */
export type UploadForm = { media_id: number; upload_url: string; fields: Record<string, string>; expires_at: string };
export type AiStatus = 'done' | 'pending' | 'failed';
export type PartCheck = { media_id: number; status: AiStatus; match: boolean | null; not_cow: boolean | null; dark: boolean | null; blurry: boolean | null };
export type Behavior = { media_id: number; status: AiStatus; ratio: Ratio | null };
/** FARM-16 지금 할 일 (게시된 조치 문구 원문) */
export type Actions = { disease: Disease; guide_name: string; actions: { rule_id: number; text: string; source_doc: string; clause: string | null; revised_at: string | null }[] };
export type DeliveryRoute = 'call' | 'coop' | 'web' | 'gov';
/** FARM-15 전달 결과 */
export type Delivered = { delivery_id: number; route: DeliveryRoute; status: 'delivered' | 'not_sent'; org_name: string | null; cc_org_name: string | null; approved_at: string; disease: Disease | null; form6_text: string | null };
/** FARM-27 내가 보낸 기록 */
export type Sent = {
  delivery_id: number; approved_at: string; kind: 'symptom' | 'history'; title: string; route: DeliveryRoute; org_name: string | null; status: string;
  receiver_status: ReceiverStatusF; receiver_result: string | null; symptom_report_id: number | null; history_report_id: number | null;
};
/** FARM-18 알림 */
export type Alert = { alerts_id: number; kind: 'diff' | 'deadline' | 'result'; title: string; body: string | null; ref_id: number | null; feedback: 'seen' | 'ok' | null; read_at: string | null; created_at: string };
/** FARM-20 화면 설정. font_step 0~4 */
export type Settings = { font_step: number; high_contrast: boolean; auto_speak: boolean };
export type MyFarm = { farm_no: string; farm_name: string; address: string | null; owner_name: string; phone: string | null; head_count: number | null; org_name: string | null; cow_count: number; sent_count: number };
