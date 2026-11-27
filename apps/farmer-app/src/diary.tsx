import { useEffect, useState } from 'react';
import { api, type Category, type DiaryDay, type DiaryDetail, type DiaryEntry, type DiarySaved, type DraftItem, type HistoryReport, type RecordDraft } from '@mnm/api-client';
import { Btn, Card, Chips, Dots, Err, H, Info, Input, KV, Muted, P, Phone, Pill, Row, Select, Status, useApi, useNavigate, usePage } from '@mnm/ui';
import { AUDIO, MAX_SEC, RECEIVER, audioForm, cowName, flow, isServerErr, kat, kday, kdow, dday, useCows, useId, useRecorder, useSend } from './shared';

/** 정리 초안을 받으면: 음성 인식 실패 → 글로 쓰기, 정리 실패 → 직접 고르기, 아니면 확인 화면 */
const afterDraft = (d: RecordDraft) => {
  flow.draft = d;
  return d.fallback === 'text_input' ? '/f-s02t' : d.fallback === 'select_input' ? '/f-s03e' : '/f-s03';
};

export function FS02() {
  const nav = useNavigate();
  const [blob, setBlob] = useState<Blob>();
  const { on, start: record, stop, micErr } = useRecorder(setBlob);
  const start = () => (setBlob(undefined), void record());
  const { submit, err, busy } = useSend(async () => {
    nav(afterDraft(await api<RecordDraft>('/api/farmer/records/voice', { method: 'POST', body: audioForm(blob!) })));
  });
  return (
    <Phone title="말로 기록하기" tab="홈" say="오늘 한 일을 말씀해 주세요. 말을 마치면 다 말했어요 버튼을 눌러 주세요.">
      <Dots n={3} on={0} />
      <H center>오늘 한 일을<br /><em>말씀해 주세요</em></H>
      {AUDIO ? (
        <button type="button" className="mic" aria-label={on ? '녹음 멈추기' : '녹음 시작'} aria-pressed={on} onClick={on ? stop : start} />
      ) : (
        <Info tone="w">이 화면에서는 녹음이 안 돼요. 글로 써 주세요.</Info>
      )}
      <P center>{on ? <Pill>● 듣고 있어요</Pill> : blob ? <Pill tone="g">녹음했어요</Pill> : <Muted>마이크를 누르고 말씀하세요 (최대 {MAX_SEC}초)</Muted>}</P>
      <Err>{micErr ?? err._ ?? err.audio}</Err>
      <Btn v="t" to="/f-s02t">말 대신 글로 쓰기</Btn>
      <Row>
        <Btn v="t" onClick={start} disabled={on || busy || !AUDIO}>다시 말하기</Btn>
        <Btn onClick={on ? stop : submit} disabled={busy || (!on && !blob)}>{busy ? '정리하는 중…' : '다 말했어요'}</Btn>
      </Row>
    </Phone>
  );
}

const HINTS = ['소독', '관찰', '접종', '출생', '폐사', '이동'];
const TEXT_KEY = 'mnm-text-draft';
/** 쓰던 글을 기기에 임시 저장 (새로고침·다시 들어와도 남게). 저장이 막힌 브라우저면 지금 화면에만 둔다 */
const keepText = (t: string) => {
  try {
    if (t) localStorage.setItem(TEXT_KEY, t);
    else localStorage.removeItem(TEXT_KEY);
  } catch {
    // 사생활 보호 모드 등
  }
};
const keptText = () => {
  try {
    return localStorage.getItem(TEXT_KEY) ?? '';
  } catch {
    return '';
  }
};

export function FS02T() {
  const nav = useNavigate();
  const [text, setTextNow] = useState(() => flow.draft?.raw_text ?? keptText());
  const setText = (f: (t: string) => string) => setTextNow((t) => {
    const v = f(t);
    keepText(v);
    return v;
  });
  const { submit, err, busy } = useSend(async () => {
    let d: RecordDraft;
    try {
      d = await api<RecordDraft>('/api/farmer/records/text', { method: 'POST', body: { text } });
    } catch (e) {
      if (!isServerErr(e)) throw e;
      d = { raw_text: text, intent: null, items: [], report_type: null, report_fields: null, missing: [], report_notice: null, fallback: 'select_input', audio_media_id: null };
    }
    keepText(''); // 정리 초안으로 넘어가면 임시 저장은 지운다 (초안은 flow.draft에 있음)
    nav(afterDraft(d));
  });
  return (
    <Phone title="글로 쓰기" tab="홈" say="오늘 한 일을 글로 써 주세요.">
      <Dots n={3} on={0} />
      <H center>오늘 한 일을<br /><em>써 주세요</em></H>
      {flow.draft?.fallback === 'text_input' && <Info tone="w">말씀을 알아듣지 못했어요. 글로 써 주세요.</Info>}
      <Input label="예: 2번 축사 소독함. 1234번 사료 남김" rows={4} maxLength={2000} value={text} onChange={(e) => setText(() => e.target.value)} err={err.text} />
      <Chips items={HINTS} onPick={(i) => setText((t) => (t ? t + ' ' : '') + HINTS[i])} />
      <Err>{err._}</Err>
      <Btn onClick={submit} disabled={busy || !text.trim()}>{busy ? '정리하는 중…' : '다 썼어요'}</Btn>
      <Btn v="t" to="/f-s02">다시 말로 하기</Btn>
    </Phone>
  );
}

/** 저장한 신고서 → 화면: 빈칸이 있으면 빈칸 묻기, 아니면 종류별 초안 */
export const reportPath = (r: HistoryReport) =>
  (r.missing.length ? '/f-s04q' : r.type === '출생' ? '/f-s04' : r.type === '폐사' ? '/f-s04d' : '/f-s04m') + `?id=${r.history_report_id}`;

const itemText = (x: Pick<DraftItem, 'value' | 'cow_tag4' | 'vaccine_type' | 'head_count'>) =>
  [x.cow_tag4 && `${x.cow_tag4}번`, x.vaccine_type, x.value, x.head_count != null && `${x.head_count}두`].filter(Boolean).join(' ') || '-';

const NoDraft = () => (
  <>
    <Info tone="w">확인할 기록이 없어요. 처음부터 다시 말씀해 주세요.</Info>
    <Btn to="/f-s02">말로 기록하기</Btn>
  </>
);

export function FS03() {
  const nav = useNavigate();
  const d = flow.draft;
  const { submit, err, busy } = useSend(async () => {
    const r = await api<DiarySaved>('/api/farmer/diary', {
      method: 'POST',
      body: {
        raw_text: d!.raw_text,
        audio_media_id: d!.audio_media_id,
        items: d!.items.map(({ category, value, cow_id, vaccine_type, head_count }) => ({ category, value, cow_id, vaccine_type, head_count })),
        report: d!.report_type ? { type: d!.report_type, fields: d!.report_fields ?? {} } : null,
      },
    });
    flow.draft = undefined;
    nav(r.history_report ? reportPath(r.history_report) : '/f-s15', { replace: true });
  });
  const say = d ? `이렇게 적을까요? ${d.items.map((x) => `${x.category} ${itemText(x)}`).join(', ')}. 맞으면 저장할게요 버튼을 눌러 주세요.` : undefined;
  return (
    <Phone title="기록 확인" tab="홈" say={say}>
      <Dots n={3} on={1} />
      <H center>이렇게 <em>적을까요?</em></H>
      {!d || d.items.length === 0 ? <NoDraft /> : (
        <>
          {/* 날짜는 기록일(오늘). 출생일은 고칠 곳이 없어 링크 없음 */}
          <KV rows={[['날짜', '오늘 ›', false, '/f-s03e'], ...(d.report_fields?.birth_date ? [['태어난 날', kday(d.report_fields.birth_date)] as [string, string]] : []), ...d.items.map((x, i): [string, string, boolean, string] => [x.category + (d.items.filter((y) => y.category === x.category).length > 1 ? ` ${i + 1}` : ''), itemText(x) + ' ›', false, '/f-s03e'])]} />
          {d.items.some((x) => x.cow_tag4 && !x.cow_id) && <Info tone="w">내 소 목록에 없는 귀표 번호가 있어요. 고칠게요를 눌러 소를 골라 주세요.</Info>}
          {d.report_type && d.report_notice && (
            <Info tone="w">{d.report_type} 신고는 <b>{kday(d.report_notice.report_due)}까지</b>({dday(d.report_notice.d_day)}) 해야 해요. 저장하면 신고서 초안을 써 둘게요.</Info>
          )}
          <Err>{err._ ?? Object.values(err)[0]}</Err>
          <Btn onClick={submit} disabled={busy}>네, 저장할게요</Btn>
          <Btn v="s" to="/f-s03e">고칠게요</Btn>
        </>
      )}
    </Phone>
  );
}

const KINDS: Category[] = ['사육현황', '접종', '소독', '관찰', '출입', '출생', '폐사', '이동', '메모'];
const blank = (): DraftItem => ({ category: '관찰', value: '', cow_tag4: null, cow_id: null, vaccine_type: null, head_count: null });

/** 한 항목 고치기: 종류 · 소 · 내용 */
function ItemEdit({ x, onChange, err = {} }: { x: DraftItem; onChange: (x: DraftItem) => void; err?: Record<string, string> }) {
  const cows = useCows().data?.items ?? [];
  return (
    <Card>
      <Chips items={KINDS} on={KINDS.indexOf(x.category)} onPick={(i) => onChange({ ...x, category: KINDS[i] })} />
      <Select label="소 선택 (없으면 비워 두기)" options={cows.map((c) => [String(c.cow_id), cowName(c, cows)])} value={x.cow_id ? String(x.cow_id) : ''}
        onChange={(e) => {
          const c = cows.find((y) => String(y.cow_id) === e.target.value);
          onChange({ ...x, cow_id: c?.cow_id ?? null, cow_tag4: c?.tag_last4 ?? null });
        }} err={err.cow_id} />
      <Input label="내용 예: 사료 조금 남김" value={x.value ?? ''} maxLength={500} onChange={(e) => onChange({ ...x, value: e.target.value })} err={err.value} />
    </Card>
  );
}

/** 기록 고치기. ?id=가 있으면 저장된 일지 한 건(FARM-26), 없으면 저장 전 정리 초안 */
export function FS03E() {
  const id = useId();
  return id ? <EntryEdit id={id} /> : <DraftEdit />;
}

function DraftEdit() {
  const nav = useNavigate();
  const [items, setItems] = useState<DraftItem[]>(flow.draft?.items.length ? flow.draft.items : [blank()]);
  const done = () => {
    flow.draft = { ...(flow.draft ?? { raw_text: null, intent: null, report_type: null, report_fields: null, missing: [], report_notice: null, audio_media_id: null }), items, fallback: null };
    nav('/f-s03');
  };
  return (
    <Phone title="기록 고치기" tab="홈" say="어떤 기록인가요? 종류를 고르고 내용을 확인해 주세요.">
      <H>어떤 <em>기록</em>인가요?</H>
      {flow.draft?.fallback === 'select_input' && <Info tone="w">자동으로 정리하지 못했어요. 어떤 기록인지 골라 주세요.</Info>}
      {items.map((x, i) => <ItemEdit key={i} x={x} onChange={(y) => setItems(items.map((z, j) => (j === i ? y : z)))} />)}
      <Row>
        <Btn v="t" onClick={() => setItems([...items, blank()])}>+ 항목 더하기</Btn>
        {items.length > 1 && <Btn v="t" onClick={() => setItems(items.slice(0, -1))}>마지막 항목 빼기</Btn>}
      </Row>
      <Btn onClick={done}>고친 내용으로 확인</Btn>
    </Phone>
  );
}

function EntryEdit({ id }: { id: string }) {
  const nav = useNavigate();
  const d = useApi<DiaryDetail>('/api/farmer/diary/' + id);
  const [x, setX] = useState<DraftItem>();
  const e = d.data?.entry;
  useEffect(() => {
    if (e && e.category !== '신고') setX({ category: e.category, value: e.value, cow_tag4: e.cow_tag4, cow_id: e.cow_id, vaccine_type: e.vaccine_type, head_count: e.head_count });
  }, [e]);
  const { submit, err, busy } = useSend(async () => {
    await api<DiaryEntry>('/api/farmer/diary/' + id, { method: 'PATCH', body: { date: e!.date, category: x!.category, value: x!.value, cow_id: x!.cow_id, vaccine_type: x!.vaccine_type, head_count: x!.head_count } });
    nav(`/f-s15d?id=${id}`, { replace: true });
  });
  return (
    <Phone title="기록 고치기" tab="기록">
      <H>어떤 <em>기록</em>인가요?</H>
      <Status q={d} />
      {e?.category === '신고' && <Info tone="w">신고 기록은 고칠 수 없어요.</Info>}
      {x && <ItemEdit x={x} onChange={setX} err={err} />}
      <Err>{err._}</Err>
      <Btn onClick={submit} disabled={!x || busy}>고친 내용 저장</Btn>
    </Phone>
  );
}

export function FS15() {
  const list = usePage<DiaryDay>('/api/farmer/diary');
  return (
    <Phone title="농장 일지" back={false} tab="기록">
      <H>말로 남긴 기록이<br /><em>날짜별로</em> 모였어요</H>
      <Status q={list} empty={list.items.length === 0 && '아직 남긴 기록이 없어요.'} />
      {list.items.map((day) => (
        <Card key={day.date}>
          <b>{kdow(day.date)}</b>
          {day.entries.map((x) => (
            <Btn key={x.entry_id} v="t" to={`/f-s15d?id=${x.entry_id}`}><Pill>{x.category}</Pill>&nbsp;{itemText(x)}</Btn>
          ))}
        </Card>
      ))}
      {list.more && <Btn v="t" onClick={list.more}>지난 기록 더 보기</Btn>}
      <Btn to="/f-s02">말로 기록하기</Btn>
    </Phone>
  );
}

export function FS15D() {
  const id = useId();
  const nav = useNavigate();
  const d = useApi<DiaryDetail>('/api/farmer/diary/' + id);
  const [ask, setAsk] = useState(false);
  const del = useSend(async () => {
    await api('/api/farmer/diary/' + id, { method: 'DELETE' });
    nav('/f-s15', { replace: true });
  });
  const x = d.data;
  return (
    <Phone title={x ? kday(x.entry.date) + ' 기록' : '일지 기록'} tab="기록">
      <Status q={d} />
      {x && (
        <>
          <KV rows={[[x.entry.category, itemText(x.entry)]]} />
          {x.raw_text && (
            <Card>
              <Muted>내가 한 말</Muted>
              <span>“{x.raw_text}”</span>
              {x.audio_url && <audio controls src={x.audio_url} style={{ width: '100%' }} />}
            </Card>
          )}
          {x.deliveries.length > 0 && (
            <Card>
              <b>전달 내역</b>
              {x.deliveries.map((v) => <span key={v.delivery_id}>{kat(v.approved_at)} · {v.org_name} · <Pill tone={v.receiver_status === 'done' ? 'g' : undefined}>{RECEIVER[v.receiver_status]}</Pill></span>)}
            </Card>
          )}
          {ask ? (
            <Info tone="w">
              정말 지울까요?{x.deliveries.length > 0 && ' 이미 보낸 기록은 받은 곳의 사본이 남아요.'}
              <Row>
                <Btn v="t" onClick={() => setAsk(false)}>아니요</Btn>
                <Btn v="d" onClick={del.submit} disabled={del.busy}>지우기</Btn>
              </Row>
            </Info>
          ) : (
            <Row>
              <Btn v="t" onClick={() => setAsk(true)}>지우기</Btn>
              {x.entry.category !== '신고' && <Btn v="s" to={`/f-s03e?id=${id}`}>고치기</Btn>}
            </Row>
          )}
          <Err>{del.err._}</Err>
        </>
      )}
    </Phone>
  );
}

