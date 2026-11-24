import { useEffect, useState, type ReactNode } from 'react';
import {
  api, ApiError, logout, qs, setMocks,
  type Form6, type GuideDoc, type InboxDetail, type InboxList, type Jurisdiction, type Me, type ReceiverResult, type ReceiverStatus, type Route, type StatusResult, type WeeklyStats,
} from '@mnm/api-client';
import { receiverMocks } from '@mnm/mocks';
import {
  Btn, Card, Center, Chart, Chips, Col, Cols, CopyBtn, Err, FontBtn, Gnb, H, Info, Input, Item, Kpis, KV, Link, Mast, Modal, Muted, P, Pad, Pill, Row, Status, Steps, Tbl, WebLogin, WebPassword,
  errText, mount, useApi, useAuthForm, useNavigate, useSearchParams, type Screen,
} from '@mnm/ui';

setMocks(receiverMocks);

const NOTICE = '접수자 전용 · 농가가 [보낼게요]로 승인한 기록만 표시됩니다';
const MENU: [string, string][] = [['접수된 기록', '/r-s02'], ['관할 농가', '/r-s03'], ['공식 지침', '/r-s04'], ['통계', '/r-s05']];

/* ---------- 공통 ---------- */
const STATUS: Record<ReceiverStatus, string> = { new: '새로 도착', checking: '확인 중', done: '처리 완료' };
const STATUS_TONE: Record<ReceiverStatus, 'd' | 'w' | 'g'> = { new: 'd', checking: 'w', done: 'g' };
// 처리 결과 코드는 제안값 (mnm-dev RCV-03, 표준 목록 확정 전)
const RESULT: Record<ReceiverResult, string> = {
  inspection_request: '방역기관 검사 요청', vet_guide: '수의사 진료 안내', observe_guide: '경과 관찰 안내', not_applicable: '공식 증상 해당 없음', proxy_reported: '대신 신고 마침',
};
const DONE_RESULTS = ['inspection_request', 'vet_guide', 'observe_guide', 'not_applicable'] as const;
const ROUTE: Record<Route, string> = { call: '전화 신고와 연결', coop: '축협 전달', web: '인터넷 신고', gov: '시군청 전달' };
/** 이력 신고서 칸 이름 (mnm-dev `ReportFields`) */
const FIELD: Record<string, string> = {
  mother_tag4: '어미 소 (귀표 끝 4자리)', birth_date: '태어난 날', sex: '성별', breed: '품종', calf_tag: '송아지 귀표',
  cow_tag: '소 (귀표)', death_date: '폐사한 날', move_date: '옮긴 날', counterpart_farm_no: '상대 농장식별번호', counterpart_name: '상대 이름',
};
const PART: Record<string, string> = { mouth: '입', udder: '젖', hoof: '발굽', flank: '몸 옆면' };

const pad = (n: number) => String(n).padStart(2, '0');
/** ISO 시각 → "11.02 09:42" (이 기기 시간대) */
const at = (iso: string | null) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
/** "01000000006" → "010-0000-0006" */
const tel = (p: string) => p.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3');
/** "2026-11-02" → "11.02" */
const md = (date: string | null) => (date ? date.slice(5).replace('-', '.') : '-');

/** 로그인 후 화면 공통 틀: 안내 띠 + 상단 메뉴 (소속 · 이름은 AUTH-03) */
function Page({ children }: { children: ReactNode }) {
  const me = useApi<Me>('/api/auth/me').data;
  return (
    <>
      <Mast>{NOTICE}</Mast>
      <Gnb brand="촌수의사" items={MENU} right={<>{me && `${me.org?.name ?? ''} · ${me.name}`} <Link to="/r-s01" onClick={logout}>로그아웃</Link><FontBtn /></>} />
      {children}
    </>
  );
}

const RS01 = () => (
  <>
    <Mast>{NOTICE}</Mast>
    <WebLogin role="receiver" home="/r-s02" sub="접수자 기록 보기" />
  </>
);

const RS06 = () => (
  <>
    <Mast>{NOTICE}</Mast>
    <WebPassword home="/r-s02" />
  </>
);

/** 저장 버튼 공통: 보내는 중·칸별 오류·전체 오류(오류 번호). 409면 onConflict */
const useSend = (send: () => Promise<void>) => useAuthForm(send, errText);
const isConflict = (e: unknown) => e instanceof ApiError && e.code === 'CONFLICT-409';

/** 다른 담당자가 먼저 처리함 (R-E02, CONFLICT-409) */
const Conflict = ({ id }: { id?: string | null }) => (
  <Modal onClose={() => location.assign('/r-s02' + qs({ id }))}>
    <H>다른 담당자가 먼저 처리했어요</H>
    <P>보던 화면 이후에 처리 상태가 바뀌었어요. 최신 상태를 확인해 주세요.</P>
    <Btn onClick={() => location.assign('/r-s02' + qs({ id }))}>최신 상태로 보기</Btn>
  </Modal>
);

/** 없는 기록(404)·관할 밖 기록(403)이면 전체 페이지 오류(R-E01)로 */
function useErrorPage(e?: ApiError) {
  const nav = useNavigate();
  useEffect(() => {
    if (e && (e.status === 404 || e.status === 403)) nav('/r-e01' + qs({ code: e.status, rid: e.requestId }), { replace: true });
  }, [e]); // eslint-disable-line react-hooks/exhaustive-deps
}

/* ---------- R-S02 접수된 기록 + 한 장 요약 (RCV-01·02) ---------- */
const FILTERS: ['all' | ReceiverStatus, string][] = [['all', '전체'], ['new', '새로 도착'], ['checking', '확인 중'], ['done', '처리 완료']];

/** 접수 목록 + 선택한 기록(?id=). 팝업(R-P01~P04)은 이 화면 위에 뜬다 */
function Inbox({ children }: { children?: ReactNode }) {
  const [q, setQ] = useSearchParams();
  const f = Math.max(0, FILTERS.findIndex(([k]) => k === q.get('s')));
  // shortcut: 최신 20건만 보인다(다음 쪽 없음), 접수가 20건을 넘기 시작하면 더 보기를 붙인다
  const list = useApi<InboxList>('/api/receiver/inbox' + qs({ status: f ? FILTERS[f][0] : undefined }));
  const items = list.data?.page.items ?? [];
  const id = q.get('id') ?? (items[0] ? String(items[0].delivery_id) : null);
  const c = list.data?.counts;
  const o = list.data?.outbreak;
  return (
    <Page>
      <Cols cols="300px 1fr">
        <Col>
          <Chips items={FILTERS.map(([k, n]) => `${n} ${c?.[k] ?? ''}`)} on={f} onPick={(i) => setQ({ s: FILTERS[i][0] })} />
          <Status q={list} empty={list.data && items.length === 0 && '접수된 기록이 없어요.'} />
          {items.map((x) => (
            <Item
              key={x.delivery_id}
              on={String(x.delivery_id) === id}
              to={(x.kind === 'history' ? '/r-s02b' : '/r-s02') + qs({ s: q.get('s'), id: x.delivery_id })}
              title={<>
                <b>{x.farm_name}{x.cow_tag4 && ` · ${x.cow_tag4}번`}</b>{' '}
                {x.kind === 'history' ? <Pill tone="w">{x.history_type} 신고 초안</Pill> : !!x.matched_count && <Pill tone="d">공식 증상 {x.matched_count}</Pill>}{' '}
                <Pill tone={STATUS_TONE[x.status]}>{STATUS[x.status]}</Pill>
              </>}
              sub={`${x.address ?? ''} · ${at(x.approved_at)} · ${ROUTE[x.route]}`}
            />
          ))}
          {o && <Info>관할 최근 30일 발생: 구제역 {o.fmd} · 럼피스킨 {o.lsd}{o.base_at && ` · ${at(o.base_at)} 기준`}</Info>}
        </Col>
        <Col>{id ? <Detail id={id} /> : null}</Col>
      </Cols>
      {children}
    </Page>
  );
}

function Detail({ id }: { id: string }) {
  const d = useApi<InboxDetail>('/api/receiver/inbox/' + id);
  const [conflict, setConflict] = useState(false);
  const x = d.data;
  useErrorPage(d.err);
  const move = (status: 'checking') => async () => {
    try {
      await api<StatusResult>(`/api/receiver/inbox/${id}/status`, { method: 'PATCH', body: { status, expected_status: x!.status } });
      d.reload();
    } catch (e) {
      if (isConflict(e)) setConflict(true);
      else throw e;
    }
  };
  const { submit, err, busy } = useSend(move('checking'));
  if (!x) return <Status q={d} />;
  const s = x.symptom;
  const cow = s?.cow;
  return (
    <>
      <Status q={d} />
      <Card>
        <Muted>한 장 요약 · 농가 승인 {at(x.approved_at)} · {ROUTE[x.route]}</Muted>
        <b>{x.farm.name}{cow && ` · ${cow.tag4}번`} {cow && <Muted>({[cow.breed, cow.sex, cow.birth_date && `${cow.birth_date.slice(0, 4)}년생`].filter(Boolean).join(' · ')})</Muted>}</b>
        <span>
          {s?.matched_symptoms.map((m) => <span key={m}><Pill tone="d">{m} · 공식 증상</Pill>{' '}</span>)}
          {x.farm.phone_shared && <Pill>연락처 공개 동의</Pill>}{' '}
          <Pill tone={STATUS_TONE[x.status]}>{STATUS[x.status]}{x.result && ` · ${RESULT[x.result]}`}</Pill>
        </span>
        {s && <span>처음 본 때 {at(s.found_at)}{s.barn && ` · ${s.barn}`}</span>}
        <Steps n={3} on={['new', 'checking', 'done'].indexOf(x.status)} />
      </Card>
      <Row>
        <Btn to={`/r-p01?id=${id}`}>농가에 전화하기</Btn>
        <Btn v="s" to={`/r-p02?id=${id}`}>신고서로 옮기기</Btn>
        {x.status === 'new' && <Btn v="s" onClick={submit} disabled={busy}>확인 시작</Btn>}
        {x.status !== 'done' && <Btn v="t" to={`/r-p04?id=${id}`}>처리 완료</Btn>}
      </Row>
      <Err>{err._}</Err>
      <Row>
        {s && (
          <Card>
            <b>농가가 보낸 사진</b>
            {s.photos.length === 0 && !s.video && <Muted>보낸 사진·영상이 없어요.</Muted>}
            <Row>
              {s.photos.map((p) => (
                <Link key={p.media_id} to={`/r-p03?id=${id}&m=${p.media_id}`}>
                  {PART[p.requested_part] ?? p.requested_part} · {p.match == null ? '부위 확인 안 됨' : p.match ? '부위 일치' : '부위 다름'}
                </Link>
              ))}
              {s.video?.url && <a href={s.video.url} target="_blank" rel="noreferrer">▶ 영상 보기</a>}
            </Row>
            {s.video?.ratio && <span>영상에서 본 모습: 눕기 {s.video.ratio.lie}% · 서기 {s.video.ratio.stand}% · 먹기 {s.video.ratio.eat}% <Muted>(참고)</Muted></span>}
          </Card>
        )}
        <Card>
          <b>농장 기본 정보</b>
          <span>{x.farm.address} · 사육 {x.farm.head_count ?? '-'}두</span>
          {x.basics && <span>최근 접종 {x.basics.vaccine ?? '-'} · 최근 소독 {x.basics.disinfection ?? '-'} · 외부 출입 {x.basics.visit ?? '-'}</span>}
        </Card>
      </Row>
      <Card>
        <b>최근 14일 일지</b>
        {x.diary.length === 0 && <Muted>기록이 없어요.</Muted>}
        {x.diary.map((e, i) => <span key={i}>{md(e.date)} {e.category}{e.cow_tag4 && ` · ${e.cow_tag4}번`} {e.value}</span>)}
      </Card>
      <Row>
        <Card>
          <b>처리 이력</b>
          <span>{at(x.approved_at)} 농가 전달 승인</span>
          {x.timeline.map((t, i) => (
            <span key={i}>{at(t.at)} {t.status && STATUS[t.status]}{t.result && ` · ${RESULT[t.result]}`}{t.memo && ` · ${t.memo}`} <Muted>{[t.org_name, t.user_name].filter(Boolean).join(' ')}</Muted></span>
          ))}
        </Card>
        <Card to="/r-s04">
          <b>관련 공식 지침</b>
          <span>{x.guides.map((g) => g.source_doc).join(' · ') || '-'}</span>
        </Card>
      </Row>
      <Info tone="g">질병 여부 판단과 조치는 접수자·방역기관이 공식 절차에 따라 결정합니다.</Info>
      {conflict && <Conflict id={id} />}
    </>
  );
}

const RS02 = () => <Inbox />;

/* ---------- R-S02B 이력 신고 초안 (RCV-10) ---------- */
function RS02B() {
  const [q] = useSearchParams();
  const id = q.get('id');
  const nav = useNavigate();
  const d = useApi<InboxDetail>('/api/receiver/inbox/' + id);
  useErrorPage(d.err);
  const h = d.data?.history;
  const [v, setV] = useState<Record<string, string>>({});
  // 농가가 비워 둔 칸 + 출생의 송아지 귀표만 채울 수 있다
  const editable = h ? [...new Set([...h.missing, ...(h.type === '출생' ? ['calf_tag'] : [])])] : [];
  const save = (done: boolean) => async () => {
    const fields = Object.fromEntries(Object.entries(v).filter(([, x]) => x.trim()));
    await api(`/api/receiver/history-reports/${h!.history_report_id}/proxy-done`, { method: 'PATCH', body: { fields, done } });
    if (done) nav('/r-s02' + qs({ id }));
    else (setV({}), d.reload());
  };
  const draft = useSend(save(false));
  const finish = useSend(save(true));
  const err = { ...draft.err, ...finish.err };
  const closed = h?.status === 'done';
  const lines = h ? Object.entries(h.fields).map(([k, x]) => `${FIELD[k] ?? k}: ${x ?? '(빈칸)'}`) : [];
  return (
    <Page>
      <Pad>
        <Status q={d} />
        {d.data && h && (
          <>
            <Row>
              <H>{h.type} 신고 초안 · {d.data.farm.name}</H>
              {h.due_date && <Pill tone="w">기한 {md(h.due_date)}{h.d_day != null && ` · D-${h.d_day}`}</Pill>}
              {closed && <Pill tone="g">신고 마침</Pill>}
            </Row>
            <KV rows={[
              ['신고인', `${d.data.farm.owner_name} (${d.data.farm.farm_no})`],
              ...Object.entries(h.fields).map(([k, x]): [string, ReactNode, boolean] => [FIELD[k] ?? k, x ?? '미입력 — 축협 확인 필요', x == null]),
            ]} />
            {!closed && editable.map((k) => (
              <Input key={k} top label={FIELD[k] ?? k} placeholder={k.endsWith('_date') ? 'YYYY-MM-DD' : FIELD[k]} value={v[k] ?? ''} onChange={(e) => setV({ ...v, [k]: e.target.value })} err={err['fields.' + k] ?? err[k]} />
            ))}
            <Err>{err._}</Err>
            <Row>
              <CopyBtn text={lines.join('\n')}>항목 전체 복사</CopyBtn>
              <Btn v="s" to={`/r-p01?id=${id}`}>농가에 전화하기</Btn>
              {!closed && editable.length > 0 && <Btn v="s" onClick={draft.submit} disabled={draft.busy}>빈칸 저장</Btn>}
              {!closed && <Btn onClick={finish.submit} disabled={finish.busy}>이력제 신고 마침</Btn>}
            </Row>
            <Card>
              <b>처리 이력</b>
              <span>{at(d.data.approved_at)} 농가 부탁</span>
              {d.data.timeline.map((t, i) => <span key={i}>{at(t.at)} {t.status && STATUS[t.status]}{t.result && ` · ${RESULT[t.result]}`}{t.memo && ` · ${t.memo}`}</span>)}
            </Card>
          </>
        )}
      </Pad>
    </Page>
  );
}

/* ---------- 팝업 (?id=전달 번호) ---------- */
const useId = () => useSearchParams()[0].get('id') ?? '';
const useDetail = () => useApi<InboxDetail>('/api/receiver/inbox/' + useId());
const back = (id: string) => '/r-s02' + qs({ id });

/** R-P01 농가에 전화하기 · 메모 (RCV-04) */
function RP01() {
  const id = useId();
  const nav = useNavigate();
  const d = useDetail();
  const [memo, setMemo] = useState('');
  const { submit, err, busy } = useSend(async () => {
    await api<StatusResult>(`/api/receiver/inbox/${id}/memos`, { method: 'POST', body: { memo } });
    nav(back(id));
  });
  const f = d.data?.farm;
  return (
    <Inbox>
      <Modal onClose={() => nav(back(id))}>
        <H>농가에 전화하기</H>
        <Status q={d} />
        {f && (
          <>
            <P>{f.owner_name} 님 · {f.name}</P>
            {f.phone ? (
              <>
                <Row>
                  <H>{tel(f.phone)}</H>
                  <CopyBtn text={f.phone}>번호 복사</CopyBtn>
                </Row>
                <Btn href={'tel:' + f.phone.replace(/\D/g, '')}>전화 걸기</Btn>
              </>
            ) : (
              <Info tone="w">농가가 연락처 공개에 동의하지 않았어요.</Info>
            )}
          </>
        )}
        <Input label="예) 통화함. 오후 2시 방역관 방문 예정" rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} err={err.memo} />
        <Err>{err._}</Err>
        <Btn v="t" onClick={submit} disabled={busy || !memo.trim()}>메모 저장</Btn>
      </Modal>
    </Inbox>
  );
}

/** R-P02 신고서로 옮기기 (RCV-05) */
function RP02() {
  const id = useId();
  const nav = useNavigate();
  const f = useApi<Form6>(`/api/receiver/inbox/${id}/form6`);
  return (
    <Inbox>
      <Modal onClose={() => nav(back(id))}>
        <H>신고서로 옮기기</H>
        <P>시행규칙 제13조 필수 6개 항목을 농가 기록에서 채웠습니다.</P>
        <Status q={f} />
        {f.data && (
          <>
            <KV rows={f.data.items.map((x): [string, ReactNode, boolean] => [x.label, x.value ?? '(빈칸)', x.value == null])} />
            <CopyBtn text={f.data.text}>항목 전체 복사</CopyBtn>
          </>
        )}
        <Btn v="t" onClick={() => nav(back(id))}>닫기</Btn>
      </Modal>
    </Inbox>
  );
}

/** R-P03 사진 크게 보기 (?m=사진 번호). 서명 URL은 10분 뒤 만료 → 다시 열면 새 URL */
function RP03() {
  const id = useId();
  const m = useSearchParams()[0].get('m');
  const nav = useNavigate();
  const d = useDetail();
  const p = d.data?.symptom?.photos.find((x) => String(x.media_id) === m);
  return (
    <Inbox>
      <Modal onClose={() => nav(back(id))}>
        <Status q={d} />
        {p && (
          <>
            <H>{PART[p.requested_part] ?? p.requested_part} 사진</H>
            {p.url ? <img src={p.url} alt={`${PART[p.requested_part] ?? ''} 원본 사진`} style={{ width: '100%', borderRadius: 12 }} /> : <Muted>아직 올라오지 않은 사진이에요.</Muted>}
            <Info>
              요청 부위: <b>{PART[p.requested_part] ?? p.requested_part}</b>
              {p.match == null ? ' · 부위 확인 안 됨' : <> · 판정 부위: <b>{PART[p.predicted_part ?? ''] ?? p.predicted_part ?? '-'}</b> ({p.match ? '일치' : '다름'})</>}
            </Info>
          </>
        )}
        <Btn v="t" onClick={() => nav(back(id))}>닫기</Btn>
      </Modal>
    </Inbox>
  );
}

/** R-P04 처리 완료 (RCV-03) */
function RP04() {
  const id = useId();
  const nav = useNavigate();
  const d = useDetail();
  const [result, setResult] = useState<ReceiverResult>('inspection_request');
  const [memo, setMemo] = useState('');
  const [conflict, setConflict] = useState(false);
  const { submit, err, busy } = useSend(async () => {
    try {
      await api<StatusResult>(`/api/receiver/inbox/${id}/status`, { method: 'PATCH', body: { status: 'done', expected_status: d.data!.status, result, memo: memo || undefined } });
      nav(back(id));
    } catch (e) {
      if (isConflict(e)) setConflict(true);
      else throw e;
    }
  });
  if (conflict) return <Inbox><Conflict id={id} /></Inbox>;
  return (
    <Inbox>
      <Modal onClose={() => nav(back(id))}>
        <H>처리 완료</H>
        <P>농가 앱에 처리 결과가 표시됩니다.</P>
        <Card>
          {DONE_RESULTS.map((k) => (
            <label key={k}><input type="radio" name="result" checked={result === k} onChange={() => setResult(k)} /> {RESULT[k]}</label>
          ))}
        </Card>
        <Input label="메모 (선택)" value={memo} onChange={(e) => setMemo(e.target.value)} err={err.memo} />
        <Err>{err._ ?? err.result}</Err>
        <Btn onClick={submit} disabled={busy || !d.data}>처리 완료로 바꾸기</Btn>
      </Modal>
    </Inbox>
  );
}

/* ---------- R-S03 관할 농가 (RCV-06·07) ---------- */
const ALERT: Record<string, string> = { unanswered: '미응답', waiting: '기다리는 중', seen: '확인함' };

function Nudge({ farmId }: { farmId: number }) {
  const [sent, setSent] = useState(false);
  const { submit, err, busy } = useSend(async () => {
    await api(`/api/receiver/jurisdiction/farms/${farmId}/nudge`, { method: 'POST' });
    setSent(true);
  });
  if (sent) return <Muted>다시 알렸어요</Muted>;
  return <>{<Btn v="t" onClick={submit} disabled={busy}>다시 알리기</Btn>}<Err>{err._}</Err></>;
}

function RS03() {
  const j = useApi<Jurisdiction>('/api/receiver/jurisdiction/farms');
  const k = j.data?.kpis;
  const farms = j.data?.farms ?? [];
  return (
    <Page>
      <Pad>
        <H>관할 농가 {j.data && `${farms.length}곳`} <Muted>미응답·소규모 농가를 먼저 보여 줍니다</Muted></H>
        <Status q={j} empty={j.data && farms.length === 0 && '관할 농가가 없어요.'} />
        {k && <Kpis items={[['기한 임박', k.due_soon + '곳'], ['알림 미응답', k.unanswered + '곳'], ['50두 미만', k.small_farms + '곳'], ['오늘 기록', k.recorded_today + '곳']]} />}
        {farms.length > 0 && (
          <Tbl
            head={['농가', '지역', '두수', '연락처', '마지막 기록', '기한', '알림', '']}
            rows={farms.map((f) => [
              f.name,
              f.address ?? '-',
              f.head_count == null ? '-' : f.head_count + '두',
              f.phone ? <a href={'tel:' + f.phone.replace(/\D/g, '')}>{tel(f.phone)}</a> : f.phone_masked ?? '-',
              md(f.last_record_date),
              f.next_task ? `${f.next_task.title} D-${f.next_task.d_day}` : '-',
              f.alert_state ? ALERT[f.alert_state] : '-',
              f.alert_state === 'unanswered' ? <Nudge farmId={f.farm_id} /> : '',
            ])}
          />
        )}
      </Pad>
    </Page>
  );
}

/* ---------- R-S04 공식 지침 (RCV-08) ---------- */
function RS04() {
  const g = useApi<GuideDoc[]>('/api/receiver/guides');
  return (
    <Page>
      <Pad>
        <H>공식 지침</H>
        <P>농가 앱의 증상 질문, 촬영 안내, 신고 후 안내는 아래 지침 원문에서만 가져옵니다.</P>
        <Status q={g} empty={g.data && g.data.length === 0 && '게시된 지침이 없어요.'} />
        {g.data?.map((doc, i) => (
          <details key={doc.source_doc} className="card" open={i === 0}>
            <summary><b>{doc.source_doc}</b>{doc.revised_at && ` · 개정 ${doc.revised_at}`}</summary>
            {doc.items.map((x) => <span key={x.rule_id}>· {x.text}{x.clause && <Muted> ({x.clause})</Muted>}</span>)}
          </details>
        ))}
      </Pad>
    </Page>
  );
}

/* ---------- R-S05 통계 (RCV-09) ---------- */
function RS05() {
  const s = useApi<WeeklyStats>('/api/receiver/stats/weekly');
  const max = Math.max(1, ...(s.data?.daily.map((x) => x.count) ?? []));
  return (
    <Page>
      <Pad>
        <H>이번 주 통계 {s.data && <Muted>{md(s.data.from)} ~ {md(s.data.to)}</Muted>}</H>
        <Status q={s} />
        {s.data && (
          <>
            <Kpis items={[['접수된 기록', s.data.received + '건'], ['처리 완료', s.data.done + '건'], ['사진 포함', s.data.with_photo + '건']]} />
            <Chart values={s.data.daily.map((x) => (x.count / max) * 100)} />
            <Row>{s.data.daily.map((x) => <Muted key={x.date}>{md(x.date)} {x.count}건</Muted>)}</Row>
          </>
        )}
      </Pad>
    </Page>
  );
}

/** 오류 페이지 (R-E01). ?code=403 관할 밖, 그 밖(없는 주소·없는 기록)은 404. ?rid=오류 번호. 점검(MAINT-503)은 MVP 제외 */
function RE01() {
  const [q] = useSearchParams();
  const denied = q.get('code') === '403';
  const rid = q.get('rid');
  return (
    <>
      <Mast>{NOTICE}</Mast>
      <Gnb brand="촌수의사" />
      <Center>
        <H>{denied ? '이 기록을 볼 권한이 없어요' : '찾는 기록이 없어요'}</H>
        <P>{denied ? '우리 기관 관할 농가의 기록만 볼 수 있어요.' : '삭제됐거나 없는 기록이에요. 접수 목록에서 다시 찾아 주세요.'}</P>
        {rid && <Muted>오류 번호 {rid}</Muted>}
        <Btn to="/r-s02">접수 목록으로</Btn>
      </Center>
    </>
  );
}

const RE02 = () => <Inbox><Conflict id={useId() || null} /></Inbox>;

// 화면 ID는 화면설계서 기준. 경로는 ID 소문자(/r-s02)
const screens: Screen[] = [
  ['R-S01', '로그인', RS01],
  ['R-S06', '비밀번호 바꾸기 (첫 로그인)', RS06],
  ['R-S02', '접수된 기록 + 한 장 요약', RS02],
  ['R-S02B', '이력 신고 초안', RS02B],
  ['R-P01', '[팝업] 농가에 전화하기 · 메모', RP01],
  ['R-P02', '[팝업] 신고서로 옮기기', RP02],
  ['R-P03', '[팝업] 사진 크게 보기', RP03],
  ['R-P04', '[팝업] 처리 완료', RP04],
  ['R-S03', '관할 농가', RS03],
  ['R-S04', '공식 지침', RS04],
  ['R-S05', '통계', RS05],
  ['R-E01', '[오류] 없는 기록 · 권한 없음 페이지', RE01],
  ['R-E02', '[오류] 처리 충돌 모달', RE02],
];

mount(screens, 'R-S01', 'R-E01', { login: 'R-S01', home: 'R-S02', password: 'R-S06', open: ['R-E01'] });
