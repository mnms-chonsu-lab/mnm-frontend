import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  api, ApiError, newKey, uploadFile,
  type Actions, type Answer, type Behavior, type Delivered, type Facility, type FarmerMe, type Page, type PartCheck, type Question, type SpeechText, type Summary, type SymptomSaved, type UploadForm,
} from '@mnm/api-client';
import { Btn, Card, CopyBtn, Done, Err, H, Info, Input, KV, Modal, Muted, P, openSheet, Phone, Pic, Pill, RouteCard, Row, Status, Steps, useApi, useNavigate, useSearchParams } from '@mnm/ui';
import { AUDIO, CowList, PART, audioForm, cowDesc, cowName, flow, isServerErr, kday, tag4From, useCows, useId, useRecorder, useSend } from './shared';
import { enqueue } from './outbox';

/** 소 상태 확인 흐름 공통 틀 */
const Check = ({ title = '소 상태 확인', children }: { title?: string; children: ReactNode }) => (
  <Phone title={title} tab="홈">{children}</Phone>
);

/** 흐름 중간에 새로고침해서 앞 단계 값이 없을 때 */
const Restart = () => (
  <>
    <Info tone="w">앞에서 고른 내용이 없어요. 처음부터 다시 해 주세요.</Info>
    <Btn to="/f-s08">소 고르기부터</Btn>
  </>
);

/** 신고 후 "지금 해 주세요" (FARM-16, 게시된 조치 문구 원문, 서버가 최대 3개). disease가 없으면 그리지 않는다. F-S14·F-S14P·F-S14W 같은 규칙·문구 */
const NowDo = ({ disease }: { disease: string | null }) => (disease ? <NowDoList disease={disease} /> : null);

type Action = Actions['actions'][number];
/** "2026-05-06" → "2026년 5월판" */
const edition = (d: string | null) => (d ? `${d.slice(0, 4)}년 ${Number(d.slice(5, 7))}월판` : null);
/** 조항의 마지막 번호 ("제2장 > 2.2 > 2.2.2" → "2.2.2") */
const lastClause = (c: string | null) => c?.split(/[>›/]/).pop()?.trim() || null;
const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((v): v is string => !!v))];
/** 근거 한 줄: 문서명 · 개정 연월 · 조항 마지막 번호 */
const basis = (xs: Action[]) => [...uniq(xs.map((y) => y.source_doc)), ...uniq(xs.map((y) => edition(y.revised_at))), uniq(xs.map((y) => lastClause(y.clause))).join(', ')].filter(Boolean).join(' · ');

function NowDoList({ disease }: { disease: string }) {
  const a = useApi<Actions>(`/api/farmer/guide/actions?disease=${disease}`);
  const [open, setOpen] = useState(false);
  const x = a.data;
  // 게시된 문구가 없으면(RAG-NONE) 안내 문구 대신 [바로 신고]·담당 축협 연결
  if ((x && x.actions.length === 0) || a.err?.code === 'RAG-NONE') return <NoGuide />;
  return (
    <Card>
      <b>지금 해 주세요{x?.guide_name && ` · ${x.guide_name}`}</b>
      <Status q={a} />
      {x?.actions.map((y, i) => <span key={y.rule_id}>{i + 1}. {y.text}</span>)}
      {!!x?.actions.length && (
        <>
          <Muted>{basis(x.actions)}</Muted>
          <Btn v="t" onClick={() => setOpen(true)}>원문 보기</Btn>
        </>
      )}
      {open && x && (
        <Modal onClose={() => setOpen(false)}>
          <H>{x.guide_name}</H>
          {x.actions.map((y) => (
            <Card key={y.rule_id}>
              <Muted>{[y.source_doc, edition(y.revised_at), y.clause].filter(Boolean).join(' · ')}</Muted>
              <span>{y.text}</span>
            </Card>
          ))}
          <Btn onClick={() => setOpen(false)}>닫기</Btn>
        </Modal>
      )}
    </Card>
  );
}

function NoGuide() {
  const org = useApi<FarmerMe>('/api/auth/me').data?.farm?.org_name;
  return (
    <Card>
      <b>이 내용은 담당자에게 직접 확인해 주세요.</b>
      {org && <span>담당 축협: {org}</span>}
      <Btn v="d" to="/f-p01">바로 신고 1588-9060</Btn>
    </Card>
  );
}

/** 말 → 글 (음성만 글로, 저장 안 함). 못 알아들으면 null */
const hear = async (b: Blob) => (await api<SpeechText>('/api/farmer/stt', { method: 'POST', body: audioForm(b) })).text;

/** 말하기 버튼 아래 한 줄: 듣는 중 · 알아듣는 중 · 안내 */
const MicState = ({ on, busy, idle }: { on: boolean; busy: boolean; idle: string }) => (
  <P center>{on ? <Pill>● 듣고 있어요</Pill> : busy ? <Pill tone="g">알아듣는 중…</Pill> : <Muted>{idle}</Muted>}</P>
);

/* ---------- F-S08 소 고르기 ---------- */
export function FS08() {
  const nav = useNavigate();
  const cows = useCows().data?.items ?? [];
  const [tag, setTag] = useState('');
  const [found, setFound] = useState<typeof cows>();
  useEffect(() => {
    flow.check = { answers: {} };
  }, []);
  const find = (t = tag.trim()) => {
    const m = cows.filter((c) => c.tag_last4 === t);
    if (m.length === 1) nav(`/f-s08s?cow=${m[0].cow_id}`);
    else setFound(m);
  };
  // 끝 4자리 말하기 → "1234번 맞아요?" 시트. 못 알아들으면 숫자 입력칸으로
  const { submit: listen, err, busy } = useSend(async () => {
    const t = tag4From((await hear(said.current!)) ?? '');
    if (!t) return void mic.setMicErr('번호를 못 알아들었어요. 다시 말하거나 숫자로 써 주세요.');
    openSheet({ title: `${t}번 맞아요?`, actions: [['맞아요', () => (setTag(t), find(t)), 'p'], ['다시 말하기', () => void mic.start(), 's'], ['숫자로 쓰기', () => setTag(t), 't']] });
  });
  const said = useRef<Blob>();
  const mic = useRecorder((b) => ((said.current = b), void listen()), 10);
  return (
    <Check>
      <H>어느 소가<br /><em>평소와 다른가요?</em></H>
      <CowList to={(c) => `/f-s08s?cow=${c.cow_id}`} />
      {AUDIO && <Btn v="s" onClick={mic.on ? mic.stop : () => (setFound(undefined), void mic.start())} disabled={busy}>{mic.on ? '■ 다 말했어요' : '🎙 귀표 끝 4자리 말하기'}</Btn>}
      {(mic.on || busy) && <MicState on={mic.on} busy={busy} idle="" />}
      <Err>{mic.micErr ?? err._ ?? err.audio}</Err>
      <Row>
        <Input label="귀표 끝 4자리" inputMode="numeric" maxLength={4} value={tag} onChange={(e) => (setTag(e.target.value), setFound(undefined))} />
        <Btn v="s" onClick={() => find()} disabled={tag.trim().length !== 4}>찾기</Btn>
      </Row>
      {found && found.length === 0 && <Info tone="w">{tag}번 소가 목록에 없어요. 번호를 다시 확인하거나 소를 추가해 주세요.</Info>}
      {found && found.length > 1 && (
        <Card>
          <b>{tag}번이 {found.length}마리예요. 어느 소예요?</b>
          <CowList only={found} to={(c) => `/f-s08s?cow=${c.cow_id}`} />
        </Card>
      )}
      <Btn v="t" to="/f-s08s">귀표 번호를 모르겠어요</Btn>
      <Btn v="t" to="/f-p04">+ 목록에 없는 소 추가</Btn>
    </Check>
  );
}

/* ---------- F-S08S 본 것 말하기 ---------- */
export function FS08S() {
  const nav = useNavigate();
  const cowId = useSearchParams()[0].get('cow');
  const cows = useCows().data?.items ?? [];
  const cow = cows.find((c) => String(c.cow_id) === cowId);
  const [text, setText] = useState(flow.check.observed ?? '');
  // 마이크가 기본, 들은 말은 아래 글 칸에 넣어 고칠 수 있게. 못 알아들으면 글로 쓰기 (F-S02와 같은 녹음)
  const said = useRef<Blob>();
  const { submit: listen, err, busy } = useSend(async () => {
    const t = await hear(said.current!);
    if (t) setText(t);
    else mic.setMicErr('잘 못 알아들었어요. 다시 말하거나 아래에 글로 써 주세요.');
  });
  const mic = useRecorder((b) => ((said.current = b), void listen()));
  const next = () => {
    flow.check.cowId = cowId ? Number(cowId) : null;
    flow.check.observed = text.trim() || undefined;
    nav('/f-s09q');
  };
  return (
    <Check>
      <H center>{cow ? cowName(cow, cows) + ' 소가' : '소가'}<br /><em>어떤 모습</em>인가요?</H>
      {cow && <P center>{cowDesc(cow)}</P>}
      {AUDIO ? (
        <>
          <button type="button" className="mic" aria-label={mic.on ? '녹음 멈추기' : '녹음 시작'} aria-pressed={mic.on} onClick={mic.on ? mic.stop : () => void mic.start()} disabled={busy} />
          <MicState on={mic.on} busy={busy} idle="마이크를 누르고 말씀하세요. 다 말하면 한 번 더 누르세요." />
        </>
      ) : (
        <Info tone="w">이 화면에서는 녹음이 안 돼요. 글로 써 주세요.</Info>
      )}
      <Err>{mic.micErr ?? err._ ?? err.audio}</Err>
      <Input label="예: 사료를 안 먹고 침을 흘려. 오늘 아침부터 그래." rows={3} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
      <Row>
        <Btn v="t" onClick={next}>건너뛰기</Btn>
        <Btn onClick={next} disabled={!text.trim() || mic.on || busy}>다 말했어요</Btn>
      </Row>
    </Check>
  );
}

/* ---------- F-S09Q 신고서 빈칸 묻기: 몇 마리 · 언제 · 어느 축사 (시행규칙 제13조 항목) ---------- */
/** 이 기기 날짜로 n일 전 "YYYY-MM-DD" */
const daysAgo = (n: number) => {
  const d = new Date(Date.now() - n * 864e5);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
// "2~3일 전"은 이른 쪽(3일 전)으로 적는다 — 처음 본 날은 늦게 적는 것보다 이르게 적는 편이 안전 (제안값)
const WHEN: [string, number][] = [['오늘', 0], ['어제', 1], ['2~3일 전', 3]];

export function FS09Q() {
  const nav = useNavigate();
  const cows = useCows().data?.items ?? [];
  const cow = cows.find((c) => c.cow_id === flow.check.cowId);
  const [i, setI] = useState(0);
  const [more, setMore] = useState(false); // 2마리 이상 → 숫자 / 날짜 고르기 / 다른 축사 말하기
  const [v, setV] = useState('');
  const next = () => {
    setMore(false);
    setV('');
    if (i < 2) setI(i + 1);
    else nav('/f-s09');
  };
  const c = flow.check;
  const set = (f: () => void) => () => (f(), next());
  return (
    <Check>
      <Steps n={3} on={i} />
      <P><b>신고서에 들어가요 · {i + 1} / 3</b></P>
      {i === 0 && (
        <>
          <H>이런 모습인 소가<br /><em>몇 마리</em>인가요?</H>
          <Btn v="s" onClick={set(() => (c.headCount = 1))}>1마리</Btn>
          {more ? (
            <Row>
              <Input label="몇 마리 (숫자)" type="number" inputMode="numeric" min={2} value={v} onChange={(e) => setV(e.target.value)} />
              <Btn onClick={set(() => (c.headCount = Number(v)))} disabled={!(Number(v) >= 2)}>다음</Btn>
            </Row>
          ) : (
            <Btn v="s" onClick={() => setMore(true)}>2마리 이상</Btn>
          )}
          <Btn v="s" onClick={set(() => (c.headCount = null))}>잘 모르겠어요</Btn>
        </>
      )}
      {i === 1 && (
        <>
          <H>언제 <em>처음</em> 봤나요?</H>
          {WHEN.map(([x, n]) => <Btn key={x} v="s" onClick={set(() => (c.foundDate = daysAgo(n)))}>{x}</Btn>)}
          {more ? (
            <Row>
              <Input label="처음 본 날" type="date" max={daysAgo(0)} value={v} onChange={(e) => setV(e.target.value)} />
              <Btn onClick={set(() => (c.foundDate = v))} disabled={!v}>다음</Btn>
            </Row>
          ) : (
            <Btn v="s" onClick={() => setMore(true)}>날짜 고르기</Btn>
          )}
        </>
      )}
      {i === 2 && (
        <>
          <H>어느 <em>축사</em>인가요?</H>
          {cow?.barn && <Btn v="s" onClick={set(() => (c.barn = cow.barn!))}>{cow.barn}</Btn>}
          {more || !cow?.barn ? (
            <Row>
              <Input label="예: 2번 축사" maxLength={50} value={v} onChange={(e) => setV(e.target.value)} />
              <Btn onClick={set(() => (c.barn = v.trim()))} disabled={!v.trim()}>다음</Btn>
            </Row>
          ) : (
            <Btn v="s" onClick={() => setMore(true)}>다른 곳 말하기</Btn>
          )}
          <Btn v="t" onClick={set(() => (c.barn = undefined))}>잘 모르겠어요</Btn>
        </>
      )}
      {i > 0 && <Btn v="t" onClick={() => (setI(i - 1), setMore(false), setV(''))}>이전 질문</Btn>}
    </Check>
  );
}

/* ---------- F-S09 공식 증상 질문 (FARM-10·11) ---------- */
const ANSWERS: [string, Answer][] = [['예, 그래요', 'yes'], ['아니요', 'no'], ['잘 모르겠어요', 'unknown']];

export function FS09() {
  const nav = useNavigate();
  const q = useApi<Page<Question>>('/api/farmer/guide/questions');
  const cows = useCows().data?.items ?? [];
  const cow = cows.find((c) => c.cow_id === flow.check.cowId);
  const [i, setI] = useState(0);
  const qs = q.data?.items ?? [];
  const { submit, err, busy } = useSend(async () => {
    const c = flow.check;
    const saved = await api<SymptomSaved>('/api/farmer/symptom-reports', {
      method: 'POST',
      body: { cow_id: c.cowId ?? null, answers: { drool: 'unknown', blister: 'unknown', feed: 'unknown', lump: 'unknown', ...c.answers }, observed_text: c.observed, head_count: c.headCount ?? undefined, found_date: c.foundDate, barn: c.barn },
    });
    c.saved = saved;
    nav(saved.required_parts.length ? '/f-s10' : `/f-s11?id=${saved.symptom_report_id}`, { replace: true });
  });
  const answer = (a: Answer) => () => {
    flow.check.answers[qs[i].answer_key] = a;
    if (i + 1 < qs.length) setI(i + 1);
    else void submit();
  };
  const x = qs[i];
  return (
    <Check>
      <Status q={q} />
      {x && (
        <>
          <Steps n={qs.length} on={i} />
          <P><b>질문 {i + 1} / {qs.length} · 공식 임상증상 기준</b></P>
          <H>{cow ? cowName(cow, cows) + ' 소가' : '소가'}<br /><em>{x.text}</em></H>
          <Muted>{x.source_doc}{x.clause && ` · ${x.clause}`}</Muted>
          {ANSWERS.map(([t, a]) => <Btn key={a} v={a === 'yes' ? 'p' : 's'} onClick={answer(a)} disabled={busy}>{t}</Btn>)}
          {i > 0 && <Btn v="t" onClick={() => setI(i - 1)}>이전 질문</Btn>}
        </>
      )}
      <Err>{err._ ?? Object.values(err)[0]}</Err>
    </Check>
  );
}

/* ---------- F-S10 · F-S10V 사진·영상 (FARM-12·13·21) ---------- */
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/heic'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime'];

/** 파일 고르기 → 업로드 URL → 저장소에 올리기 → 확인 API. 결과를 돌려준다 */
async function sendMedia<T>(file: File, srId: number, kind: 'photo' | 'video', part?: string) {
  const types = kind === 'photo' ? PHOTO_TYPES : VIDEO_TYPES;
  if (!types.includes(file.type)) throw new ApiError(422, 'VALID-422', kind === 'photo' ? '사진 파일(jpg·png·heic)을 골라 주세요.' : '영상 파일(mp4·mov)을 골라 주세요.');
  const u = await api<UploadForm>('/api/farmer/media/upload-url', { method: 'POST', body: { symptom_report_id: srId, kind, requested_part: part, content_type: file.type } });
  await uploadFile(u.upload_url, u.fields, file);
  return api<T>(`/api/farmer/media/${u.media_id}/${kind === 'photo' ? 'part-check' : 'behavior'}`, { method: 'POST' });
}

/** 카메라로 찍는 버튼 (capture라 앨범 선택 없음) */
const Pick = ({ accept, label, busy, onFile, v = 'p' }: { accept: string; label: string; busy: boolean; onFile: (f: File) => void; v?: 'p' | 't' }) => (
  <label className={'btn ' + v} aria-disabled={busy} style={busy ? { opacity: 0.6, pointerEvents: 'none' } : undefined}>
    {busy ? '올리는 중…' : label}
    <input type="file" accept={accept} capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFile(f); }} />
  </label>
);

export function FS10() {
  const nav = useNavigate();
  const saved = flow.check.saved;
  const [i, setI] = useState(0);
  const [file, setFile] = useState<File>();
  const [res, setRes] = useState<PartCheck>();
  const preview = useMemo(() => file && URL.createObjectURL(file), [file]);
  const parts = saved?.required_parts ?? [];
  const p = parts[i];
  const next = () => {
    setRes(undefined);
    if (i + 1 < parts.length) setI(i + 1);
    else nav('/f-s10v', { replace: true });
  };
  const { submit, err, busy } = useSend(async () => {
    setRes(undefined);
    setRes(await sendMedia<PartCheck>(file!, saved!.symptom_report_id, 'photo', p.part));
  });
  useEffect(() => {
    if (file) void submit();
  }, [file]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!saved || !p) return <Check title="사진 찍기"><Restart /></Check>;
  // 부위 판정(match)은 틀릴 때가 있어 농가에게 보이지 않는다. 접수자 웹에서만 본다 (#72)
  const bad = res?.status === 'done' && (res.dark || res.blurry);
  return (
    <Check title="사진 찍기">
      <Steps n={parts.length} on={i} />
      <H>{p.part_name} 사진을<br /><em>찍어 주세요</em> ({i + 1}/{parts.length})</H>
      <Pic oval src={preview}>{p.guide}</Pic>
      {res?.status === 'done' && res.dark && <Info tone="w"><b>사진이 어두워요.</b> 밝은 곳에서 한 번 더 찍어 주세요.</Info>}
      {res?.status === 'done' && !res.dark && res.blurry && <Info tone="w"><b>사진이 흔들렸어요.</b> 한 번 더 찍어 주세요.</Info>}
      {res && !bad && <Info tone="ok"><b>사진을 저장했어요.</b></Info>}
      <Err>{err._}</Err>
      {res && !bad ? <Btn onClick={next}>다음</Btn> : <Pick accept={PHOTO_TYPES.join(',')} label={res || err._ ? '다시 찍기' : '사진 찍기'} busy={busy} onFile={setFile} />}
      {res && !bad && <Pick v="t" accept={PHOTO_TYPES.join(',')} label="다시 찍기" busy={busy} onFile={setFile} />}
      {bad && <Btn v="t" onClick={next}>이대로 다음</Btn>}
      {!res && <Btn v="t" onClick={next}>건너뛰기</Btn>}
    </Check>
  );
}

export function FS10V() {
  const nav = useNavigate();
  const saved = flow.check.saved;
  const [file, setFile] = useState<File>();
  const [res, setRes] = useState<Behavior>();
  const { submit, err, busy } = useSend(async () => {
    setRes(await sendMedia<Behavior>(file!, saved!.symptom_report_id, 'video'));
  });
  useEffect(() => {
    if (file) void submit();
  }, [file]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!saved) return <Check title="영상 찍기"><Restart /></Check>;
  const done = `/f-s11?id=${saved.symptom_report_id}`;
  return (
    <Check title="영상 찍기">
      <H>소 모습을<br /><em>10초만</em> 찍어 주세요</H>
      <Pic>소 몸 전체가 화면에 들어오게</Pic>
      {/* 모습 비율은 휴대폰 영상에서 정확도를 확인 못 해 농가에게 보이지 않는다 (#72) */}
      {res && <Info tone="ok"><b>영상을 저장했어요.</b></Info>}
      <Err>{err._}</Err>
      {res ? <Btn to={done}>다음</Btn> : <Pick accept={VIDEO_TYPES.join(',')} label={err._ ? '다시 찍기' : '영상 찍기'} busy={busy} onFile={setFile} />}
      {!res && <Btn v="t" to={done}>건너뛰기</Btn>}
    </Check>
  );
}

/* ---------- F-S11 · F-S19 오늘 기록 요약 (FARM-14) ---------- */
const Official = () => <span className="red">(공식 증상)</span>;
const useSummary = () => {
  const s = useApi<Summary>('/api/farmer/symptom-reports/' + useId() + '/summary');
  if (s.data) flow.summary = s.data;
  return s;
};

function SummaryCard({ s }: { s: Summary }) {
  return (
    <Card>
      <span><b>{s.cow ? `${s.cow.tag_last4}번 · ${cowDesc(s.cow)}` : '귀표 번호 모름'}</b> {s.matched_count > 0 ? <Pill tone="d">공식 증상 {s.matched_count}개</Pill> : <Pill tone="g">해당 없음</Pill>}</span>
      {s.matched.map((m) => <span key={m}>· {m} <Official /></span>)}
      {s.observed_text && <span>· 본 것: {s.observed_text}</span>}
      <span>· 처음 본 날 {kday(s.found_date)}{s.head_count != null && ` · ${s.head_count}마리`}{s.barn && ` · ${s.barn}`}</span>
      {s.related_diary.map((d) => <span key={d.entry_id}>· {kday(d.date)} {d.category} {d.value} (일지)</span>)}
      {s.vaccine && <span>· 최근 접종: {s.vaccine.value} {kday(s.vaccine.date)}</span>}
      {s.photos.length > 0 && <Row>{s.photos.map((p) => <Pic key={p.media_id} src={p.url}>{PART[p.part] ?? p.part}</Pic>)}</Row>}
    </Card>
  );
}

export function FS11() {
  const id = useId();
  const s = useSummary();
  return (
    <Check title="오늘 기록 요약">
      <H center>오늘 기록을<br /><em>한 장으로</em> 모았어요</H>
      <Status q={s} />
      {s.data && <SummaryCard s={s.data} />}
      <Info tone="g">병인지 아닌지는 <b>방역기관 검사</b>로 확인해요. 의심되면 신고해 주세요. 이 기록은 정기 검사를 대신하지 않아요.</Info>
      <Btn v="d" to={`/f-s12?id=${id}`}>이 기록 들고 신고하기</Btn>
      <Btn v="s" to={`/f-s19?id=${id}`}>화면으로 보여주기</Btn>
      <Btn v="t" to="/f-s01">오늘은 기록만 저장</Btn>
    </Check>
  );
}

export function FS19() {
  const s = useSummary();
  const me = useApi<FarmerMe>('/api/auth/me').data;
  return (
    <Check title="보여주기">
      <Status q={s} />
      {me?.farm && <H>{me.farm.name}</H>}
      {s.data && <SummaryCard s={s.data} />}
      {s.data?.delivered && <Info tone="ok">이 기록은 담당 기관에 보냈어요. 접수자 웹에서도 볼 수 있어요.</Info>}
    </Check>
  );
}

/* ---------- F-S12 신고 방법 고르기 ---------- */
export function FS12() {
  const id = useId();
  const org = useApi<FarmerMe>('/api/auth/me').data?.farm?.org_name ?? '담당 축협';
  return (
    <Check title="신고 방법 고르기">
      <H>어떻게 <span className="red">신고</span>할까요?</H>
      <P>어느 방법이든 <b>오늘 기록이 함께</b> 전달돼요</P>
      <RouteCard danger title="전화로 신고" sub="1588-9060 · 통화할 때 말할 내용을 보여드려요" to={`/f-s13p?id=${id}&via=tel`} />
      <RouteCard title="우리 축협·담당자" sub={`${org} · 기록이 바로 전달돼요`} to={`/f-s13?id=${id}&route=coop`} />
      <RouteCard title="인터넷 신고서" sub="신고서 항목을 복사해 붙여넣기" to={`/f-s13p?id=${id}&via=web`} />
      <RouteCard title="시·군 가축방역관" sub="관할 시군청 · 기록이 바로 전달돼요" to={`/f-s13?id=${id}&route=gov`} />
    </Check>
  );
}

/* ---------- F-S13 · F-S13P 보내기 전 확인 (FARM-15) ---------- */
const Check1 = ({ on, set, children }: { on: boolean; set: (v: boolean) => void; children: ReactNode }) => (
  <label><input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} /> <b>{children}</b></label>
);

/**
 * 승인 → 전달. 같은 화면에서 다시 눌러도 한 번만 전달된다(Idempotency-Key). 인터넷이 없으면 대기열에 넣고 F-E04.
 * 이미 보냈으면(409) 완료 화면에 "이미 보냈어요", 전달 실패(5xx)면 [다시 시도][전화로 신고][나중에 보내기] 시트 (오류·예외 DELIVER-FAIL)
 */
function useDeliver(route: 'call' | 'coop' | 'web' | 'gov', opts: { send_to_coop?: boolean; share_phone: boolean }, after: (d: Delivered) => string) {
  const id = useId();
  const nav = useNavigate();
  const [key] = useState(newKey);
  const later = () => enqueue({ key, symptom_report_id: Number(id), route, ...opts, approved_at: new Date().toISOString() });
  const f = useSend(async () => {
    try {
      const d = await api<Delivered>('/api/farmer/deliveries', { method: 'POST', body: { symptom_report_id: Number(id), route, ...opts }, headers: { 'Idempotency-Key': key } });
      nav(after(d), { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'CONFLICT-409') {
        const d: Delivered = { delivery_id: 0, route, status: 'delivered', org_name: null, cc_org_name: null, approved_at: '', disease: flow.summary?.disease ?? null, form6_text: null };
        nav(after(d) + '&dup=1', { replace: true });
      } else if (isServerErr(e)) {
        openSheet({
          title: '아직 보내지 못했어요',
          body: '다시 보내거나 전화로 신고해 주세요.',
          actions: [['다시 시도', () => void f.submit(), 'p'], ['전화로 신고', () => nav('/f-e04'), 'd'], ['나중에 보내기', () => (later(), nav('/f-s01')), 't']],
        });
      } else if (e instanceof ApiError && e.code === 'NET-OFF') {
        // 승인 시각은 지금 누른 시각으로, 같은 키로 나중에 한 번만 보낸다 (SOS-OFFLINE ③)
        later();
        nav('/f-e04?queued=1');
      } else throw e;
    }
  });
  return f;
}

const sendWhat = (s?: Summary) => (s ? `오늘 요약 1장${s.photos.length ? ` · 사진 ${s.photos.length}장` : ''}${s.video ? ' · 영상 1개' : ''}` : '오늘 요약 1장');

export function FS13() {
  const id = useId();
  const route = useSearchParams()[0].get('route') === 'gov' ? 'gov' : 'coop';
  const org = useApi<FarmerMe>('/api/auth/me').data?.farm?.org_name ?? '담당 축협';
  const to = route === 'gov' ? '관할 시군청 가축방역관' : org;
  const [share, setShare] = useState(true);
  const { submit, err, busy } = useDeliver(route, { share_phone: share }, (d) => `/f-s14?id=${id}&org=${encodeURIComponent(d.org_name ?? '')}${d.disease ? '&d=' + d.disease : ''}`);
  return (
    <Check title="보내기 전 확인">
      <H center><em>{to}</em>에<br />이 기록을 보낼까요?</H>
      <KV rows={[['보내는 것', sendWhat(flow.summary)], ['지난 기록', '최근 14일 일지 · 소독·접종 이력'], ['받는 곳', to]]} />
      <Card><Check1 on={share} set={setShare}>내 휴대폰 번호도 함께 보내기</Check1></Card>
      <P center>보내기 전에는 아무에게도 전달되지 않아요</P>
      <Err>{err._}</Err>
      <Btn onClick={submit} disabled={busy}>네, 보낼게요</Btn>
      <Btn v="t" to={`/f-s11?id=${id}`}>보내지 않기</Btn>
    </Check>
  );
}

export function FS13P() {
  const id = useId();
  const web = useSearchParams()[0].get('via') === 'web';
  const org = useApi<FarmerMe>('/api/auth/me').data?.farm?.org_name ?? '담당 축협';
  const [coop, setCoop] = useState(true);
  const [share, setShare] = useState(true);
  const { submit, err, busy } = useDeliver(web ? 'web' : 'call', { send_to_coop: coop, share_phone: share }, (d) =>
    `${web ? '/f-s14w' : '/f-s14p'}?id=${id}${d.status === 'delivered' ? '&cc=' + encodeURIComponent(d.cc_org_name ?? d.org_name ?? '') : ''}${d.disease ? '&d=' + d.disease : ''}`);
  return (
    <Check title="보내기 전 확인">
      <H center><span className="red">{web ? '인터넷 신고서로 신고' : '전화로 신고'}</span>하기 전에<br />확인해 주세요</H>
      <KV rows={[['신고', '가축질병 신고 1588-9060'], ['보내는 것', sendWhat(flow.summary) + ' · 14일 일지']]} />
      <Card>
        <Check1 on={coop} set={setCoop}>{org}에도 기록 보내기</Check1>
        <Muted>신고센터는 기록을 받을 수 없어서 담당 축협이 받아 둬요</Muted>
      </Card>
      {coop && <Card><Check1 on={share} set={setShare}>내 휴대폰 번호도 함께 보내기</Check1></Card>}
      <Err>{err._}</Err>
      <Btn onClick={submit} disabled={busy}>다음</Btn>
    </Check>
  );
}

/* ---------- F-S14 전달 완료 · F-S14P 전화 · F-S14W 인터넷 신고서 ---------- */
export function FS14() {
  const [q] = useSearchParams();
  const f = useApi<Facility>('/api/farmer/facilities/nearest');
  return (
    <Phone title="전달 완료" back={false} tab="홈">
      <Done />
      <H center>{q.get('dup') ? '이미 보냈어요' : '잘 전달됐어요'}</H>
      <P center>{q.get('org') || '담당 기관'} 담당자가 기록을 보고 곧 연락드릴 거예요</P>
      <NowDo disease={q.get('d')} />
      {f.data && (
        <Card>
          <Muted>가까운 거점소독시설</Muted>
          <b>{f.data.name}{f.data.distance_km != null && ` · ${f.data.distance_km}km`}</b>
          <span>{[f.data.operating_hours, f.data.phone].filter(Boolean).join(' · ')}</span>
        </Card>
      )}
      <Btn to="/f-s01">처음으로</Btn>
    </Phone>
  );
}

/** 신고 전화번호 + 복사 (F-S14P, F-P01 공용) */
export const CallNumber = () => (
  <Row>
    <H>1588-9060</H>
    <CopyBtn text="1588-9060">번호 복사</CopyBtn>
  </Row>
);

/** [전화 걸기]. 통화 앱이 열리지 않으면(PC·일부 인앱 브라우저) 안내를 띄운다 (SOS-TEL-NA) */
export function CallBtn({ children = '전화 걸기' }: { children?: ReactNode }) {
  const [na, setNa] = useState(false);
  // 통화 앱이 열리면 이 화면이 가려진다(blur·visibilitychange). 1.5초 안에 안 가려지면 안 열린 것으로 본다
  const watch = () => {
    let left = false;
    const leave = () => (left = true);
    window.addEventListener('blur', leave, { once: true });
    document.addEventListener('visibilitychange', leave, { once: true });
    setTimeout(() => {
      window.removeEventListener('blur', leave);
      document.removeEventListener('visibilitychange', leave);
      setNa(!left);
    }, 1500);
  };
  return (
    <>
      <Btn v="d" href="tel:15889060" onClick={watch}>{children}</Btn>
      {na && <div role="alert"><Info tone="w">이 화면에서는 바로 전화가 안 돼요. 휴대폰으로 1588-9060에 전화해 주세요.</Info></div>}
    </>
  );
}

export function FS14P() {
  const [q] = useSearchParams();
  const cc = q.get('cc');
  return (
    <Check title="전화로 신고">
      {q.get('dup') && <Info tone="ok">이미 보냈어요.</Info>}
      <H center>이제 <span className="red">전화로 신고</span>해 주세요</H>
      <CallNumber />
      <CallBtn />
      <Btn v="s" to="/f-e04?from=call">통화할 때 말할 내용 보기</Btn>
      {cc && <Info tone="ok"><b>{cc}</b>에도 기록을 보냈어요</Info>}
      <NowDo disease={q.get('d')} />
      <Btn v="t" to="/f-s01">처음으로</Btn>
    </Check>
  );
}

export function FS14W() {
  const [q] = useSearchParams();
  const s = useSummary();
  const x = s.data;
  return (
    <Check title="인터넷 신고서">
      {q.get('dup') && <Info tone="ok">이미 보냈어요.</Info>}
      <H center>신고서 항목을<br /><em>복사해 붙여넣어 주세요</em></H>
      <Status q={s} />
      {x?.form6_text ? (
        <>
          <Card>{x.form6_text.split('\n').map((l) => <span key={l}>{l}</span>)}</Card>
          <CopyBtn text={x.form6_text}>항목 전체 복사</CopyBtn>
        </>
      ) : x && <Info tone="w">신고서 항목을 만들지 못했어요. 오늘 기록을 보고 직접 적어 주세요.</Info>}
      {x && x.photos.some((p) => p.url) && (
        <Row>{x.photos.filter((p) => p.url).map((p) => <Btn key={p.media_id} v="s" href={p.url!}>{PART[p.part] ?? p.part} 사진 열기</Btn>)}</Row>
      )}
      <Info tone="w"><a href="tel:15889060">급하면 전화가 더 빨라요 · 1588-9060</a></Info>
      <NowDo disease={q.get('d')} />
      <Btn v="t" to="/f-s01">처음으로</Btn>
    </Check>
  );
}
