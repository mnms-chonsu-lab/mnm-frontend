import { useEffect, useState } from 'react';
import { api, farmerLogin, logout, type Alert, type Home, type MyFarm, type Sent, type TaskKind } from '@mnm/api-client';
import { Btn, Card, Err, Form, H, Info, Input, KV, Link, Muted, P, Phone, Pill, PrefsCard, Row, Status, Tile, setUnread, useApi, useAuthForm, useGoNext, useNavigate, usePage } from '@mnm/ui';
import { CowList, RECEIVER, RESULT, kat, kday, tel, useCows, useSend, useServerPrefs } from './shared';

export { CowList } from './shared';

const CONSENTS = ['개인정보 수집·이용 동의 (필수)', '기록 전달 동의 (필수)', '처리 위탁 동의 (필수)'];

export function FS00() {
  const goNext = useGoNext('/f-s01');
  const [farmNo, setFarmNo] = useState('');
  const [phone, setPhone] = useState('');
  const [agree, setAgree] = useState(CONSENTS.map(() => true)); // 3개 모두 필수라 기본 전체 체크
  const all = agree.every(Boolean);
  const { submit, err, busy } = useAuthForm(async () => {
    await farmerLogin(farmNo, phone);
    goNext();
  });
  return (
    <Phone title="촌수의사" back={false} say="농장식별번호와 휴대폰 번호를 넣어 주세요.">
      <Form onSubmit={submit}>
        <H>농장식별번호로<br /><em>시작해요</em></H>
        <Input label="농장식별번호 6자리" inputMode="numeric" maxLength={6} autoComplete="username" value={farmNo} onChange={(e) => setFarmNo(e.target.value)} err={err.farm_no} />
        <Input label="휴대폰 번호 010-0000-0000" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} err={err.phone} />
        <Err>{err._}</Err>
        <Card>
          <label><input type="checkbox" checked={all} onChange={() => setAgree(CONSENTS.map(() => !all))} /> <b>전체 동의 (필수)</b></label>
          {CONSENTS.map((x, i) => (
            <Row key={x}>
              <label><input type="checkbox" checked={agree[i]} onChange={() => setAgree(agree.map((v, j) => (j === i ? !v : v)))} /> {x}</label>
              <Link className="more" to="/f-p03">보기</Link>
            </Row>
          ))}
        </Card>
        {!all && <Err>필수 동의가 필요해요</Err>}
        <Btn submit disabled={!all || busy}>시작하기</Btn>
      </Form>
    </Phone>
  );
}

/** 할 일 → 화면. 신고서 할 일은 ref_id(이력 신고서 번호)로 */
const TASK_TO: Record<TaskKind, (ref: number | null) => string> = {
  birth_report: (r) => `/f-s04?id=${r}`,
  death_report: (r) => `/f-s04d?id=${r}`,
  move_report: (r) => `/f-s04m?id=${r}`,
  ear_tag: () => '/f-s18',
};

export function FS01() {
  useServerPrefs();
  const h = useApi<Home>('/api/farmer/home');
  const d = h.data;
  useEffect(() => {
    if (d) setUnread(d.unread_alert_count);
  }, [d]);
  const r = d?.region;
  return (
    <Phone title="촌수의사" back={false} tab="홈" report={false} say={d ? `${d.farmer_name} 님, 오늘 할 일이 ${d.task_count}개 있어요. 말로 기록하기, 소 상태 확인하기, 바로 신고 버튼이 있어요.` : undefined}>
      <Status q={h} />
      {d && <H>{d.farmer_name} 님,<br />{d.task_count ? <>오늘 <em>할 일 {d.task_count}개</em>가 있어요</> : <>오늘도 <em>좋은 하루</em> 되세요</>}</H>}
      {d?.tasks.map((t) => (
        <Card key={t.tasks_id} to={TASK_TO[t.kind]?.(t.ref_id)}>
          <Pill tone="w">기한 알림{t.d_day != null && ` · D-${t.d_day}`}</Pill>
          <b>{t.title}</b>
          {t.due_date && <span>{kday(t.due_date)}까지</span>}
        </Card>
      ))}
      <Tile title="말로 기록하기" sub="오늘 한 일을 말씀만 하세요" to="/f-s02" />
      <Tile title="소 상태 확인하기" sub="평소와 다를 때 눌러 주세요" v="s" to="/f-s08" />
      <Tile title="바로 신고" sub="가축질병 신고 1588-9060" v="d" to="/f-p01" />
      {r && <Info>우리 지역{r.region_name && `(${r.region_name})`} 최근 30일 구제역·럼피스킨 발생 <b>{r.fmd_count + r.lsd_count}건</b>{r.base_at && ` · ${kat(r.base_at)} 기준`}</Info>}
    </Phone>
  );
}

const ALERT_TAG: Record<Alert['kind'], [string, 'w' | 'g' | undefined]> = { diff: ['평소와 다름', undefined], deadline: ['기한 알림', 'w'], result: ['처리 결과', 'g'] };

function AlertCard({ a }: { a: Alert }) {
  const [fb, setFb] = useState(a.feedback);
  const send = (feedback: 'seen' | 'ok') => async () => setFb((await api<Alert>(`/api/farmer/alerts/${a.alerts_id}/feedback`, { method: 'POST', body: { feedback } })).feedback);
  const seen = useSend(send('seen'));
  const ok = useSend(send('ok'));
  const busy = seen.busy || ok.busy;
  const [tag, tone] = ALERT_TAG[a.kind];
  return (
    <Card>
      <span><Pill tone={tone}>{tag}</Pill> <Muted>{kat(a.created_at)}</Muted></span>
      <b>{a.title}</b>
      {a.body && <span>{a.body}</span>}
      {a.kind === 'diff' && (fb ? <Muted>{fb === 'seen' ? '확인함' : '문제 없음'}으로 답했어요</Muted> : (
        <Row>
          <Btn v="s" onClick={seen.submit} disabled={busy}>확인함</Btn>
          <Btn v="t" onClick={ok.submit} disabled={busy}>문제 없음</Btn>
        </Row>
      ))}
      {a.kind === 'deadline' && a.ref_id != null && <Btn to={`/f-s04?id=${a.ref_id}`}>신고서 초안 보기</Btn>}
      {a.kind === 'result' && <Btn v="s" to="/f-s17s">보낸 기록 보기</Btn>}
      <Err>{seen.err._ ?? ok.err._}</Err>
    </Card>
  );
}

export function FS16() {
  const list = usePage<Alert>('/api/farmer/alerts');
  // 목록을 열면 서버가 읽음으로 바꾼다
  useEffect(() => {
    if (!list.loading && !list.err) setUnread(0);
  }, [list.loading, list.err]);
  return (
    <Phone title="알림" back={false} tab="알림">
      <Status q={list} empty={list.items.length === 0 && '아직 받은 알림이 없어요.'} />
      {list.items.map((a) => <AlertCard key={a.alerts_id} a={a} />)}
      {list.more && <Btn v="t" onClick={list.more}>더 보기</Btn>}
      <P center>「평소와 다름」은 참고 알림이에요. 병을 판정하지 않고, 정기 검사를 대신하지 않아요.</P>
    </Phone>
  );
}

function LogoutBtn() {
  const nav = useNavigate();
  return <Btn v="t" onClick={() => (logout(), nav('/f-s00'))}>로그아웃</Btn>;
}

export const useFarm = () => useApi<MyFarm>('/api/farmer/me/farm');

export function FS17() {
  useServerPrefs();
  const f = useFarm();
  const d = f.data;
  return (
    <Phone title="내 정보" back={false} tab="내 정보" say="내 정보와 화면 설정이에요. 글자 크기와 선명한 화면을 바꿀 수 있어요.">
      <Status q={f} />
      {d && (
        <KV rows={[
          ['농장', `${d.farm_name} (${d.farm_no})`],
          ['주소', d.address ?? '-'],
          ['내 소', `${d.cow_count}마리 등록 ›`, false, '/f-s18'],
          ['담당 축협', d.org_name ?? '-'],
          ['연락처', `${d.phone ? tel(d.phone) : '-'} ›`, false, '/f-p06'],
        ]} />
      )}
      <PrefsCard />
      <Card>
        <b>개인정보</b>
        <span>기록은 내가 [보낼게요]를 누른 곳에만 전달돼요.</span>
        <Btn v="s" to="/f-s17s">보낸 기록{d && ` ${d.sent_count}건`} ›</Btn>
        <LogoutBtn />
      </Card>
    </Phone>
  );
}

export function FS17S() {
  const list = usePage<Sent>('/api/farmer/deliveries/mine');
  return (
    <Phone title="보낸 기록" tab="내 정보">
      <H>보낸 기록{!list.loading && <><br /><em>{list.items.length}건{list.more && ' 이상'}</em></>}</H>
      <Status q={list} empty={list.items.length === 0 && '아직 보낸 기록이 없어요.'} />
      {list.items.map((s) => (
        <Card key={s.delivery_id} to={s.symptom_report_id ? `/f-s11?id=${s.symptom_report_id}` : s.history_report_id ? `/f-s04?id=${s.history_report_id}` : undefined}>
          <span><b>{kat(s.approved_at)}</b> · {s.title}</span>
          {s.org_name && <span>받은 곳: {s.org_name}</span>}
          <span>상태: <Pill tone={s.receiver_status === 'done' ? 'g' : undefined}>{RECEIVER[s.receiver_status] ?? s.status}</Pill>{s.receiver_result && ` · 결과: ${RESULT[s.receiver_result] ?? s.receiver_result}`}</span>
        </Card>
      ))}
      {list.more && <Btn v="t" onClick={list.more}>더 보기</Btn>}
      <P>보낸 기록은 받은 곳에서 처리를 위해 보관해요. 내 기록을 지워도 받은 곳의 사본은 남아요.</P>
    </Phone>
  );
}

export function FS18() {
  const c = useCows();
  return (
    <Phone title="내 소" tab="내 정보">
      <H>등록된 소{c.data && <><br /><em>{c.data.items.length}마리</em></>}</H>
      <CowList to={(x) => `/f-p05?id=${x.cow_id}`} />
      <Btn to="/f-p04">+ 소 추가</Btn>
      <Info tone="g">귀표 번호 12자리만 넣으면 품종·성별·출생일·백신 기록을 <b>축산물이력제</b>에서 불러와요</Info>
    </Phone>
  );
}

