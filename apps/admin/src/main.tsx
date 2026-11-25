import { useMemo, useState, type ReactNode } from 'react';
import {
  api, ApiError, apiReady, logout, qs, setMocks,
  type AdminDelivery, type AdminUser, type AdminUserRow, type AiMetrics, type AuditLog, type EtlJob, type EtlJobName, type EtlRun, type InferenceLog, type Guide, type GuideContent, type GuideKind, type GuideStatus, type Health, type HealthStatus,
  type Inbox, type Me, type Org, type OrgType, type Page as ApiPage, type Role, type TodayMetrics, type UserStatus,
} from '@mnm/api-client';
import { adminMocks } from '@mnm/mocks';
import {
  Btn, Card, Chips, CopyBtn, Err, Form, Gnb, H, Info, Input, Kpis, KV, Link, Modal, Muted, P, Pill, Row, Select, Side, Status, Tbl, WebLogin, WebPassword,
  errText, mount, useApi, useAuthForm, useNavigate, usePage, useSearchParams, type Screen, type To,
} from '@mnm/ui';

setMocks(adminMocks);

const MENU: [string, string][] = [
  ['대시보드', '/a-s01'], ['사용자', '/a-s02'], ['접수 기관', '/a-s09'], ['신고·전달', '/a-s04'],
  ['안내 문구', '/a-s05'], ['공공데이터', '/a-s06'], ['모델·AI 로그', '/a-s07'], ['감사 로그', '/a-s08'],
];

/** 어드민 공통 틀: 상단 바(운영자 이름, AUTH-03) + 좌측 메뉴 */
function Page({ children }: { children: ReactNode }) {
  const me = useApi<Me>('/api/auth/me').data;
  return (
    <>
      <Gnb brand="촌수의사 어드민" right={<>운영자{me && ` · ${me.name}`} <Link to="/r-s01" onClick={logout}>로그아웃</Link></>} />
      <Side items={MENU}>{children}</Side>
    </>
  );
}

/** 제목 + 오른쪽 주 버튼 */
const Head = ({ title, action, to }: { title: string; action: string; to?: To }) => (
  <Row>
    <H>{title}</H>
    <Btn to={to}>{action}</Btn>
  </Row>
);

/* ---------- 공통 ---------- */
const ROLE: Record<Role, string> = { farmer: '농가', receiver: '접수자', admin: '운영자' };
const USER_STATUS: Record<UserStatus, string> = { active: '활성', suspended: '정지', invited: '초대됨' };

const pad = (n: number) => String(n).padStart(2, '0');
/** ISO 시각 → "11.14 10:02" (이 기기 시간대) */
const at = (iso: string | null) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

type Draft = Record<string, string>;
/** 입력 칸 묶기: 값·바꾸기·칸별 오류. 서버 칸 이름은 snake_case(중첩이면 "content.text") */
const binder = (v: Draft, setV: (v: Draft) => void, err: Record<string, string>, prefix = '') => (k: string) => ({
  value: v[k] ?? '',
  onChange: (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value }),
  err: err[prefix + k],
});
/** 칸 옆에 보이지 않은 오류(전체 문구·목록 칸 등)를 모은다 */
const others = (err: Record<string, string>, shown: string[]) =>
  Object.entries(err).filter(([k]) => !shown.includes(k)).map(([, m]) => m).join(' ') || undefined;

const orgOptions = (orgs: Org[], type?: OrgType): [string, string][] =>
  orgs.filter((o) => !type || o.type === type).map((o) => [String(o.org_id), o.name]);
const inboxOptions = (orgs: Org[], orgId: string): [string, string][] =>
  (orgs.find((o) => String(o.org_id) === orgId)?.inboxes ?? []).map((b) => [b.inbox_id!, b.name]);

/** 임시 비밀번호 1회 표시 (A-P01 결과 · 비밀번호 초기화) */
const TempPw = ({ title, loginId, pw, onClose }: { title: string; loginId: string | null; pw: string; onClose: () => void }) => (
  <Modal onClose={onClose}>
    <H>{title}</H>
    <KV rows={[['아이디', loginId ?? '-'], ['임시 비밀번호', pw]]} />
    <CopyBtn text={pw}>임시 비밀번호 복사</CopyBtn>
    <P>이 창을 닫으면 다시 볼 수 없어요. 본인에게 직접 전달하세요.</P>
    <Btn onClick={onClose}>확인</Btn>
  </Modal>
);

/** 아직 서버 API가 없는 부분 표시 */
const Sample = ({ what }: { what: string }) => (apiReady ? <Info tone="w">{what}는 아직 서버에 연결하지 않았어요. 아래는 예시예요.</Info> : null);
const pct = (r: number | null | undefined) => (r == null ? '-' : (r * 100).toFixed(1) + '%');
const sec = (ms: number | null | undefined) => (ms == null ? '-' : (ms / 1000).toFixed(1) + 's');
/** 기간 칩: [이름, 며칠] (null = 전체 기간) */
const PERIODS: [string, number | null][] = [['최근 7일', 7], ['최근 30일', 30], ['전체 기간', null]];
const useFrom = (days: number | null) => useMemo(() => (days ? new Date(Date.now() - days * 864e5).toISOString() : undefined), [days]);

/* ---------- A-S01 대시보드 (ADM-01) ---------- */
const COMPONENT: Record<string, [string, To?]> = { api: ['API 서버'], db: ['DB'], ai: ['AI 추론', '/a-s07'], etl: ['공공데이터 수집', '/a-s06'] };
const HEALTH: Record<HealthStatus, string> = { normal: '● 정상', delayed: '▲ 지연', error: '✕ 오류', unknown: '- 확인 안 됨' };

function AS01() {
  const h = useApi<Health>('/api/admin/health');
  const t = useApi<TodayMetrics>('/api/admin/metrics/today');
  const comps = h.data?.components ?? [];
  const name = (key: string) => COMPONENT[key]?.[0] ?? key;
  return (
    <Page>
      <H>운영 대시보드</H>
      <Status q={h} />
      {comps.length > 0 && (
        <Tbl
          head={['구성요소', '상태', '최근 확인']}
          rows={comps.map((c) => [name(c.key), HEALTH[c.status] + (c.detail ? ' · ' + c.detail : ''), at(c.last_at)])}
          rowTo={(i) => COMPONENT[comps[i].key]?.[1]}
        />
      )}
      <Status q={t} />
      {t.data && (
        <Kpis
          items={[
            ['오늘 기록', t.data.records + '건'],
            ['오늘 전달', t.data.deliveries + '건'],
            ['미처리 접수', t.data.pending_receipts + '건'],
            ['AI 오류율', t.data.ai_error_rate == null ? '-' : (t.data.ai_error_rate * 100).toFixed(1) + '%'],
          ]}
        />
      )}
      {comps.filter((c) => c.status === 'delayed' || c.status === 'error').map((c) => (
        <Info key={c.key} tone={c.status === 'error' ? 'd' : 'w'}>{name(c.key)} {HEALTH[c.status].slice(2)}{c.detail && ` (${c.detail})`}</Info>
      ))}
    </Page>
  );
}

/* ---------- A-S02 사용자 목록 (ADM-02) ---------- */
const FILTERS: [string, Record<string, string>][] = [['전체', {}], ['농가', { role: 'farmer' }], ['접수자', { role: 'receiver' }], ['운영자', { role: 'admin' }], ['정지', { status: 'suspended' }]];

function Users({ children }: { children?: ReactNode }) {
  const [f, setF] = useState(0);
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const list = usePage<AdminUserRow>('/api/admin/users' + qs({ ...FILTERS[f][1], q }));
  const rows = list.items;
  return (
    <Page>
      <Head title="사용자" action="+ 계정 만들기" to="/a-p01" />
      <Chips items={FILTERS.map(([n]) => n)} on={f} onPick={setF} />
      <Form onSubmit={(e) => (e.preventDefault(), setQ(text.trim()))}>
        <Input label="이름·아이디·연락처·농장명·농장식별번호 검색 (엔터)" type="search" value={text} onChange={(e) => setText(e.target.value)} />
      </Form>
      <Status q={list} empty={rows.length === 0 && '조건에 맞는 사용자가 없어요.'} />
      {rows.length > 0 && (
        <Tbl
          head={['이름', '역할', '소속 / 농장', '연락처', '상태', '최근 접속']}
          rows={rows.map((u) => [
            u.name,
            ROLE[u.role],
            u.role === 'farmer' ? `${u.farm_no} · ${u.farm_name}` : u.org_name ?? '-',
            u.phone_masked ?? '-',
            USER_STATUS[u.status],
            at(u.last_login_at),
          ])}
          rowTo={(i) => (rows[i].role === 'farmer' ? '/a-s03f' : '/a-s03') + '?id=' + rows[i].users_id}
        />
      )}
      {list.more && <Btn v="t" onClick={list.more}>더 보기</Btn>}
      {children}
    </Page>
  );
}

const AS02 = () => <Users />;

/* ---------- A-P01 계정 만들기 (ADM-03) ---------- */
const ROLES: Role[] = ['farmer', 'receiver', 'admin'];
/** 역할별로 보내는 칸 (openapi 필수 칸 — 농가: farm_no·name·phone / 접수자: name·login_id·org_id / 운영자: name·login_id) */
const CREATE_FIELDS: Record<Role, string[]> = {
  farmer: ['name', 'farm_no', 'phone', 'farm_name', 'address', 'head_count', 'region_code', 'org_id'],
  receiver: ['name', 'login_id', 'org_id', 'inbox_id'],
  admin: ['name', 'login_id'],
};
const NUMBER_FIELDS = ['head_count', 'org_id'];

function AP01() {
  const nav = useNavigate();
  const [ri, setRi] = useState(0);
  const role = ROLES[ri];
  const [v, setV] = useState<Draft>({});
  const [made, setMade] = useState<{ loginId: string | null; pw: string }>();
  const orgs = useApi<ApiPage<Org>>('/api/admin/orgs').data?.items ?? [];
  const f = useAuthForm(async () => {
    const body: Record<string, unknown> = { role };
    for (const k of CREATE_FIELDS[role]) if (v[k]?.trim()) body[k] = NUMBER_FIELDS.includes(k) ? Number(v[k]) : v[k].trim();
    const r = await api<{ users_id: number; login_id: string | null; temp_password: string | null }>('/api/admin/users', { method: 'POST', body });
    if (r.temp_password) setMade({ loginId: r.login_id, pw: r.temp_password });
    else nav('/a-s03f?id=' + r.users_id, { replace: true });
  }, errText);
  // 기관을 바꾸면 그 기관 수신함을 다시 고른다
  const bind = binder(v, (x) => setV(x.org_id === v.org_id ? x : { ...x, inbox_id: '' }), f.err);
  const fields = CREATE_FIELDS[role];
  if (made) return <Users><TempPw title={`${ROLE[role]} 계정을 만들었어요`} loginId={made.loginId} pw={made.pw} onClose={() => nav('/a-s02')} /></Users>;
  return (
    <Users>
      <Modal>
        <Form onSubmit={f.submit}>
          <H>계정 만들기</H>
          <Chips items={ROLES.map((r) => ROLE[r])} on={ri} onPick={setRi} />
          <Input label="이름" {...bind('name')} />
          {role === 'farmer' ? (
            <>
              <Input label="농장식별번호 6자리" inputMode="numeric" maxLength={6} {...bind('farm_no')} />
              <Input label="휴대폰 번호" inputMode="tel" {...bind('phone')} />
              <Input label="농장 이름 (비우면 '이름 농장')" {...bind('farm_name')} />
              <Input label="농장 주소" {...bind('address')} />
              <Input label="사육 두수" type="number" min={0} {...bind('head_count')} />
              <Input label="법정동 코드 10자리" inputMode="numeric" maxLength={10} {...bind('region_code')} />
              <Select label="담당 축협" options={orgOptions(orgs, '축협')} {...bind('org_id')} />
            </>
          ) : (
            <Input label="아이디 (영문·숫자·._- 3자 이상)" autoComplete="off" {...bind('login_id')} />
          )}
          {role === 'receiver' && (
            <>
              <Select label="소속 기관" options={orgOptions(orgs)} {...bind('org_id')} />
              <Select label="수신함" options={inboxOptions(orgs, v.org_id ?? '')} {...bind('inbox_id')} />
            </>
          )}
          <Err>{others(f.err, fields)}</Err>
          <Row>
            <Btn v="t" to={-1}>취소</Btn>
            <Btn submit disabled={f.busy}>만들기</Btn>
          </Row>
        </Form>
      </Modal>
    </Users>
  );
}

/* ---------- A-S03 · A-S03F 사용자 상세 (ADM-02 · ADM-04) ---------- */
/** demo: ?id 없이 열었을 때(화면 목록에서 바로 열기) 보여 줄 예시 사용자 */
function AS03({ demo }: { demo: string }) {
  const id = useSearchParams()[0].get('id') ?? demo;
  const u = useApi<AdminUser>('/api/admin/users/' + id);
  const orgs = useApi<ApiPage<Org>>('/api/admin/orgs').data?.items ?? [];
  const [v, setV] = useState<Draft>({});
  const [pw, setPw] = useState<string>();
  const [saved, setSaved] = useState(false);
  const d = u.data;
  const patch = (body: Record<string, unknown>) => api<{ user: AdminUser; temp_password: string | null }>('/api/admin/users/' + id, { method: 'PATCH', body });
  const orgId = v.org_id ?? String(d?.org_id ?? '');
  const inboxId = v.inbox_id ?? (v.org_id === undefined ? d?.inbox_id ?? '' : '');

  const save = useAuthForm(async () => {
    setSaved(false);
    const body: Record<string, unknown> = {};
    if (v.phone?.trim()) body.phone = v.phone.trim();
    if (orgId && orgId !== String(d?.org_id ?? '')) body.org_id = Number(orgId);
    if (inboxId && inboxId !== d?.inbox_id) body.inbox_id = inboxId;
    if (Object.keys(body).length === 0) return;
    await patch(body);
    setV({});
    setSaved(true);
    u.reload();
  }, errText);
  const suspend = useAuthForm(async () => {
    const off = d?.status !== 'suspended';
    if (off && !confirm(`${d?.name} 계정을 정지할까요? 정지하면 로그인할 수 없어요.`)) return;
    await patch({ status: off ? 'suspended' : 'active' });
    u.reload();
  }, errText);
  const reset = useAuthForm(async () => {
    if (!confirm('임시 비밀번호를 새로 만들까요? 지금 비밀번호로는 더 이상 로그인할 수 없어요.')) return;
    const r = await patch({ reset_password: true });
    setPw(r.temp_password ?? undefined);
    u.reload();
  }, errText);

  if (!d) return <Page><Status q={u} /></Page>;
  const farmer = d.role === 'farmer';
  const bind = binder(v, (x) => setV(x.org_id === v.org_id ? x : { ...x, inbox_id: '' }), save.err);
  const inbox = orgs.find((o) => o.org_id === d.org_id)?.inboxes.find((b) => b.inbox_id === d.inbox_id);
  return (
    <Page>
      <H>{d.name} <Pill>{ROLE[d.role]}</Pill></H>
      <Status q={u} />
      <Row>
        <Card>
          <b>계정</b>
          <span>{farmer ? `농장식별번호 ${d.farm?.farm_no ?? '-'}` : `아이디 ${d.login_id ?? '-'}`}</span>
          <span>{farmer ? '휴대폰' : '연락처'} {d.phone_masked ?? '-'}</span>
          {d.role !== 'admin' && <span>{farmer ? '담당 축협' : '소속'} {d.org_name ?? '-'}</span>}
          {d.role === 'receiver' && <span>수신함 {inbox?.name ?? '-'}</span>}
          <span>
            상태 {USER_STATUS[d.status]}
            {d.locked && ' · 로그인 잠김'}
            {d.must_change_pw && ' · 임시 비밀번호'} · 최근 접속 {at(d.last_login_at)}
          </span>
        </Card>
        {d.farm && (
          <Card>
            <b>농장</b>
            <span>{d.farm.name} · {d.farm.address ?? '주소 없음'}{d.farm.head_count != null && ` · ${d.farm.head_count}두`}</span>
            <span>법정동 코드 {d.farm.region_code ?? '-'}</span>
            <span>등록된 소 {d.farm.cow_count}마리</span>
            <span>최근 30일 기록 {d.farm.records30d}건 · 보낸 기록 {d.farm.delivered_count}건</span>
          </Card>
        )}
      </Row>
      <Card>
        <b>바꾸기</b>
        <Form onSubmit={save.submit}>
          <Input top label="휴대폰 번호 (바꿀 때만 입력)" inputMode="tel" {...bind('phone')} />
          {d.role !== 'admin' && (
            <Select top label={farmer ? '담당 축협' : '소속 기관'} options={orgOptions(orgs, farmer ? '축협' : undefined)} {...bind('org_id')} value={orgId} />
          )}
          {d.role === 'receiver' && <Select top label="수신함" options={inboxOptions(orgs, orgId)} {...bind('inbox_id')} value={inboxId} />}
          <Err>{others(save.err, ['phone', 'org_id', 'inbox_id'])}</Err>
          {saved && <Muted>저장했어요.</Muted>}
          <Btn submit disabled={save.busy}>저장</Btn>
        </Form>
      </Card>
      <Err>{others({ ...suspend.err, ...reset.err }, [])}</Err>
      <Row>
        {!farmer && <Btn v="t" disabled={reset.busy} onClick={() => reset.submit()}>비밀번호 초기화</Btn>}
        <Btn v="t" disabled={suspend.busy} onClick={() => suspend.submit()}>{d.status === 'suspended' ? '정지 풀기' : '계정 정지'}</Btn>
      </Row>
      {farmer && <Info tone="g">기록 내용은 이 화면에 보이지 않아요. 신고·전달 현황에서 열람하면 감사 기록이 남아요.</Info>}
      {pw && <TempPw title="임시 비밀번호를 새로 만들었어요" loginId={d.login_id} pw={pw} onClose={() => setPw(undefined)} />}
    </Page>
  );
}

/* ---------- A-S09 접수 기관 (ADM-05) ---------- */
const ORG_TYPES: OrgType[] = ['축협', '방역기관', '시군청'];
const INBOX_TYPES: [Inbox['type'], string][] = [['history', '이력'], ['biosecurity', '방역']];

function AS09() {
  const nav = useNavigate();
  const id = useSearchParams()[0].get('id');
  const list = useApi<ApiPage<Org>>('/api/admin/orgs');
  const orgs = list.data?.items ?? [];
  const sel = orgs.find((o) => String(o.org_id) === id);
  return (
    <Page>
      <Head title="접수 기관" action="+ 기관 추가" to="/a-s09?id=new" />
      <Status q={list} empty={list.data?.items.length === 0 && '등록된 기관이 없어요.'} />
      {orgs.length > 0 && (
        <Tbl
          head={['기관명', '종류', '관할 지역 (법정동 코드)', '수신함', '접수자', '대표 연락처']}
          rows={orgs.map((o) => [
            o.name,
            o.type,
            o.region_codes.join(', '),
            o.inboxes.map((b) => b.name + (b.receiver_count === 0 ? ' (받는 사람 없음)' : '')).join(' · ') || '-',
            o.receiver_count + '명',
            o.phone ?? '-',
          ])}
          rowTo={(i) => '/a-s09?id=' + orgs[i].org_id}
        />
      )}
      {(id === 'new' || sel) && (
        <OrgEdit
          key={id}
          org={sel}
          onSaved={(o) => {
            list.reload();
            nav('/a-s09?id=' + o.org_id, { replace: true });
          }}
        />
      )}
    </Page>
  );
}

function OrgEdit({ org, onSaved }: { org?: Org; onSaved: (o: Org) => void }) {
  const [v, setV] = useState<Draft>({ name: org?.name ?? '', type: org?.type ?? '', phone: org?.phone ?? '', region_codes: org?.region_codes.join(', ') ?? '' });
  const [boxes, setBoxes] = useState<Inbox[]>(org?.inboxes ?? []);
  const [saved, setSaved] = useState(false);
  const f = useAuthForm(async () => {
    setSaved(false);
    const body = {
      name: v.name.trim(),
      type: v.type,
      phone: v.phone.trim() || null,
      region_codes: v.region_codes.split(/[\s,]+/).filter(Boolean),
      inboxes: boxes.map(({ inbox_id, type, name, phone }) => ({ inbox_id, type, name: name.trim(), phone: phone?.trim() || null })),
    };
    const o = await api<Org>(org ? '/api/admin/orgs/' + org.org_id : '/api/admin/orgs', { method: org ? 'PATCH' : 'POST', body });
    setBoxes(o.inboxes); // 새 수신함에 서버가 만든 inbox_id를 받아야 다시 저장해도 중복으로 생기지 않는다
    setSaved(true);
    onSaved(o);
  }, errText);
  const bind = binder(v, setV, f.err);
  const setBox = (i: number, b: Partial<Inbox>) => setBoxes(boxes.map((x, j) => (j === i ? { ...x, ...b } : x)));
  return (
    <Card>
      <Form onSubmit={f.submit}>
        <b>{org ? `편집 · ${org.name}` : '기관 추가'}</b>
        <Input top label="기관명" {...bind('name')} />
        <Select top label="종류" options={ORG_TYPES.map((t) => [t, t])} {...bind('type')} />
        <Input top label="대표 연락처" inputMode="tel" {...bind('phone')} />
        <Input top label="관할 법정동 코드 10자리 (여러 개는 쉼표로)" inputMode="numeric" {...bind('region_codes')} />
        <b>수신함</b>
        {boxes.map((b, i) => (
          <Row key={i}>
            <Select top label="종류" options={INBOX_TYPES} value={b.type} onChange={(e) => setBox(i, { type: e.target.value as Inbox['type'] })} />
            <Input top label="수신함 이름" value={b.name} onChange={(e) => setBox(i, { name: e.target.value })} />
            <Input top label="연락처" value={b.phone ?? ''} onChange={(e) => setBox(i, { phone: e.target.value })} />
            <Btn v="t" onClick={() => setBoxes(boxes.filter((_, j) => j !== i))}>빼기</Btn>
          </Row>
        ))}
        <Btn v="s" onClick={() => setBoxes([...boxes, { type: 'biosecurity', name: '', phone: null }])}>+ 수신함 추가</Btn>
        <Err>{others(f.err, ['name', 'type', 'phone', 'region_codes'])}</Err>
        {saved && <Muted>저장했어요.</Muted>}
        <Row>
          <Btn v="t" to="/a-s09">닫기</Btn>
          <Btn submit disabled={f.busy}>저장</Btn>
        </Row>
      </Form>
    </Card>
  );
}

/* ---------- A-S04 신고·전달 현황 (ADM-06) ---------- */
const KIND: Record<string, string> = { symptom: '소 상태 기록', birth: '출생 신고 초안', death: '폐사 신고 초안', move: '이동 신고 초안' };
const ROUTES: [AdminDelivery['route'] | '', string][] = [['', '전체 경로'], ['call', '전화'], ['coop', '축협'], ['web', '인터넷 신고서'], ['gov', '시군청']];
const ROUTE_NAME = Object.fromEntries(ROUTES) as Record<string, string>;
const STATES: [AdminDelivery['status'] | '', string][] = [['', '전체 상태'], ['delivered', '도착'], ['queued', '대기 중'], ['failed', '전달 실패']];
const RECEIVER: Record<string, string> = { new: '새로 도착', checking: '확인 중', done: '처리 완료' };

/** 대기·실패 건 [다시 보내기]. 이미 도착했으면(409) 목록만 새로 고친다 */
function Retry({ id, onDone }: { id: number; onDone: () => void }) {
  const f = useAuthForm(async () => {
    try {
      await api(`/api/admin/deliveries/${id}/retry`, { method: 'POST' });
    } catch (e) {
      if (!(e instanceof ApiError && e.code === 'CONFLICT-409')) throw e;
    }
    onDone();
  }, errText);
  return <><Btn v="t" onClick={() => f.submit()} disabled={f.busy}>다시 보내기</Btn><Err>{f.err._}</Err></>;
}

function AS04() {
  const [p, setP] = useState(0);
  const [r, setR] = useState(0);
  const [s, setS] = useState(0);
  const from = useFrom(PERIODS[p][1]);
  const list = usePage<AdminDelivery>('/api/admin/deliveries' + qs({ from, route: ROUTES[r][0], status: STATES[s][0] }));
  const rows = list.items;
  return (
    <Page>
      <H>신고·전달 현황</H>
      <Chips items={PERIODS.map(([n]) => n)} on={p} onPick={setP} />
      <Chips items={ROUTES.map(([, n]) => n)} on={r} onPick={setR} />
      <Chips items={STATES.map(([, n]) => n)} on={s} onPick={setS} />
      <Status q={list} empty={rows.length === 0 && '이 조건의 전달 기록이 없어요.'} />
      {rows.length > 0 && (
        <Tbl
          head={['승인 시각', '농가', '종류', '경로', '받는 곳', '처리 상태', '전달']}
          rows={rows.map((d) => [
            at(d.approved_at),
            d.farmer_name,
            KIND[d.kind] ?? d.kind,
            ROUTE_NAME[d.route] ?? d.route,
            [d.org_name, d.cc_org_name].filter(Boolean).join(' · ') || '-',
            d.receiver_status ? RECEIVER[d.receiver_status] : '-',
            d.status === 'delivered' ? `도착 ${at(d.received_at)}` : (
              <><b className={d.status === 'failed' ? 'red' : ''}>{d.status === 'failed' ? '실패' : '대기 중'}</b> <Retry id={d.deliveries_id} onDone={list.reload} /></>
            ),
          ])}
        />
      )}
      {list.more && <Btn v="t" onClick={list.more}>더 보기</Btn>}
      <Muted>요약·신고서 내용은 이 화면에 보이지 않아요.</Muted>
    </Page>
  );
}

/* ---------- A-S05 안내 문구 (ADM-07 · ADM-08) ---------- */
const KINDS: [GuideKind, string][] = [['question', '증상 질문'], ['photo_guide', '촬영 안내'], ['action', '질병별 조치'], ['form_field', '신고 항목'], ['summary', '요약'], ['clause', '조항']];
const GUIDE_STATUS: Record<GuideStatus, string> = { draft: '초안', review: '검수 중', published: '게시' };
const STAGES: [string, string][] = [['suspect', '의심'], ['after_report', '신고 후'], ['regional', '지역 발생']];
const CONTENT_KEYS: (keyof GuideContent)[] = ['disease', 'stage', 'text', 'source_doc', 'clause', 'revised_at', 'display_order', 'example_image', 'part_code', 'photo_part', 'yes_required_parts'];

/** 편집 칸 값(문자열) ↔ 서버 내용. 화면에 없는 칸도 그대로 돌려보낸다(수정은 전체 교체) */
const toDraft = (g?: Guide): Draft =>
  Object.fromEntries(CONTENT_KEYS.map((k) => [k, Array.isArray(g?.[k]) ? (g![k] as string[]).join(', ') : String(g?.[k] ?? '')]));
const toContent = (v: Draft) =>
  Object.fromEntries(
    CONTENT_KEYS.map((k) => {
      const s = v[k].trim();
      return [k, s === '' ? null : k === 'display_order' ? Number(s) : k === 'yes_required_parts' ? s.split(/[\s,]+/).filter(Boolean) : s];
    }),
  );

function AS05() {
  const [sp, setSp] = useSearchParams();
  const tab = Number(sp.get('tab') ?? 0); // KINDS 순서, 마지막 = 검수 중
  const id = sp.get('id');
  const list = useApi<ApiPage<Guide>>('/api/admin/guides');
  const all = list.data?.items ?? [];
  const review = all.filter((g) => g.status === 'review');
  const rows = tab < KINDS.length ? all.filter((g) => g.kind === KINDS[tab][0]) : review;
  const sel = all.find((g) => String(g.biosecurity_rule_id) === id);
  const kind = sel?.kind ?? KINDS[tab]?.[0] ?? 'question';
  return (
    <Page>
      <Head title="안내 문구 · 지식베이스" action="+ 문구 등록" to={`/a-s05?tab=${tab}&id=new`} />
      <Chips
        items={[...KINDS.map(([k, n]) => `${n} ${all.filter((g) => g.kind === k).length}`), `검수 중 ${review.length}`]}
        on={tab}
        onPick={(i) => setSp({ tab: String(i) })}
      />
      <Status q={list} empty={list.data && rows.length === 0 && '이 분류에 등록된 문구가 없어요.'} />
      {rows.length > 0 && (
        <Tbl
          head={['순서', '문구', '근거 문서·조항', '개정일', '상태', '검수']}
          rows={rows.map((g) => [
            g.display_order ?? '-',
            g.text,
            g.source_doc + (g.clause ? ' · ' + g.clause : ''),
            g.revised_at ?? '-',
            `${GUIDE_STATUS[g.status]} · v${g.version}`,
            g.reviewer ?? '-',
          ])}
          rowTo={(i) => `/a-s05?tab=${tab}&id=${rows[i].biosecurity_rule_id}`}
        />
      )}
      {(id === 'new' || sel) && (
        <GuideEdit
          key={id}
          kind={kind}
          g={sel}
          onSaved={(g) => {
            list.reload();
            setSp({ tab: String(tab), id: String(g.biosecurity_rule_id) }, { replace: true });
          }}
        />
      )}
    </Page>
  );
}

function GuideEdit({ kind, g, onSaved }: { kind: GuideKind; g?: Guide; onSaved: (g: Guide) => void }) {
  const [v, setV] = useState<Draft>(() => toDraft(g));
  const [reviewer, setReviewer] = useState('');
  const url = '/api/admin/guides/' + g?.biosecurity_rule_id;
  const save = useAuthForm(async () => {
    const content = toContent(v);
    onSaved(await (g ? api<Guide>(url, { method: 'PATCH', body: { content } }) : api<Guide>('/api/admin/guides', { method: 'POST', body: { kind, content } })));
  }, errText);
  const step = useAuthForm(async () => {
    const status = g?.status === 'draft' ? 'review' : 'published';
    onSaved(await api<Guide>(url, { method: 'PATCH', body: { status, reviewer: reviewer.trim() || undefined } }));
  }, errText);
  const bind = binder(v, setV, save.err, 'content.');
  const name = KINDS.find(([k]) => k === kind)?.[1];
  return (
    <Card>
      <Form onSubmit={save.submit}>
        <b>{g ? `편집 · ${name} ${g.display_order ?? ''} (${GUIDE_STATUS[g.status]} · v${g.version})` : `${name} 등록`}</b>
        <Input top label="문구 (공식 자료 원문 그대로)" rows={3} {...bind('text')} />
        <Row>
          <Input top label="근거 문서" {...bind('source_doc')} />
          <Input top label="조항" {...bind('clause')} />
        </Row>
        <Row>
          <Input top label="질병" {...bind('disease')} />
          <Select top label="대응 단계" options={STAGES} {...bind('stage')} />
          <Input top label="개정일" type="date" {...bind('revised_at')} />
          <Input top label="화면 순서" type="number" {...bind('display_order')} />
        </Row>
        {kind === 'photo_guide' && (
          <Row>
            <Input top label="부위 코드" {...bind('part_code')} />
            <Input top label="부위 이름" {...bind('photo_part')} />
          </Row>
        )}
        {kind === 'question' && <Input top label="'예'면 찍을 부위 코드 (쉼표로)" {...bind('yes_required_parts')} />}
        <Input top label="예시 그림 주소" {...bind('example_image')} />
        <Err>{others(save.err, CONTENT_KEYS.map((k) => 'content.' + k))}</Err>
        {g?.status === 'published' && <Muted>게시된 문구를 저장하면 새 버전(초안)으로 만들어져요. 지금 게시본은 그대로 있어요.</Muted>}
        <Btn submit disabled={save.busy}>{g ? '내용 저장' : '초안으로 등록'}</Btn>
      </Form>
      {g && g.status !== 'published' && (
        <Form onSubmit={step.submit}>
          {g.status === 'review' && <Input top label="검수자 (비우면 내 이름)" value={reviewer} onChange={(e) => setReviewer(e.target.value)} />}
          <Err>{others(step.err, [])}</Err>
          <Btn v="s" submit disabled={step.busy}>{g.status === 'draft' ? '검수 요청' : '게시'}</Btn>
        </Form>
      )}
      <Btn v="t" to="/a-s05">닫기</Btn>
    </Card>
  );
}

/* ---------- A-S06 공공데이터 수집 현황 (ADM-09) ---------- */
const JOB: Record<EtlJobName, string> = { outbreak: '가축 질병 발생 정보', farm_scale: '사육규모별 농장 통계', disinfection_facility: '거점소독시설' };
const SCHEDULE: Record<EtlJob['schedule'], string> = { daily: '매일', monthly: '매월' };
const RUN: Record<EtlRun['status'], string> = { requested: '수집 요청됨', running: '수집 중', success: '정상', failed: '실패 · 직전 데이터 유지' };

function RunNow({ job, busy, onDone }: { job: EtlJobName; busy: boolean; onDone: () => void }) {
  const f = useAuthForm(async () => {
    await api(`/api/admin/etl/jobs/${job}/run`, { method: 'POST' });
    onDone();
  }, errText);
  // 표 줄을 누르면 실행 기록으로 가므로 버튼 누름은 줄까지 올리지 않는다
  return <span onClick={(e) => e.stopPropagation()}><Btn v="t" onClick={() => f.submit()} disabled={busy || f.busy}>{busy ? '수집 대기 중' : '지금 수집'}</Btn><Err>{f.err._}</Err></span>;
}

function AS06() {
  const sel = (useSearchParams()[0].get('job') ?? 'outbreak') as EtlJobName;
  const jobs = useApi<EtlJob[]>('/api/admin/etl/jobs');
  const runs = usePage<EtlRun>(`/api/admin/etl/jobs/${sel}/runs`);
  const list = jobs.data ?? [];
  return (
    <Page>
      <H>공공데이터 수집 현황</H>
      <Status q={jobs} />
      {list.length > 0 && (
        <Tbl
          head={['데이터', '주기', '마지막 성공', '건수', '최근 실행', '']}
          rows={list.map((j) => [
            JOB[j.job] ?? j.job,
            SCHEDULE[j.schedule] ?? j.schedule,
            at(j.last_success?.finished_at ?? null),
            j.last_success?.rows?.toLocaleString() ?? '-',
            j.last_run ? <b className={j.last_run.status === 'failed' ? 'red' : ''}>{RUN[j.last_run.status]}</b> : '-',
            <RunNow job={j.job} busy={j.busy} onDone={() => (jobs.reload(), runs.reload())} />,
          ])}
          rowTo={(i) => '/a-s06?job=' + list[i].job}
        />
      )}
      <Muted>[지금 수집]은 요청만 남겨요. 수집 서버가 5분 안에 가져가 실행해요. 줄을 누르면 그 작업의 실행 기록을 보여요.</Muted>
      <Card>
        <b>실행 기록 · {JOB[sel] ?? sel}</b>
        <Status q={runs} empty={runs.items.length === 0 && '실행 기록이 없어요.'} />
        {runs.items.map((x) => (
          <span key={x.etl_job_run_id}>
            {at(x.started_at)} {RUN[x.status]}{x.rows != null && ` — ${x.rows.toLocaleString()}건`}{x.error && ` — ${x.error}`}
          </span>
        ))}
        {runs.more && <Btn v="t" onClick={runs.more}>더 보기</Btn>}
      </Card>
    </Page>
  );
}

/* ---------- A-S07 모델·AI 로그 (ADM-11. ADM-10 모델 관리는 서버 API 없음) ---------- */
const FEATURES: [string, string][] = [['', '전체 기능'], ['stt', '음성 인식'], ['route', '라우터 LLM'], ['part_check', '부위 일치'], ['behavior', '행동 인식'], ['guide', '안내 문구'], ['summary', '요약']];
const FEATURE_NAME = Object.fromEntries(FEATURES) as Record<string, string>;

function AS07() {
  const m = useApi<AiMetrics>('/api/admin/ai-metrics');
  const [f, setF] = useState(0);
  const logs = usePage<InferenceLog>('/api/admin/inference-logs' + qs({ feature: FEATURES[f][0] }));
  const t = m.data?.total;
  return (
    <Page>
      <H>모델·AI 로그</H>
      <Status q={m} />
      {m.data && t && (
        <>
          <Kpis items={[['호출 (24시간)', t.calls.toLocaleString()], ['평균 지연', sec(t.avg_latency_ms)], ['오류율', pct(t.error_rate)], ['평소와 다름 "문제 없음"', `${pct(m.data.diff_ok_rate)} (${m.data.diff_feedback_count}건)`]]} />
          <Tbl
            head={['기능', '호출', '실패', '오류율', '평균 지연', '근거 없음', '입력 오류']}
            rows={m.data.features.map((x) => [FEATURE_NAME[x.feature ?? ''] ?? x.feature, x.calls, x.failures, pct(x.error_rate), sec(x.avg_latency_ms), x.no_evidence, x.bad_input])}
          />
          <Muted>{at(m.data.since)}부터 24시간 · 실패 = AI 서버 응답 503·504</Muted>
        </>
      )}
      <b>호출 로그</b>
      <Chips items={FEATURES.map(([, n]) => n)} on={f} onPick={setF} />
      <Status q={logs} empty={logs.items.length === 0 && '이 기능의 호출 기록이 없어요.'} />
      {logs.items.length > 0 && (
        <Tbl
          head={['시각', '기능', '모델 버전', '입력', '결과', '지연', '오류']}
          rows={logs.items.map((l) => [at(l.at), FEATURE_NAME[l.feature] ?? l.feature, l.model_version ?? '-', l.input_kind ?? '-', l.result_summary ?? '-', sec(l.latency_ms), l.error ? `${l.error}${l.http_status ? ` (${l.http_status})` : ''}` : '-'])}
        />
      )}
      {logs.more && <Btn v="t" onClick={logs.more}>더 보기</Btn>}
      <b>모델 관리</b>
      <Sample what="모델 목록·승격·되돌리기(ADM-10)" />
      <Tbl
        head={['모델', '운영 버전', '지표', '통과 기준', '후보', '']}
        rows={[
          ['부위 일치 (SigLIP 2)', 'v1 · 26.11.10', 'Acc 0.938 · F1 0.930', 'Acc ≥ 0.85', 'v2 Acc 0.951', <><u>승격</u> · <u>되돌리기</u></>],
          ['행동 인식 (YOLO11s)', 'v1 · 26.11.08', 'Macro F1 0.857', '클래스별 P·R ≥ 0.8', '-', '-'],
        ]}
      />
      <Card><span>부위 일치 대체 경로 (OpenAI Vision) · 현재 <b>꺼짐</b> <u>켜기</u></span></Card>
    </Page>
  );
}

/* ---------- A-S08 감사 로그 (ADM-12) ---------- */
const ACTIONS: [string, string][] = [['전체 행위', ''], ['열람', 'view'], ['만들기', 'create'], ['수정', 'update'], ['게시', 'publish'], ['비밀번호 초기화', 'password_reset'], ['알림 재발송', 'nudge'], ['다시 보내기', 'retry'], ['수집 요청', 'run']];
const ACTION_NAME = Object.fromEntries(ACTIONS.map(([n, k]) => [k, n]));
const TARGET: Record<string, string> = {
  user: '사용자', receiver_org: '접수 기관', biosecurity_rule: '안내 문구', delivery: '접수 기록', form6: '6개 항목', history_report: '이력 신고서', farm: '농가',
};

function AS08() {
  const [p, setP] = useState(0);
  const [a, setA] = useState(0);
  const from = useFrom(PERIODS[p][1]);
  const list = usePage<AuditLog>('/api/admin/audit-logs' + qs({ from, action: ACTIONS[a][1] }));
  const rows = list.items;
  return (
    <Page>
      <H>감사 로그</H>
      <Chips items={PERIODS.map(([n]) => n)} on={p} onPick={setP} />
      <Chips items={ACTIONS.map(([n]) => n)} on={a} onPick={setA} />
      <Status q={list} empty={rows.length === 0 && '이 조건의 기록이 없어요.'} />
      {rows.length > 0 && (
        <Tbl
          head={['시각', '사용자', '행위', '대상']}
          rows={rows.map((l) => [
            at(l.at),
            `${l.user_name ?? '-'}${l.user_role ? ` (${ROLE[l.user_role]})` : ''}`,
            ACTION_NAME[l.action] ?? l.action,
            `${TARGET[l.target_type] ?? l.target_type}${l.target_id != null ? ' #' + l.target_id : ''}`,
          ])}
        />
      )}
      {list.more && <Btn v="t" onClick={list.more}>더 보기</Btn>}
    </Page>
  );
}

const NotFound = () => (
  <Page>
    <H>찾는 화면이 없어요</H>
    <Muted>주소를 다시 확인해 주세요.</Muted>
    <Btn to="/a-s01">대시보드로</Btn>
  </Page>
);

// 화면 ID는 화면설계서 기준. 경로는 ID 소문자(/a-s01). 상세·편집 대상은 ?id=
const screens: Screen[] = [
  ['R-S01', '로그인 (접수자 웹과 같은 화면)', () => <WebLogin role="admin" home="/a-s01" sub="어드민" />],
  ['R-S06', '비밀번호 바꾸기 (첫 로그인)', () => <WebPassword home="/a-s01" />],
  ['A-S01', '운영 대시보드', AS01],
  ['A-S02', '사용자 관리 (목록)', AS02],
  ['A-P01', '[팝업] 계정 만들기 · 임시 비밀번호', AP01],
  ['A-S03', '사용자 상세 (접수자·운영자)', () => <AS03 demo="2" />],
  ['A-S03F', '사용자 상세 (농가)', () => <AS03 demo="1" />],
  ['A-S09', '접수 기관 관리', AS09],
  ['A-S04', '신고·전달 현황', AS04],
  ['A-S05', '공식 안내 문구 · 지식베이스', AS05],
  ['A-S06', '공공데이터 수집 현황', AS06],
  ['A-S07', '모델·AI 로그 (MLOps)', AS07],
  ['A-S08', '감사 로그', AS08],
  ['404', '없는 화면', NotFound],
];

mount(screens, 'A-S01', '404', { login: 'R-S01', home: 'A-S01', password: 'R-S06', open: ['404'] });
