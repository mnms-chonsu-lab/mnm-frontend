import { useEffect } from 'react';
import { api, apiReady, getSession, type AnswerKey, type Answer, type Cow, type Page, type RecordDraft, type Settings, type Summary, type SymptomSaved } from '@mnm/api-client';
import { Opt, Status, fontSteps, setPrefs, setPrefsSaver, useApi, useAuthForm, useSearchParams } from '@mnm/ui';

/* ---------- 화면 사이에 이어지는 흐름 (새로고침하면 처음부터) ---------- */
/** 말·글 기록 정리 초안 (F-S02 → F-S03 → F-S03E) · 소 상태 확인 (F-S08 → F-S11) */
export const flow: {
  draft?: RecordDraft;
  check: { cowId?: number | null; observed?: string; headCount?: number | null; foundDate?: string; barn?: string; answers: Partial<Record<AnswerKey, Answer>>; saved?: SymptomSaved };
  summary?: Summary;
} = { check: { answers: {} } };

/** ?id= 값. API 주소가 없는 화면 검토용 빌드는 가짜 데이터 1번 */
export const useId = (key = 'id') => useSearchParams()[0].get(key) ?? (apiReady ? '' : '1');

/** 농가 화면 저장 버튼: 보내는 중 · 칸별 문구 · 서버 문구 */
export const useSend = (send: () => Promise<void>) => useAuthForm(send);

/* ---------- 글자 ---------- */
/** "2026-11-02" → "11월 2일" */
export const kday = (date: string | null | undefined) => {
  if (!date) return '-';
  const [, m, d] = date.split('-').map(Number);
  return `${m}월 ${d}일`;
};
/** "2024-05-09" → "2024년 5월 9일" (출생일 등 연도가 필요한 날짜) */
export const kfull = (date: string | null | undefined) => (date ? `${date.slice(0, 4)}년 ${kday(date.slice(0, 10))}` : '-');
/** "002123456789" → "002 1234 5678 9" (귀표 12자리) */
export const tagFmt = (t: string) => t.replace(/^(\d{3})(\d{4})(\d{4})(\d)$/, '$1 $2 $3 $4');
/** "2026-11-02" → "11월 2일 (월)" */
export const kdow = (date: string) => kday(date) + ` (${'일월화수목금토'[new Date(date + 'T00:00:00').getDay()]})`;
/** ISO 시각 → "11월 2일 09:42" */
export const kat = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
export const dday = (n: number | null | undefined) => (n == null ? '' : n < 0 ? `${-n}일 지남` : n === 0 ? '오늘까지' : `${n}일 남음`);
/** "01000000937" → "010-0000-0937" */
export const tel = (p: string) => p.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3');
export const digits = (s: string) => s.replace(/\D/g, '');
/** 입력 중 휴대폰 번호에 하이픈 자동: "0101234" → "010-1234", 11자리 → "010-1234-5678" (최대 11자리) */
export const hyphen = (s: string) => {
  const d = digits(s).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  const mid = d.length === 11 ? 4 : 3;
  return `${d.slice(0, 3)}-${d.slice(3, 3 + mid)}-${d.slice(3 + mid)}`;
};
/** 입력 중 귀표를 3-4-4-1로 띄어 보이기: "0021234" → "002 1234" (최대 12자리) */
export const spaced = (s: string) => {
  const d = digits(s).slice(0, 12);
  return [d.slice(0, 3), d.slice(3, 7), d.slice(7, 11), d.slice(11)].filter(Boolean).join(' ');
};

export const PART: Record<string, string> = { mouth: '입', udder: '젖', hoof: '발굽', flank: '몸 옆면' };
export const RECEIVER: Record<string, string> = { new: '전달됨', checking: '확인 중', done: '확인함' };
// 처리 결과 코드는 제안값 (mnm-dev RCV-03)
export const RESULT: Record<string, string> = {
  inspection_request: '방역기관 검사 요청', vet_guide: '수의사 진료 안내', observe_guide: '경과 관찰 안내', not_applicable: '공식 증상 해당 없음', proxy_reported: '축협이 대신 신고',
};

/* ---------- 소 ---------- */
export const useCows = () => useApi<Page<Cow>>('/api/farmer/farms/me/cows');

/** "1234번". 같은 끝 4자리 소가 또 있으면 축사를 붙인다 ("1234번(2번 축사)") */
export const cowName = (c: Pick<Cow, 'tag_last4' | 'barn' | 'cow_id' | 'tag_full'>, all: Cow[] = []) =>
  c.tag_last4 + '번' + (all.some((x) => x.cow_id !== c.cow_id && x.tag_last4 === c.tag_last4) ? `(${c.barn ?? c.tag_full})` : '');
export const cowDesc = (c: Cow) => [c.breed, c.sex, c.age_years != null && `${c.age_years}세`, c.barn].filter(Boolean).join(' · ');

/** 등록된 소 목록 (F-S08, F-S18 공용). to: 누르면 갈 곳 */
export function CowList({ to, only }: { to: (c: Cow) => string; only?: Cow[] }) {
  const q = useCows();
  const all = q.data?.items ?? [];
  const list = only ?? all;
  return (
    <>
      <Status q={q} empty={q.data && all.length === 0 && '아직 등록된 소가 없어요.'} />
      {list.map((c) => <Opt key={c.cow_id} to={to(c)}>{cowName(c, all)}<small>{cowDesc(c)}</small></Opt>)}
    </>
  );
}

/* ---------- 화면 설정 서버 저장 (FARM-20) ---------- */
setPrefsSaver((p) => {
  if (!apiReady || !getSession()) return;
  const i = fontSteps().findIndex(([, px]) => px === p.font);
  const body: Partial<Settings> = { high_contrast: !!p.hc, auto_speak: !!p.speak, ...(i >= 0 ? { font_step: i } : {}) };
  // 저장이 안 돼도 이 기기에는 적용돼 있다
  api('/api/farmer/me/settings', { method: 'PATCH', body }).catch(() => {});
});

/** 서버에 저장된 화면 설정을 이 기기에 적용한다 (홈·내 정보) */
export function useServerPrefs() {
  useEffect(() => {
    api<Settings>('/api/farmer/me/settings').then(
      (s) => setPrefs({ font: fontSteps()[s.font_step]?.[1], hc: s.high_contrast, speak: s.auto_speak }, false),
      () => {},
    );
  }, []);
}
