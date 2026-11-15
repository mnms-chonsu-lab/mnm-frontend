import type { ReactNode } from 'react';
import { Btn, Card, Done, H, Info, KV, Mic, Muted, Opt, P, Phone, Pic, Pill, RouteCard, Row, Steps, useSearchParams } from '@mnm/ui';
import { CowList } from './home';

/** 소 상태 확인 흐름 공통 틀 */
const Check = ({ title = '소 상태 확인', children }: { title?: string; children: ReactNode }) => (
  <Phone title={title} tab="홈">{children}</Phone>
);

/** 신고 후 "지금 해 주세요" 안내 (F-S14, F-S14P, F-S14W 공용) */
const NowDo = ({ lines }: { lines: string[] }) => (
  <Card>
    <b>지금 해 주세요 · 구제역 긴급행동지침</b>
    {lines.map((x, i) => <span key={x}>{i + 1}. {x}</span>)}
  </Card>
);
const SOP = ['의심 소를 따로 두기', '소·분뇨·장비를 농장 밖으로 옮기지 않기', '사람·차량 출입 멈추기'];

export const FS08 = () => (
  <Check>
    <H>어느 소가<br /><em>평소와 다른가요?</em></H>
    <CowList to="/f-s08s" />
    <Btn v="s" to="/f-s08s">🎙 귀표 끝 4자리 말하기</Btn>
    <Btn v="t" to="/f-s08s">귀표 번호를 모르겠어요</Btn>
    <Btn v="t" to="/f-p04">+ 목록에 없는 소 추가</Btn>
  </Check>
);

export const FS08S = () => (
  <Check>
    <H center>1234번 소가<br /><em>어떤 모습</em>인가요?</H>
    <Mic />
    <P center><Pill>● 듣고 있어요</Pill></P>
    <Card>“사료를 안 먹고 침을 흘려. 오늘 아침부터 그래.”</Card>
    <Row>
      <Btn v="t" to="/f-s09q">건너뛰기</Btn>
      <Btn to="/f-s09q">다 말했어요</Btn>
    </Row>
  </Check>
);

export const FS09Q = () => (
  <Check>
    <Steps n={3} on={0} />
    <P><b>신고서에 들어가요 · 1 / 3</b></P>
    <H>이런 모습인 소가<br /><em>몇 마리</em>인가요?</H>
    {['1마리', '2마리 이상', '잘 모르겠어요'].map((x) => <Opt key={x} to="/f-s09">{x}</Opt>)}
    <Btn v="s">🎙 말로 답하기</Btn>
  </Check>
);

export const FS09 = () => (
  <Check>
    <Steps n={4} on={0} />
    <P><b>질문 1 / 4 · 공식 임상증상 기준</b></P>
    <H>1234번 소가<br /><em>침을 흘리나요?</em></H>
    <Pic>예시 · 입가에 거품 섞인 침</Pic>
    {['예, 그래요', '아니요', '잘 모르겠어요'].map((x) => <Opt key={x} to="/f-s10">{x}</Opt>)}
  </Check>
);

export const FS10 = () => (
  <Check title="사진 찍기">
    <Steps n={2} on={0} />
    <H>입 사진을<br /><em>찍어 주세요</em> (1/2)</H>
    <Pic oval>입술을 젖혀 잇몸과 혀가 보이게</Pic>
    <Info tone="w"><b>사진이 어두워요.</b> 밝은 곳에서 한 번 더 찍어 주세요.</Info>
    <Btn to="/f-s10v">사진 찍기 · 고르기</Btn>
    <Btn v="t" to="/f-s10v">건너뛰기</Btn>
  </Check>
);

export const FS10V = () => (
  <Check title="영상 찍기">
    <H>소 모습을<br /><em>10초만</em> 찍어 주세요</H>
    <Pic>소 몸 전체가 화면에 들어오게</Pic>
    <Info tone="ok"><b>영상을 저장했어요.</b> 영상에서 본 모습: 눕기 70% · 서기 20% · 먹기 10% <Muted>(참고)</Muted></Info>
    <Btn to="/f-s11">영상 찍기 · 고르기</Btn>
    <Btn v="t" to="/f-s11">건너뛰기</Btn>
  </Check>
);

const Official = () => <span className="red">(공식 증상)</span>;

export const FS11 = () => (
  <Check title="오늘 기록 요약">
    <H center>오늘 기록을<br /><em>한 장으로</em> 모았어요</H>
    <Card>
      <span><b>1234번 · 암소 4세</b> <Pill tone="d">공식 증상 2개</Pill></span>
      <span>· 침을 흘림 <Official /></span>
      <span>· 사료를 안 먹거나 남김 <Official /></span>
      <span>· 3일 전부터 사료 남김 (일지)</span>
      <span>· 최근 접종: 구제역 백신 10월 8일 (일지)</span>
      <span>· 영상에서 본 모습: 눕기 위주 <Muted>(참고)</Muted></span>
      <Row><Pic>입</Pic><Pic>몸 옆면</Pic></Row>
    </Card>
    <Info tone="g">병인지 아닌지는 <b>방역기관 검사</b>로 확인해요. 의심되면 신고해 주세요. 이 기록은 정기 검사를 대신하지 않아요.</Info>
    <Btn v="d" to="/f-s12">이 기록 들고 신고하기</Btn>
    <Btn v="s" to="/f-s19">화면으로 보여주기</Btn>
    <Btn v="t" to="/f-s01">오늘은 기록만 저장</Btn>
  </Check>
);

export const FS19 = () => (
  <Check title="보여주기">
    <Card>
      <b>김한우 농장 · 1234번</b>
      <span>한우 암 · 4세 · 2번 축사</span>
      <span><Pill tone="d">침 흘림 · 공식 증상</Pill> <Pill tone="d">사료 남김 · 공식 증상</Pill></span>
      <span>처음 본 때 11월 2일 아침 · 1마리</span>
      <span>최근 접종 구제역 백신 10월 8일</span>
      <span>최근 14일: 사료 남김 2회 (10.30, 11.02)</span>
    </Card>
    <Row><Pic>입</Pic><Pic>몸 옆면</Pic></Row>
    <Card>
      <div className="pic sm"><span>QR</span></div>
      <P center>접수자 웹에서 이 기록 열기</P>
    </Card>
  </Check>
);

export const FS12 = () => (
  <Check title="신고 방법 고르기">
    <H>어떻게 <span className="red">신고</span>할까요?</H>
    <P>어느 방법이든 <b>오늘 기록이 함께</b> 전달돼요</P>
    <RouteCard danger title="전화로 신고" sub="1588-9060 · 통화할 때 말할 내용을 보여드려요" to="/f-s13p?via=tel" />
    <RouteCard title="우리 축협·담당자" sub="홍성축협 방역팀 · 기록이 바로 전달돼요" to="/f-s13" />
    <RouteCard title="인터넷 신고서" sub="신고서 항목을 복사해 붙여넣기" to="/f-s13p?via=web" />
    <RouteCard title="시·군 가축방역관" sub="홍성군청 축산과 · 기록이 바로 전달돼요" to="/f-s13" />
  </Check>
);

const Check1 = ({ children }: { children: ReactNode }) => (
  <label><input type="checkbox" defaultChecked /> <b>{children}</b></label>
);

export const FS13 = () => (
  <Check title="보내기 전 확인">
    <H center><em>홍성축협 방역팀</em>에<br />이 기록을 보낼까요?</H>
    <KV rows={[['보내는 것', '오늘 요약 1장 · 사진 2장'], ['지난 기록', '최근 14일 일지 · 소독·접종 이력'], ['받는 곳', '홍성축협 방역팀']]} />
    <Card><Check1>내 휴대폰 번호도 함께 보내기</Check1></Card>
    <P center>보내기 전에는 아무에게도 전달되지 않아요</P>
    <Btn to="/f-s14">네, 보낼게요</Btn>
    <Btn v="t" to="/f-s11">보내지 않기</Btn>
  </Check>
);

export function FS13P() {
  const [q] = useSearchParams();
  const web = q.get('via') === 'web';
  return (
    <Check title="보내기 전 확인">
      <H center><span className="red">{web ? '인터넷 신고서로 신고' : '전화로 신고'}</span>하기 전에<br />확인해 주세요</H>
      <KV rows={[['신고', '가축질병 신고 1588-9060'], ['보내는 것', '오늘 요약 1장 · 사진 2장 · 14일 일지']]} />
      <Card>
        <Check1>홍성축협 방역팀에도 기록 보내기</Check1>
        <Muted>신고센터는 기록을 받을 수 없어서 담당 축협이 받아 둬요</Muted>
      </Card>
      <Card><Check1>내 휴대폰 번호도 함께 보내기</Check1></Card>
      <Btn to={web ? '/f-s14w' : '/f-s14p'}>다음</Btn>
    </Check>
  );
}

export const FS14 = () => (
  <Phone title="전달 완료" back={false} tab="홈">
    <Done />
    <H center>잘 전달됐어요</H>
    <P center>홍성축협 방역팀 담당자가 기록을 보고 곧 연락드릴 거예요</P>
    <NowDo lines={SOP} />
    <Card>
      <Muted>가까운 거점소독시설</Muted>
      <b>홍성 거점소독소 · 4.2km</b>
      <span>24시간 운영 · 041-000-0000</span>
    </Card>
    <Row>
      <Btn v="s">소리로 듣기</Btn>
      <Btn to="/f-s01">처음으로</Btn>
    </Row>
  </Phone>
);

/** 신고 전화번호 + 복사 (F-S14P, F-P01 공용) */
export const CallNumber = () => (
  <Row>
    <H>1588-9060</H>
    <Btn v="s">번호 복사</Btn>
  </Row>
);

export const FS14P = () => (
  <Check title="전화로 신고">
    <H center>이제 <span className="red">전화로 신고</span>해 주세요</H>
    <CallNumber />
    <Btn v="d" href="tel:15889060">전화 걸기</Btn>
    <Btn v="s" to="/f-e04">통화할 때 말할 내용 보기</Btn>
    <Info tone="ok"><b>홍성축협 방역팀</b>에도 기록을 보냈어요</Info>
    <NowDo lines={SOP.slice(0, 2)} />
    <Btn v="t" to="/f-s01">처음으로</Btn>
  </Check>
);

export const FS14W = () => (
  <Check title="인터넷 신고서">
    <H center>신고서 항목을<br /><em>복사해 붙여넣어 주세요</em></H>
    <KV rows={[
      ['소유자 성명', '김한우'],
      ['사육 장소', '충남 홍성군 ○○읍 · 2번 축사'],
      ['가축 종류·두수', '한우 1두 (1234번) / 전체 42두'],
      ['발견 당시 상태', '침 흘림, 사료 남김'],
      ['발견 날짜', '2026년 11월 2일'],
      ['신고자', '김한우 · 충남 홍성군 ○○읍'],
    ]} />
    <Row>
      <Btn>항목 전체 복사</Btn>
      <Btn v="s">사진 저장</Btn>
    </Row>
    <Info tone="w">급하면 전화가 더 빨라요 · 1588-9060</Info>
    <NowDo lines={SOP.slice(0, 1)} />
    <Btn v="t" to="/f-s01">처음으로</Btn>
  </Check>
);
