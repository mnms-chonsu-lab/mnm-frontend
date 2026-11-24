import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  api, ApiError, newKey, uploadFile,
  type Actions, type Answer, type Behavior, type Delivered, type Facility, type FarmerMe, type Page, type PartCheck, type Question, type Summary, type SymptomSaved, type UploadForm,
} from '@mnm/api-client';
import { Btn, Card, CopyBtn, Done, Err, H, Info, Input, KV, Muted, P, Phone, Pic, Pill, RouteCard, Row, Status, Steps, useApi, useNavigate, useSearchParams } from '@mnm/ui';
import { CowList, PART, cowDesc, cowName, flow, kday, useCows, useId, useSend } from './shared';

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

/** 신고 후 "지금 해 주세요" (FARM-16, 게시된 조치 문구 원문). disease가 없으면 그리지 않는다 */
const NowDo = ({ disease, max = 3 }: { disease: string | null; max?: number }) => (disease ? <NowDoList disease={disease} max={max} /> : null);

function NowDoList({ disease, max }: { disease: string; max: number }) {
  const a = useApi<Actions>(`/api/farmer/guide/actions?disease=${disease}`);
  const x = a.data;
  return (
    <Card>
      <b>지금 해 주세요{x && ` · ${x.guide_name}`}</b>
      <Status q={a} />
      {x?.actions.slice(0, max).map((y, i) => <span key={y.rule_id}>{i + 1}. {y.text}</span>)}
    </Card>
  );
}

/* ---------- F-S08 소 고르기 ---------- */
export function FS08() {
  const nav = useNavigate();
  const cows = useCows().data?.items ?? [];
  const [tag, setTag] = useState('');
  const [found, setFound] = useState<typeof cows>();
  useEffect(() => {
    flow.check = { answers: {} };
  }, []);
  const find = () => {
    const m = cows.filter((c) => c.tag_last4 === tag.trim());
    if (m.length === 1) nav(`/f-s08s?cow=${m[0].cow_id}`);
    else setFound(m);
  };
  return (
    <Check>
      <H>어느 소가<br /><em>평소와 다른가요?</em></H>
      <CowList to={(c) => `/f-s08s?cow=${c.cow_id}`} />
      <Row>
        <Input label="귀표 끝 4자리" inputMode="numeric" maxLength={4} value={tag} onChange={(e) => (setTag(e.target.value), setFound(undefined))} />
        <Btn v="s" onClick={find} disabled={tag.trim().length !== 4}>찾기</Btn>
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
  const next = () => {
    flow.check.cowId = cowId ? Number(cowId) : null;
    flow.check.observed = text.trim() || undefined;
    nav('/f-s09q');
  };
  return (
    <Check>
      <H center>{cow ? cowName(cow, cows) + ' 소가' : '소가'}<br /><em>어떤 모습</em>인가요?</H>
      {cow && <P center>{cowDesc(cow)}</P>}
      <Input label="예: 사료를 안 먹고 침을 흘려. 오늘 아침부터 그래." rows={3} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
      <Row>
        <Btn v="t" onClick={next}>건너뛰기</Btn>
        <Btn onClick={next} disabled={!text.trim()}>다 말했어요</Btn>
      </Row>
    </Check>
  );
}

/* ---------- F-S09Q 몇 마리 ---------- */
// shortcut: "2마리 이상"은 2로 보낸다, 정확한 수를 묻는 화면이 생기면 숫자로 받는다
const HEADS: [string, number | null][] = [['1마리', 1], ['2마리 이상', 2], ['잘 모르겠어요', null]];

export function FS09Q() {
  const nav = useNavigate();
  return (
  <Check>
    <Steps n={3} on={0} />
    <P><b>신고서에 들어가요 · 1 / 3</b></P>
    <H>이런 모습인 소가<br /><em>몇 마리</em>인가요?</H>
    {HEADS.map(([x, n]) => <Btn key={x} v="s" onClick={() => ((flow.check.headCount = n), nav('/f-s09'))}>{x}</Btn>)}
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
      body: { cow_id: c.cowId ?? null, answers: { drool: 'unknown', blister: 'unknown', feed: 'unknown', lump: 'unknown', ...c.answers }, observed_text: c.observed, head_count: c.headCount ?? undefined },
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

/** 카메라로 찍거나 앨범에서 고르는 버튼 */
const Pick = ({ accept, label, busy, onFile }: { accept: string; label: string; busy: boolean; onFile: (f: File) => void }) => (
  <label className="btn p" aria-disabled={busy} style={busy ? { opacity: 0.6, pointerEvents: 'none' } : undefined}>
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
  const bad = res?.status === 'done' && (res.match === false || res.dark || res.blurry);
  return (
    <Check title="사진 찍기">
      <Steps n={parts.length} on={i} />
      <H>{p.part_name} 사진을<br /><em>찍어 주세요</em> ({i + 1}/{parts.length})</H>
      <Pic oval src={preview}>{p.guide}</Pic>
      {res?.status === 'done' && res.match === false && <Info tone="w"><b>{p.part_name}이(가) 잘 안 보여요.</b> {p.guide} 다시 찍어 주세요.</Info>}
      {res?.status === 'done' && res.match !== false && res.dark && <Info tone="w"><b>사진이 어두워요.</b> 밝은 곳에서 한 번 더 찍어 주세요.</Info>}
      {res?.status === 'done' && res.match !== false && !res.dark && res.blurry && <Info tone="w"><b>사진이 흔들렸어요.</b> 한 번 더 찍어 주세요.</Info>}
      {res && !bad && <Info tone="ok"><b>사진을 저장했어요.</b>{res.status === 'pending' && ' 부위 확인은 조금 뒤에 끝나요.'}{res.status === 'failed' && ' 부위 확인은 안 됐어요.'}</Info>}
      <Err>{err._}</Err>
      {res && !bad ? <Btn onClick={next}>다음</Btn> : <Pick accept={PHOTO_TYPES.join(',')} label={res || err._ ? '다시 찍기' : '사진 찍기 · 고르기'} busy={busy} onFile={setFile} />}
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
      {res && (
        <Info tone="ok">
          <b>영상을 저장했어요.</b>{' '}
          {res.ratio ? <>영상에서 본 모습: 눕기 {res.ratio.lie}% · 서기 {res.ratio.stand}% · 먹기 {res.ratio.eat}% <Muted>(참고)</Muted></> : res.status === 'pending' ? '모습 분류는 조금 뒤에 끝나요.' : '모습 분류는 안 됐어요.'}
        </Info>
      )}
      <Err>{err._}</Err>
      {res ? <Btn to={done}>다음</Btn> : <Pick accept={VIDEO_TYPES.join(',')} label={err._ ? '다시 올리기' : '영상 찍기 · 고르기'} busy={busy} onFile={setFile} />}
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
      <span><b>{s.cow ? `${s.cow.tag_last4}번 · ${cowDesc(s.cow)}` : '귀표 번호 모름'}</b> {s.matched_count > 0 && <Pill tone="d">공식 증상 {s.matched_count}개</Pill>}</span>
      {s.matched.map((m) => <span key={m}>· {m} <Official /></span>)}
      {s.observed_text && <span>· 본 것: {s.observed_text}</span>}
      <span>· 처음 본 날 {kday(s.found_date)}{s.head_count != null && ` · ${s.head_count}마리`}{s.barn && ` · ${s.barn}`}</span>
      {s.related_diary.map((d) => <span key={d.entry_id}>· {kday(d.date)} {d.category} {d.value} (일지)</span>)}
      {s.vaccine && <span>· 최근 접종: {s.vaccine.value} {kday(s.vaccine.date)}</span>}
      {s.video?.ratio && <span>· 영상에서 본 모습: 눕기 {s.video.ratio.lie}% · 서기 {s.video.ratio.stand}% · 먹기 {s.video.ratio.eat}% <Muted>(참고)</Muted></span>}
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

/** 승인 → 전달. 같은 화면에서 다시 눌러도 한 번만 전달된다(Idempotency-Key). 인터넷이 없으면 F-E04 */
function useDeliver(route: 'call' | 'coop' | 'web' | 'gov', opts: { send_to_coop?: boolean; share_phone: boolean }, after: (d: Delivered) => string) {
  const id = useId();
  const nav = useNavigate();
  const [key] = useState(newKey);
  return useSend(async () => {
    try {
      const d = await api<Delivered>('/api/farmer/deliveries', { method: 'POST', body: { symptom_report_id: Number(id), route, ...opts }, headers: { 'Idempotency-Key': key } });
      nav(after(d), { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'NET-OFF') nav('/f-e04');
      else throw e;
    }
  });
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
      <H center>잘 전달됐어요</H>
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
      <H center>이제 <span className="red">전화로 신고</span>해 주세요</H>
      <CallNumber />
      <CallBtn />
      <Btn v="s" to="/f-e04">통화할 때 말할 내용 보기</Btn>
      {cc && <Info tone="ok"><b>{cc}</b>에도 기록을 보냈어요</Info>}
      <NowDo disease={q.get('d')} max={2} />
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
      <NowDo disease={q.get('d')} max={1} />
      <Btn v="t" to="/f-s01">처음으로</Btn>
    </Check>
  );
}
