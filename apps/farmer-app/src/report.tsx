import { useState, type ReactNode } from 'react';
import { api, newKey, type CopyText, type HistoryReport, type ReportType, type SubmitResult } from '@mnm/api-client';
import { Btn, Card, Chips, CopyBtn, Done, Dots, Err, H, Info, Input, KV, P, Phone, Pill, Status, Steps, useApi, useNavigate, useSearchParams } from '@mnm/ui';
import { dday, kday, tagFmt, useId, useSend } from './shared';

/** 신고서 칸 이름과 순서 (mnm-dev `ReportFields`) */
export const FIELD: Record<string, string> = {
  mother_tag4: '어미 소', birth_date: '태어난 날', sex: '성별', breed: '품종', calf_tag: '송아지 귀표',
  cow_tag: '소', death_date: '폐사한 날', move_date: '보낸 날', counterpart_farm_no: '상대 농장식별번호', counterpart_name: '상대 이름',
};
const ORDER: Record<ReportType, string[]> = {
  출생: ['mother_tag4', 'birth_date', 'sex', 'breed', 'calf_tag'],
  폐사: ['cow_tag', 'death_date'],
  양도: ['cow_tag', 'move_date', 'counterpart_farm_no', 'counterpart_name'],
  양수: ['cow_tag', 'move_date', 'counterpart_farm_no', 'counterpart_name'],
  이동: ['cow_tag', 'move_date'],
};
const MOVE: ReportType[] = ['양도', '양수', '이동'];
const MOVE_NAME = ['판 소(양도)', '사 온 소(양수)', '우리 다른 축사로'];

const useReport = () => {
  const id = useId();
  return [id, useApi<HistoryReport>('/api/farmer/history-reports/' + id)] as const;
};
const isDate = (k: string) => k.endsWith('_date');

/** 칸 값 보이기: 소 칸은 "0871번", 날짜는 "11월 1일" */
const show = (r: HistoryReport, k: string) => {
  const v = r.fields[k];
  if (v == null || v === '') return null;
  if (k === 'mother_tag4' || k === 'cow_tag') return (v.length > 4 ? v.slice(-4) : v) + '번';
  return isDate(k) ? kday(v) : k === 'calf_tag' ? tagFmt(v) : v;
};

/** 한 칸 입력: 성별은 고르기, 날짜는 달력, 나머지는 글자 */
function FieldInput({ k, value, onChange, err }: { k: string; value: string; onChange: (v: string) => void; err?: string }) {
  if (k === 'sex') return <><Chips items={['암', '수']} on={['암', '수'].indexOf(value)} onPick={(i) => onChange(['암', '수'][i])} /><Err>{err}</Err></>;
  return <Input label={FIELD[k] ?? k} type={isDate(k) ? 'date' : 'text'} inputMode={/tag|farm_no/.test(k) ? 'numeric' : undefined} value={value} onChange={(e) => onChange(e.target.value)} err={err} />;
}

export function FS04Q() {
  const nav = useNavigate();
  const [id, r] = useReport();
  const [v, setV] = useState('');
  const x = r.data;
  const k = x?.missing[0];
  const { submit, err, busy } = useSend(async () => {
    const next = await api<HistoryReport>('/api/farmer/history-reports/' + id, { method: 'PATCH', body: { fields: { [k!]: v.trim() } } });
    setV('');
    if (next.missing.length) r.reload();
    else nav(`${draftPath(next.type)}?id=${id}`, { replace: true });
  });
  return (
    <Phone title="신고서 초안" tab="홈" say={x?.next_question ?? undefined}>
      <Dots n={3} on={2} />
      <Status q={r} />
      {x && k && (
        <>
          <P><b>빈칸 {x.missing.length}개 남았어요</b></P>
          <H center>{x.next_question ?? `${FIELD[k] ?? k}을(를) 알려 주세요`}</H>
          <FieldInput k={k} value={v} onChange={setV} err={err[`fields.${k}`] ?? err[k]} />
          <Err>{err._}</Err>
          <Btn onClick={submit} disabled={busy || !v.trim()}>다음</Btn>
        </>
      )}
      {x && <Btn v="t" to={`${draftPath(x.type)}?id=${id}`}>나중에 채울게요</Btn>}
    </Phone>
  );
}

const draftPath = (t: ReportType) => (t === '출생' ? '/f-s04' : t === '폐사' ? '/f-s04d' : '/f-s04m');

/** 신고서 초안 (출생·폐사·양도·양수·이동 공용). 종류는 서버 값으로 정한다 */
function Draft() {
  const [id, r] = useReport();
  const x = r.data;
  const [typeErr, setTypeErr] = useState<string>();
  const pickType = (i: number) =>
    api<HistoryReport>('/api/farmer/history-reports/' + id, { method: 'PATCH', body: { type: MOVE[i], fields: {} } }).then(r.reload, (e) => setTypeErr(e.message));
  const rows = x ? ORDER[x.type].map((k): [string, ReactNode, boolean, string?] => {
    const v = show(x, k);
    const to = x.status !== 'draft' ? undefined : k === 'calf_tag' ? `/f-p02?id=${id}` : `/f-s04q?id=${id}`;
    return [FIELD[k], v ?? (k === 'calf_tag' || k === 'counterpart_name' ? '없으면 비워 두기' : '눌러서 입력') + (to ? ' ›' : ''), v == null && x.missing.includes(k), v == null ? to : undefined];
  }) : [];
  return (
    <Phone title="신고서 초안" tab="홈" say={x ? `${x.type} 신고서를 미리 써 두었어요.${x.due_date ? ` 기한은 ${kday(x.due_date)}이에요.` : ''}` : undefined}>
      <Dots n={3} on={2} />
      <Status q={r} />
      {x && (
        <>
          <H center>{x.type} 신고서를<br /><em>미리 써 두었어요</em></H>
          {x.due_date && <P center><Pill tone="w">기한 {kday(x.due_date)} · {dday(x.d_day)}</Pill></P>}
          {MOVE.includes(x.type) && x.status === 'draft' && <Chips items={MOVE_NAME} on={MOVE.indexOf(x.type)} onPick={pickType} />}
          <Err>{typeErr}</Err>
          <KV rows={rows} />
          <P center>말로 남긴 기록과 내 소 목록에서 채웠어요</P>
          {x.status === 'draft' ? (
            <>
              <Card>
                <span><b>직접 제출</b>: 신고서 항목을 보고 내가 이력제에 신고</span>
                <span><b>축협에 부탁</b>: 빈칸이 있어도 돼요</span>
              </Card>
              <Btn to={`/f-s05?id=${id}`}>신고서 보고 직접 제출</Btn>
              <Btn v="t" to={`/f-s06?id=${id}`}>축협에 대신 부탁하기</Btn>
            </>
          ) : (
            <Info tone="ok">{x.status === 'done' ? '신고를 마친 신고서예요.' : `${x.farm.org_name ?? '축협'}에 부탁한 신고서예요.`}</Info>
          )}
        </>
      )}
    </Phone>
  );
}

export const FS04 = Draft;
export const FS04D = Draft;
export const FS04M = Draft;

export function FS05() {
  const id = useId();
  const nav = useNavigate();
  const c = useApi<CopyText>(`/api/farmer/history-reports/${id}/copy-text`);
  const { submit, err, busy } = useSend(async () => {
    const s = await api<SubmitResult>(`/api/farmer/history-reports/${id}/submit`, { method: 'POST', body: { mode: 'self' } });
    nav(`/f-s07?mode=self${s.ear_tag_due ? '&due=' + s.ear_tag_due : ''}`, { replace: true });
  });
  const x = c.data;
  return (
    <Phone title={x?.title ?? '신고서'} tab="홈">
      <H center>이 내용으로<br /><em>신고할까요?</em></H>
      <Status q={c} />
      {x && (
        <>
          <KV rows={x.lines.map((l): [string, string, boolean] => [l.label, l.value, l.value === '(빈칸)'])} />
          <CopyBtn text={x.text}>항목 전체 복사</CopyBtn>
          {x.can_submit ? (
            <Info>축산물이력제 신고 앱이나 축협에서 신고를 마치면 아래 버튼을 눌러 주세요</Info>
          ) : (
            <Info tone="w">빈칸을 채워야 직접 신고할 수 있어요. 빈칸이 있으면 축협에 부탁해 주세요.</Info>
          )}
          <Err>{err._}</Err>
          <Btn onClick={submit} disabled={busy || !x.can_submit}>신고 마쳤어요</Btn>
          {!x.can_submit && <Btn v="s" to={`/f-s04q?id=${id}`}>빈칸 채우기</Btn>}
        </>
      )}
    </Phone>
  );
}

export function FS06() {
  const nav = useNavigate();
  const [id, r] = useReport();
  const [key] = useState(newKey); // 다시 눌러도 한 번만 부탁된다
  const { submit, err, busy } = useSend(async () => {
    const s = await api<SubmitResult>(`/api/farmer/history-reports/${id}/submit`, { method: 'POST', body: { mode: 'coop' }, headers: { 'Idempotency-Key': key } });
    nav(`/f-s07?mode=coop&org=${encodeURIComponent(s.org_name ?? '')}`, { replace: true });
  });
  const x = r.data;
  const org = x?.farm.org_name ?? '담당 축협';
  return (
    <Phone title="축협에 부탁하기" tab="홈">
      <Status q={r} />
      {x && (
        <>
          <H center><em>{org}</em>에<br />대신 부탁할까요?</H>
          <KV rows={[['보내는 것', `${x.type} 신고서 초안 · ${x.type} 기록`], ['받는 곳', `${org} 이력 담당`], ['빈칸', x.missing.length ? x.missing.map((k) => FIELD[k] ?? k).join(', ') + ' · 축협이 확인' : '없음']]} />
          <Card>
            <b>이렇게 진행돼요</b>
            <span>1. 축협 담당자가 초안을 확인해요</span>
            <span>2. 필요하면 전화로 물어봐요</span>
            <span>3. 대신 신고하면 알림으로 알려 드려요</span>
          </Card>
          <Err>{err._}</Err>
          <Btn onClick={submit} disabled={busy}>네, 부탁할게요</Btn>
          <Btn v="t" to={-1}>아니요</Btn>
        </>
      )}
    </Phone>
  );
}

export function FS07() {
  const [q] = useSearchParams();
  const coop = q.get('mode') !== 'self';
  const due = q.get('due');
  return (
    <Phone title={coop ? '부탁 완료' : '신고 완료'} back={false} tab="홈">
      <Done />
      <H center>{coop ? `${q.get('org') || '축협'}에 부탁했어요` : '신고를 마쳤어요'}</H>
      {coop && (
        <Card>
          <Steps n={3} on={0} />
          <span>전달됨 · 축협 확인 중 · 신고 완료</span>
        </Card>
      )}
      {due && (
        <Card>
          <b>다음 할 일</b>
          <span>귀표를 <b>{kday(due)}</b>까지 달아 주세요. 홈 할 일에 넣어 두었어요.</span>
        </Card>
      )}
      <Btn v="s" to="/f-s15">농장 일지 보기</Btn>
      <Btn to="/f-s01">처음 화면으로</Btn>
    </Phone>
  );
}
