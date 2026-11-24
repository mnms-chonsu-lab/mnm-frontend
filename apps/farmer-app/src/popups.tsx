import { useState, type ReactNode } from 'react';
import { api, ApiError, type Cow, type CowLookup, type HistoryReport, type MyFarm } from '@mnm/api-client';
import { Btn, Card, Chips, Err, H, Info, Input, KV, Modal, P, Phone, Row, Sheet, Status, useNavigate, useSearchParams } from '@mnm/ui';
import { CallBtn, CallNumber } from './check';
import { cowName, flow, kday, kfull, tagFmt, tel, useCows, useId, useSend } from './shared';
import { savedFarm, useQueue } from './outbox';

/** 바텀시트 팝업 공통 틀: 뒤 화면 제목만 보이고 시트가 올라온다 */
const Popup = ({ title, children }: { title: string; children: ReactNode }) => (
  <Phone title={title} report={false}>
    <Sheet>{children}</Sheet>
  </Phone>
);

export function FP01() {
  const nav = useNavigate();
  return (
    <Popup title="홈">
      <H>바로 신고</H>
      <P>가축질병 신고 전화 (24시간)</P>
      <CallNumber />
      <CallBtn />
      {/* 누르는 순간 인터넷이 없으면 기록 대신 "신고할 때 말할 내용"으로 (SOS-OFFLINE) */}
      <Btn v="s" onClick={() => nav(navigator.onLine ? '/f-s08' : '/f-e04')}>오늘 기록도 함께 보내기</Btn>
      <Btn v="t" to={-1}>닫기</Btn>
    </Popup>
  );
}

/** 송아지 귀표 입력 (출생 신고서 calf_tag, FARM-07) */
export function FP02() {
  const id = useId();
  const nav = useNavigate();
  const [tag, setTag] = useState('');
  const { submit, err, busy } = useSend(async () => {
    await api<HistoryReport>('/api/farmer/history-reports/' + id, { method: 'PATCH', body: { fields: { calf_tag: tag.replace(/\D/g, '') } } });
    nav(`/f-s04?id=${id}`, { replace: true });
  });
  return (
    <Popup title="신고서 초안">
      <H>귀표 번호 입력</H>
      <P>귀표에 적힌 12자리 숫자</P>
      <Input label="002 0000 0000 0" inputMode="numeric" value={tag} onChange={(e) => setTag(e.target.value)} err={err['fields.calf_tag'] ?? err.calf_tag} />
      <Err>{err._}</Err>
      <Btn onClick={submit} disabled={busy || tag.replace(/\D/g, '').length !== 12}>입력 완료</Btn>
      <Btn v="t" to={-1}>닫기</Btn>
    </Popup>
  );
}

export const FP03 = () => (
  <Phone title="촌수의사" back={false} report={false}>
    <Modal>
      <H>개인정보 수집·이용 동의</H>
      <Card>
        <span><b>수집 항목</b> 이름, 휴대폰 번호, 농장식별번호, 농장 주소, 소 정보, 말로 남긴 기록, 사진</span>
        <span><b>목적</b> 농장 일지, 신고 기한 알림, 신고서 초안</span>
        <span><b>보관</b> 시범 운영 종료 또는 탈퇴 시 즉시 파기</span>
      </Card>
      <Btn to={-1}>확인</Btn>
    </Modal>
  </Phone>
);

const digits = (s: string) => s.replace(/\D/g, '');

/** 소 추가: 귀표 12자리 → 이력제 조회(FARM-22) → 등록(FARM-23). 못 찾거나 조회가 안 되면 직접 입력(F-P04N) */
export function FP04() {
  const nav = useNavigate();
  const [tag, setTag] = useState('');
  const [barn, setBarn] = useState('');
  const [found, setFound] = useState<CowLookup>();
  const [other, setOther] = useState(false); // 다른 농장 소 → 확인 후 다시
  const manual = () => nav(`/f-p04n?tag=${digits(tag)}`, { replace: true });
  const look = useSend(async () => {
    setFound(undefined);
    setOther(false);
    try {
      setFound(await api<CowLookup>('/api/farmer/cows/lookup?tag_no=' + digits(tag)));
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
      if (e.code === 'CATTLE-NOTFOUND' || e.code === 'TRACE-API-FAIL') manual();
      else if (e.code === 'CATTLE-OTHER-FARM') setOther(true);
      else throw e;
    }
  });
  const reg = useSend(async () => {
    await api<Cow>('/api/farmer/farms/me/cows', { method: 'POST', body: { tag_no: digits(tag), barn: barn || undefined, confirm_other_farm: other } });
    nav(-1);
  });
  const err = { ...look.err, ...reg.err };
  return (
    <Popup title="내 소">
      <H>소 추가</H>
      <Row>
        <Input label="002 1234 5678 9 (귀표 12자리)" inputMode="numeric" value={tag} onChange={(e) => (setTag(e.target.value), setFound(undefined), setOther(false))} err={err.tag_no} />
        <Btn v="s" onClick={look.submit} disabled={look.busy || digits(tag).length !== 12}>찾기</Btn>
      </Row>
      {found && (found.already_registered ? <Info tone="w">이미 내 목록에 있는 소예요.</Info> : (
        <Info tone="ok"><b>찾았어요</b> {[found.breed, found.sex, found.birth_date && kfull(found.birth_date) + ' 출생'].filter(Boolean).join(' · ')}{found.vaccine_last_date && <><br />구제역 백신 최종 접종 {kday(found.vaccine_last_date)}</>}</Info>
      ))}
      {other && <Info tone="w">다른 농장에 등록된 소예요. 우리 농장으로 옮겨 온 소가 맞으면 등록해 주세요.</Info>}
      {(found && !found.already_registered) || other ? (
        <>
          <Input label="축사 (선택) 예: 2번 축사" value={barn} onChange={(e) => setBarn(e.target.value)} err={err.barn} />
          <Btn onClick={reg.submit} disabled={reg.busy}>등록하기</Btn>
        </>
      ) : null}
      <Err>{err._}</Err>
      <Btn v="t" onClick={manual}>번호를 못 찾았을 때 직접 입력</Btn>
    </Popup>
  );
}

export function FP04N() {
  const nav = useNavigate();
  const [tag, setTag] = useState(useSearchParams()[0].get('tag') ?? '');
  const [sex, setSex] = useState<'암' | '수'>();
  const [birth, setBirth] = useState('');
  const [barn, setBarn] = useState('');
  const { submit, err, busy } = useSend(async () => {
    await api<Cow>('/api/farmer/farms/me/cows', { method: 'POST', body: { tag_no: digits(tag), sex, birth_date: birth, barn: barn || undefined } });
    nav('/f-s18', { replace: true });
  });
  return (
    <Popup title="내 소">
      <H>소 추가</H>
      <Input label="002 1234 5678 0 (귀표 12자리)" inputMode="numeric" value={tag} onChange={(e) => setTag(e.target.value)} err={err.tag_no} />
      <Info tone="w">이 번호로 등록된 소를 찾지 못했어요. 번호를 다시 확인하거나 직접 넣어 주세요.</Info>
      <Chips items={['암', '수']} on={sex ? ['암', '수'].indexOf(sex) : -1} onPick={(i) => setSex(i ? '수' : '암')} />
      <Err>{err.sex}</Err>
      <Input label="출생 (년-월) 예: 2024-01" type="month" value={birth} onChange={(e) => setBirth(e.target.value)} err={err.birth_date} />
      <Input label="축사 (선택)" value={barn} onChange={(e) => setBarn(e.target.value)} err={err.barn} />
      <Err>{err._}</Err>
      <Btn onClick={submit} disabled={busy || !sex || !birth || digits(tag).length !== 12}>직접 입력으로 등록</Btn>
    </Popup>
  );
}

const REASONS = ['팔림', '폐사', '기타'] as const;

/** 소 정보 · 축사 수정 · 목록에서 빼기 (FARM-24) */
export function FP05() {
  const id = useId();
  const nav = useNavigate();
  const q = useCows();
  const all = q.data?.items ?? [];
  const c = all.find((x) => String(x.cow_id) === id);
  const [barn, setBarn] = useState<string>();
  const [out, setOut] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]>();
  const [report, setReport] = useState(true);
  const save = useSend(async () => {
    await api(`/api/farmer/cows/${id}`, { method: 'PATCH', body: { barn: barn ?? c?.barn ?? '' } });
    nav(-1);
  });
  const remove = useSend(async () => {
    const withReport = report && reason !== '기타';
    const r = await api<{ history_report_id: number | null }>(`/api/farmer/cows/${id}`, { method: 'PATCH', body: { remove_reason: reason, create_report: withReport } });
    nav(r.history_report_id ? `${reason === '폐사' ? '/f-s04d' : '/f-s04m'}?id=${r.history_report_id}` : '/f-s18', { replace: true });
  });
  const err = { ...save.err, ...remove.err };
  return (
    <Popup title="내 소">
      <Status q={q} />
      {q.data && !c && <Info tone="w">이 소를 목록에서 찾지 못했어요.</Info>}
      {c && (
        <>
          <H>{cowName(c, all)}</H>
          <KV rows={[
            ['귀표', tagFmt(c.tag_full)],
            ['품종·성별', [c.breed, c.sex].filter(Boolean).join(' · ') || '-'],
            ['출생', kfull(c.birth_date)],
            ['구제역 백신 최종', c.vaccine_last_date ? `${kday(c.vaccine_last_date)}${c.vaccine_last_order ? ` (${c.vaccine_last_order}차)` : ''}` : '-'],
            ['불러온 곳', c.source === 'trace' ? `축산물이력제${c.trace_checked_at ? ' · ' + kday(c.trace_checked_at.slice(0, 10)) : ''}` : '직접 입력'],
          ]} />
          <Input top label="축사" value={barn ?? c.barn ?? ''} maxLength={50} onChange={(e) => setBarn(e.target.value)} err={err.barn} />
          {out ? (
            <Card>
              <b>왜 목록에서 빼나요?</b>
              <Chips items={[...REASONS]} on={reason ? REASONS.indexOf(reason) : -1} onPick={(i) => setReason(REASONS[i])} />
              {reason && reason !== '기타' && <label><input type="checkbox" checked={report} onChange={(e) => setReport(e.target.checked)} /> {reason === '폐사' ? '폐사' : '양도'} 신고서 초안도 만들기</label>}
              <P>지난 기록은 그대로 남아요.</P>
              <Row>
                <Btn v="t" onClick={() => setOut(false)}>취소</Btn>
                <Btn v="d" onClick={remove.submit} disabled={!reason || remove.busy}>목록에서 빼기</Btn>
              </Row>
            </Card>
          ) : (
            <Row>
              <Btn v="t" onClick={() => setOut(true)}>목록에서 빼기</Btn>
              <Btn onClick={save.submit} disabled={save.busy || barn === undefined}>저장</Btn>
            </Row>
          )}
          <Err>{err._}</Err>
        </>
      )}
    </Popup>
  );
}

export function FP06() {
  const nav = useNavigate();
  const [phone, setPhone] = useState('');
  const { submit, err, busy } = useSend(async () => {
    await api<MyFarm>('/api/farmer/me/farm', { method: 'PATCH', body: { phone } });
    nav(-1);
  });
  return (
    <Popup title="내 정보">
      <H>연락처 바꾸기</H>
      <Input label="새 휴대폰 번호 010-0000-0000" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} err={err.phone} />
      <Info tone="w">바꾼 번호로 다음에 로그인해요. 접수자에게 보이는 번호도 함께 바뀌어요.</Info>
      <Err>{err._}</Err>
      <Btn onClick={submit} disabled={busy || digits(phone).length < 10}>바꾸기</Btn>
    </Popup>
  );
}

// shortcut: 점검 화면은 MVP 제외(점검 API 없음), 예시 문구 그대로
export const FE01 = () => (
  <Phone title="촌수의사" back={false} report={false}>
    <H center>지금은<br /><em>점검 중</em>이에요</H>
    <P center>오후 3시에 다시 열려요 (11월 25일)</P>
    <Info tone="g">쓰던 기록은 휴대폰에 그대로 있어요. 점검이 끝나면 이어서 보낼 수 있어요.</Info>
    <Btn v="d" to="/f-p01">바로 신고 1588-9060</Btn>
    <Btn v="t" to="/f-s01">다시 확인하기</Btn>
  </Phone>
);

export const FE02 = () => (
  <Popup title="보내기 전 확인">
    <H>아직 보내지 못했어요</H>
    <P>입력하신 내용은 그대로 있어요.</P>
    <Btn to={-1}>다시 시도</Btn>
    <Btn v="d" to="/f-e04">전화로 신고하기</Btn>
    <Btn v="t" to={-1}>나중에 보내기</Btn>
  </Popup>
);

/**
 * 신고할 때 말할 내용 (시행규칙 제13조 6개 항목 순서). 서버를 부르지 않고 이 기기에 저장된 농장 정보와
 * 진행 중인 소 상태 기록(마지막으로 본 요약 또는 고르던 내용)으로 만든다. 없는 칸은 말할 것을 안내한다
 */
export function FE04() {
  const [q] = useSearchParams();
  const queue = useQueue();
  const f = savedFarm();
  const s = flow.summary;
  const c = flow.check;
  const count = s?.head_count ?? c.headCount;
  const rows: [string, string][] = [
    ['농장(소유자)', f ? [`${f.owner_name} · ${f.farm_name}`, f.address].filter(Boolean).join(' · ') : '농장 이름과 주소를 말해 주세요'],
    ['가축 종류·두수', `${s?.cow?.breed ?? '소'} ${count != null ? count + '두' : '두수 모름'}${s?.cow ? ` (${s.cow.tag_last4}번)` : ''}${f?.head_count != null ? ` / 전체 ${f.head_count}두` : ''}`],
    ['발견 당시 상태', (s ? [...s.matched, s.observed_text] : [c.observed]).filter(Boolean).join(', ') || '본 모습을 말해 주세요'],
    ['발견 날짜', s?.found_date ? kfull(s.found_date) : '처음 본 날을 말해 주세요'],
    ['신고자', f ? `${f.owner_name}${f.phone ? ' · ' + tel(f.phone) : ''}` : '이름과 연락처를 말해 주세요'],
    ['기타', [s?.barn, s?.vaccine && `최근 접종 ${s.vaccine.value ?? ''} ${kday(s.vaccine.date)}`].filter(Boolean).join(' · ') || '-'],
  ];
  // 전화 경로 완료 화면(F-S14P)에서 열면 대기 안내 없이 (명세 F-E04 상태)
  const fromCall = q.get('from') === 'call';
  const waiting = queue.some((x) => !x.failed);
  return (
    <Phone title="신고할 때 말할 내용" report={false}>
      <H>먼저 <span className="red">전화로</span><br />신고해 주세요</H>
      <CallBtn>전화 걸기 1588-9060</CallBtn>
      <P><b>통화할 때 이 순서로 말해 주세요</b></P>
      <KV rows={rows} />
      {!fromCall && (waiting ? (
        <Info tone="w">지금은 기록을 보낼 수 없어요. 먼저 전화로 신고해 주세요. 기록은 인터넷이 연결되면 바로 보내 드릴게요. 보낸 결과는 홈에서 알려 드려요.</Info>
      ) : (
        <Info tone="w">기록을 아직 보내지 못했다면, 인터넷이 연결된 뒤 다시 보내 주세요.</Info>
      ))}
      <Btn v="t" to="/f-s01">처음으로</Btn>
    </Phone>
  );
}

export const FE03 = () => (
  <Phone title="촌수의사" back={false} report={false}>
    <H center>찾는 기록이<br /><em>없어요</em></H>
    <P center>삭제됐거나 링크가 만료됐어요.</P>
    <Btn to="/f-s01">홈으로</Btn>
    <Btn v="d" to="/f-p01">바로 신고 1588-9060</Btn>
  </Phone>
);

