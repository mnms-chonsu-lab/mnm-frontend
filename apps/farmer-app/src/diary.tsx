import { Btn, Card, Chips, Dots, H, Info, Input, KV, Mic, Muted, P, Phone, Pill, Row, useSearchParams } from '@mnm/ui';

export const FS02 = () => (
  <Phone title="말로 기록하기" tab="홈" say="오늘 한 일을 말씀해 주세요. 말을 마치면 다 말했어요 버튼을 눌러 주세요.">
    <Dots n={3} on={0} />
    <H center>오늘 한 일을<br /><em>말씀해 주세요</em></H>
    <Mic />
    <P center><Pill>● 듣고 있어요</Pill></P>
    <Card>“아침에 2번 축사 소독했고, 1234번이 사료를 좀 남겼어.”</Card>
    <Btn v="t" to="/f-s02t">말 대신 글로 쓰기</Btn>
    <Row>
      <Btn v="t">다시 말하기</Btn>
      <Btn to="/f-s03">다 말했어요</Btn>
    </Row>
  </Phone>
);

export const FS02T = () => (
  <Phone title="글로 쓰기" tab="홈" say="오늘 한 일을 글로 써 주세요.">
    <Dots n={3} on={0} />
    <H center>오늘 한 일을<br /><em>써 주세요</em></H>
    <Input label="예: 2번 축사 소독함. 1234번 사료 남김" rows={4} />
    <Chips items={['소독', '관찰', '접종', '출생', '폐사', '이동']} />
    <Btn to="/f-s03">다 썼어요</Btn>
    <Btn v="t" to="/f-s02">다시 말로 하기</Btn>
  </Phone>
);

/** 저장 후 이동: 기록 종류(?k=)에 따라 신고서 초안 화면이 갈린다. 기본은 화면설계서 예시(출생) 흐름 */
const AFTER_SAVE: Record<string, string> = { 출생: '/f-s04q', 폐사: '/f-s04d', 이동: '/f-s04m' };

export function FS03() {
  const [q] = useSearchParams();
  const kind = q.get('k') ?? '출생';
  return (
    <Phone title="기록 확인" tab="홈" say="이렇게 적을까요? 소독 2번 축사, 관찰 1234번 사료 남김. 맞으면 저장할게요 버튼을 눌러 주세요.">
      <Dots n={3} on={1} />
      <H center>이렇게 <em>적을까요?</em></H>
      <KV rows={[
        ['날짜', '11월 2일(월) ›', false, '/f-s03e'],
        ['소독', '2번 축사 ›', false, '/f-s03e'],
        ['관찰', '1234번 사료 남김 ›', false, '/f-s03e'],
      ]} />
      <Info><b>1234번</b>은 3일 전에도 사료를 남겼어요. 내일도 지켜봐 주세요.</Info>
      <Info tone="w">송아지 출생은 <b>5일 안에 신고</b>해야 해요. 저장하면 신고서 초안을 써 둘게요.</Info>
      <Btn to={AFTER_SAVE[kind] ?? '/f-s01'}>네, 저장할게요</Btn>
      <Btn v="s" to="/f-s03e">고칠게요</Btn>
    </Phone>
  );
}

const KINDS = ['사육현황', '접종', '소독', '관찰', '출생', '폐사', '이동', '메모'];

export const FS03E = () => (
  <Phone title="기록 고치기" tab="홈" say="어떤 기록인가요? 종류를 고르고 내용을 확인해 주세요.">
    <H>어떤 <em>기록</em>인가요?</H>
    <Chips items={KINDS} on={3} />
    <Input label="소 선택: 1234번 ›" />
    <Row>
      <Input label="내용: 사료 조금 남김" />
      <Btn v="s">🎙 말로 다시</Btn>
    </Row>
    <Btn v="t">+ 항목 더하기</Btn>
    <Btn to="/f-s03">고친 내용으로 확인</Btn>
    {/* shortcut: 종류 선택이 저장 흐름에 연결되지 않음, 상태 연동 전까지 신고서 종류별 확인 화면을 버튼으로 연다 */}
    <Row>
      <Btn v="t" to="/f-s03?k=폐사">폐사 기록으로 확인</Btn>
      <Btn v="t" to="/f-s03?k=이동">이동 기록으로 확인</Btn>
    </Row>
  </Phone>
);

export const FS15 = () => (
  <Phone title="농장 일지" back={false} tab="기록">
    <H>말로 남긴 기록이<br /><em>날짜별로</em> 모였어요</H>
    <P><b>11월 2일 (월)</b></P>
    <Card to="/f-s15d">
      <span><Pill>소독</Pill> 출입구 소독</span>
      <span><Pill>신고</Pill> 1234번 기록 전달 · 홍성축협</span>
    </Card>
    <P><b>10월 30일 (금)</b></P>
    <Card to="/f-s15d">
      <span><Pill>관찰</Pill> 1234번 사료 조금 남김</span>
    </Card>
    <Btn to="/f-s02">말로 기록하기</Btn>
  </Phone>
);

export const FS15D = () => (
  <Phone title="11월 2일 기록" tab="기록">
    <KV rows={[['소독', '2번 축사'], ['관찰', '1234번 사료 남김']]} />
    <Card>
      <Muted>내가 한 말</Muted>
      <span>“아침에 2번 축사 소독했고, 1234번이 사료를 좀 남겼어.”</span>
    </Card>
    <Card>
      <b>전달 내역</b>
      <span>11월 2일 09:42 · 홍성축협 방역팀 · <Pill tone="g">확인함</Pill></span>
    </Card>
    <Btn v="s" to="/f-s19">축협 직원에게 화면으로 보여주기</Btn>
    <Row>
      <Btn v="t" to="/f-s15">지우기</Btn>
      <Btn v="s" to="/f-s03e">고치기</Btn>
    </Row>
  </Phone>
);
