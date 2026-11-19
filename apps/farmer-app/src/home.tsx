import { useState } from 'react';
import { farmerLogin, logout } from '@mnm/api-client';
import { Btn, Card, Err, Form, H, Info, Input, KV, Link, Opt, P, Phone, Pill, PrefsCard, Row, Tile, useAuthForm, useGoNext, useNavigate } from '@mnm/ui';

const COWS: [string, string][] = [
  ['1234번', '한우 암 · 4세 · 2번 축사'],
  ['0871번', '한우 암 · 6세 · 1번 축사'],
  ['5520번', '한우 수 · 2세 · 3번 축사'],
];
/** 등록된 소 목록 (F-S08, F-S18 공용) */
export const CowList = ({ to }: { to: string }) => (
  <>
    {COWS.map(([no, desc]) => <Opt key={no} to={to}>{no}<small>{desc}</small></Opt>)}
  </>
);

const CONSENTS = ['개인정보 수집·이용 동의 (필수)', '기록 전달 동의 (필수)', '처리 위탁 동의 (필수)'];

export function FS00() {
  const goNext = useGoNext('/f-s01');
  const [farmNo, setFarmNo] = useState('');
  const [phone, setPhone] = useState('');
  const [agree, setAgree] = useState(CONSENTS.map(() => false));
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
        <Btn submit disabled={!all || busy}>시작하기</Btn>
      </Form>
    </Phone>
  );
}

export const FS01 = () => (
  <Phone title="촌수의사" back={false} tab="홈" report={false} say="김한우 님, 오늘 할 일이 1개 있어요. 말로 기록하기, 소 상태 확인하기, 바로 신고 버튼이 있어요.">
    <H>김한우 님,<br />오늘 <em>할 일 1개</em>가 있어요</H>
    <Card to="/f-s04">
      <Pill tone="w">기한 알림 · D-3</Pill>
      <b>송아지 출생 신고</b>
      <span>11월 5일까지 · 초안 준비됨</span>
    </Card>
    <Tile title="말로 기록하기" sub="오늘 한 일을 말씀만 하세요" to="/f-s02" />
    <Tile title="소 상태 확인하기" sub="평소와 다를 때 눌러 주세요" v="s" to="/f-s08" />
    <Tile title="바로 신고" sub="가축질병 신고 1588-9060" v="d" to="/f-p01" />
    <Info>우리 지역(홍성군) 최근 30일 구제역·럼피스킨 발생 <b>0건</b> · 11월 2일 기준</Info>
  </Phone>
);

export const FS16 = () => (
  <Phone title="알림" back={false} tab="알림">
    <Card>
      <span><Pill>평소와 다름</Pill></span>
      <b>1234번, 평소와 다른 모습이 보여요</b>
      <span>10월 30일과 11월 2일에 사료 남김을 기록했어요. 한 번 살펴봐 주세요.</span>
      <Row>
        <Btn v="s" to="/f-s08">확인함</Btn>
        <Btn v="t">문제 없음</Btn>
      </Row>
    </Card>
    <Card>
      <span><Pill tone="w">기한 알림</Pill></span>
      <b>송아지 출생 신고 · 3일 남음</b>
      <Btn to="/f-s04">신고서 초안 보기</Btn>
    </Card>
    <Card>
      <span><Pill tone="g">처리 결과</Pill></span>
      <b>홍성축협이 기록을 확인했어요</b>
      <span>결과: 수의사 진료 안내</span>
    </Card>
    <P center>「평소와 다름」은 참고 알림이에요. 병을 판정하지 않고, 정기 검사를 대신하지 않아요.</P>
  </Phone>
);

function LogoutBtn() {
  const nav = useNavigate();
  return <Btn v="t" onClick={() => (logout(), nav('/f-s00'))}>로그아웃</Btn>;
}

export const FS17 = () => (
  <Phone title="내 정보" back={false} tab="내 정보" say="내 정보와 화면 설정이에요. 글자 크기와 선명한 화면을 바꿀 수 있어요.">
    <KV rows={[
      ['농장', '김한우 농장'],
      ['주소', '충남 홍성군 ○○읍'],
      ['내 소', '3마리 등록 ›', false, '/f-s18'],
      ['담당 축협', '홍성축협'],
      ['연락처', '010-****-0937 ›', false, '/f-p06'],
    ]} />
    <PrefsCard />
    <Card>
      <b>개인정보</b>
      <span>기록은 내가 [보낼게요]를 누른 곳에만 전달돼요.</span>
      <Btn v="s" to="/f-s17s">보낸 기록 1건 ›</Btn>
      <LogoutBtn />
    </Card>
  </Phone>
);

export const FS17S = () => (
  <Phone title="보낸 기록" tab="내 정보">
    <H>보낸 기록<br /><em>1건</em></H>
    <Card to="/f-s15d">
      <span><b>11월 2일 09:42</b> · 소 상태 기록 (1234번)</span>
      <span>받은 곳: 홍성축협 방역팀</span>
      <span>상태: <Pill tone="g">확인함</Pill> · 결과: 수의사 진료 안내</span>
    </Card>
    <P>보낸 기록은 받은 곳에서 처리를 위해 보관해요. 내 기록을 지워도 받은 곳의 사본은 남아요.</P>
  </Phone>
);

export const FS18 = () => (
  <Phone title="내 소" tab="내 정보">
    <H>등록된 소<br /><em>3마리</em></H>
    <CowList to="/f-p05" />
    <Btn to="/f-p04">+ 소 추가</Btn>
    <Info tone="g">귀표 번호 12자리만 넣으면 품종·성별·출생일·백신 기록을 <b>축산물이력제</b>에서 불러와요</Info>
  </Phone>
);
