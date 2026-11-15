import { Btn, Card, Chips, Done, Dots, H, Info, KV, Mic, P, Phone, Pill, Row, Steps } from '@mnm/ui';

export const FS04Q = () => (
  <Phone title="신고서 초안" tab="홈" say="어미 소 귀표 끝 4자리를 알려 주세요.">
    <Dots n={3} on={2} />
    <P><b>빈칸 1 / 2</b></P>
    <H center>어미 소 귀표<br /><em>끝 4자리</em>를 알려 주세요</H>
    <Mic />
    <Card><span>“0871” → <b>0871번 (한우 암 · 6세)</b> 맞아요?</span></Card>
    <Row>
      <Btn v="t">아니요</Btn>
      <Btn to="/f-s04">맞아요</Btn>
    </Row>
    <Btn v="t" to="/f-s04">나중에 채울게요</Btn>
  </Phone>
);

const Submit = () => (
  <>
    <Btn to="/f-s05">신고서 보고 직접 제출</Btn>
    <Btn v="t" to="/f-s06">축협에 대신 부탁하기</Btn>
  </>
);

export const FS04 = () => (
  <Phone title="신고서 초안" tab="홈" say="출생 신고서를 미리 써 두었어요. 기한은 11월 5일이에요. 귀표 번호만 확인해 주세요.">
    <Dots n={3} on={2} />
    <H center>출생 신고서를<br /><em>미리 써 두었어요</em></H>
    <P center><Pill tone="w">기한 11월 5일 · 3일 남음</Pill></P>
    <KV rows={[['어미 소', '0871번'], ['태어난 날', '11월 1일'], ['성별', '암'], ['귀표 번호', '눌러서 입력 ›', true, '/f-p02']]} />
    <P center>말로 남긴 기록에서 자동으로 채웠어요</P>
    <Card>
      <span><b>직접 제출</b>: 신고서 항목을 보고 내가 이력제에 신고</span>
      <span><b>축협에 부탁</b>: 귀표 번호를 몰라도 돼요</span>
    </Card>
    <Submit />
  </Phone>
);

export const FS04D = () => (
  <Phone title="신고서 초안" tab="홈" say="폐사 신고서를 미리 써 두었어요. 기한은 11월 9일이에요.">
    <Dots n={3} on={2} />
    <H center>폐사 신고서를<br /><em>미리 써 두었어요</em></H>
    <P center><Pill tone="w">기한 11월 9일 · 5일 남음</Pill></P>
    <KV rows={[['신고 종류', '폐사'], ['폐사한 소', '5520번 (002 ···· 5520)'], ['폐사한 날', '11월 2일'], ['품종 · 성별', '한우 · 수']]} />
    <P center>말로 남긴 기록과 내 소 목록에서 채웠어요</P>
    <Submit />
  </Phone>
);

export const FS04M = () => (
  <Phone title="신고서 초안" tab="홈" say="소 이동 신고서를 미리 써 두었어요. 기한은 11월 10일이에요.">
    <Dots n={3} on={2} />
    <H center>이동 신고서를<br /><em>미리 써 두었어요</em></H>
    <P center><Pill tone="w">기한 11월 10일 · 6일 남음</Pill></P>
    <Chips items={['판 소(양도)', '사 온 소(양수)', '우리 다른 축사로']} on={0} />
    <KV rows={[['소', '0871번 (002 ···· 0871)'], ['보낸 날', '11월 3일'], ['받는 곳', '도축장 출하 · 홍성 도축장'], ['받는 곳 농장식별번호', '눌러서 입력 ›', true]]} />
    <Submit />
  </Phone>
);

export const FS05 = () => (
  <Phone title="출생 신고서" tab="홈">
    <H center>이 내용으로<br /><em>신고할까요?</em></H>
    <KV rows={[['신고인', '김한우'], ['농장', '김한우 농장 (충남 홍성군)'], ['어미 소', '0871번'], ['태어난 날', '2026년 11월 1일'], ['성별', '암'], ['품종', '한우'], ['송아지 귀표', '002 1489 0321 7']]} />
    <Btn v="s">항목 전체 복사</Btn>
    <Info>축산물이력제 신고 앱이나 축협에서 신고를 마치면 아래 버튼을 눌러 주세요</Info>
    <Btn to="/f-s07">신고 마쳤어요</Btn>
  </Phone>
);

export const FS06 = () => (
  <Phone title="축협에 부탁하기" tab="홈">
    <H center><em>홍성축협</em>에<br />대신 부탁할까요?</H>
    <KV rows={[['보내는 것', '출생 신고서 초안 · 출생 기록'], ['받는 곳', '홍성축협 이력 담당'], ['귀표 번호', '없음 · 축협이 확인']]} />
    <Card>
      <b>이렇게 진행돼요</b>
      <span>1. 축협 담당자가 초안을 확인해요</span>
      <span>2. 필요하면 전화로 물어봐요</span>
      <span>3. 대신 신고하면 알림으로 알려 드려요</span>
    </Card>
    <Btn to="/f-s07">네, 부탁할게요</Btn>
    <Btn v="t" to={-1}>아니요</Btn>
  </Phone>
);

export const FS07 = () => (
  <Phone title="부탁 완료" back={false} tab="홈">
    <Done />
    <H center>축협에 부탁했어요</H>
    <Card>
      <Steps n={3} on={0} />
      <span>전달됨 · 축협 확인 중 · 신고 완료</span>
    </Card>
    <Card>
      <b>다음 할 일</b>
      <span>귀표를 <b>11월 30일</b>까지 달아 주세요. 3일 전에 알려 드릴게요.</span>
    </Card>
    <Btn v="s" to="/f-s19">축협 직원에게 화면으로 보여주기</Btn>
    <Btn to="/f-s01">처음 화면으로</Btn>
  </Phone>
);
