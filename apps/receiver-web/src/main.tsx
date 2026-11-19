import type { ReactNode } from 'react';
import { Btn, Card, Center, Chart, Chips, Col, Cols, FontBtn, Gnb, H, Info, Input, Item, Kpis, KV, Mast, Modal, Muted, P, Pad, Pic, Pill, Row, Steps, Tbl, WebLogin, WebPassword, mount, type Screen } from '@mnm/ui';

const NOTICE = '접수자 전용 · 농가가 [보낼게요]로 승인한 기록만 표시됩니다';
const MENU: [string, string][] = [['접수된 기록 2', '/r-s02'], ['관할 농가', '/r-s03'], ['공식 지침', '/r-s04'], ['통계', '/r-s05']];

/** 로그인 후 화면 공통 틀: 안내 띠 + 상단 메뉴 */
const Page = ({ who = '홍성축협 방역팀 · 박서연', children }: { who?: string; children: ReactNode }) => (
  <>
    <Mast>{NOTICE}</Mast>
    <Gnb brand="촌수의사" items={MENU} right={<>{who}<FontBtn /></>} />
    {children}
  </>
);

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

/** 접수된 기록 목록 + 한 장 요약. 팝업(R-P01~P04, R-E02)은 이 화면 위에 뜬다 */
const Inbox = ({ children }: { children?: ReactNode }) => (
  <Page>
    <Cols cols="300px 1fr">
      <Col>
        <Chips items={['전체 4', '새로 도착 1', '확인 중 1', '처리 완료 2']} on={0} />
        <Item on to="/r-s02" title={<><b>김한우 농장 · 1234번</b> <Pill tone="d">공식 증상 2</Pill></>} sub="홍북읍 · 11.02 09:42 · 전화 신고와 연결" />
        <Item title={<b>이영수 농장 · 0871번</b>} sub="갈산면 · 11.02 08:15 · 축협 전달" />
        <Item title={<b>최민호 농장 · 5520번</b>} sub="서부면 · 11.01 17:20 · 인터넷 신고" />
        <Item to="/r-s02b" title={<><b>김한우 농장</b> <Pill tone="w">출생 신고 초안</Pill></>} sub="홍북읍 · 11.01 20:10 · 축협 부탁" />
        <Info>관할 최근 30일 발생: 구제역 0 · 럼피스킨 0</Info>
      </Col>
      <Col>
        <Card>
          <Muted>한 장 요약 · 농가 승인 11.02 09:42</Muted>
          <b>김한우 농장 · 1234번 (암소 · 4세)</b>
          <span><Pill tone="d">침 흘림 · 공식 증상</Pill> <Pill tone="d">사료 남김 · 공식 증상</Pill> <Pill>연락처 공개 동의</Pill></span>
          <Steps n={3} on={0} />
        </Card>
        <Row>
          <Btn to="/r-p01">농가에 전화하기</Btn>
          <Btn v="s" to="/r-p02">신고서로 옮기기</Btn>
          <Btn v="t" to="/r-p04">처리 완료</Btn>
        </Row>
        <Row>
          <Card>
            <b>농가가 보낸 사진</b>
            <Row>
              <Pic to="/r-p03">입 · 부위 일치</Pic>
              <Pic to="/r-p03">몸 옆면</Pic>
              <Pic to="/r-p03">▶ 영상 10초</Pic>
            </Row>
            <span>영상에서 본 모습: 눕기 70% · 서기 20% · 먹기 10% <Muted>(참고)</Muted></span>
          </Card>
          <Card>
            <b>농장 기본 정보</b>
            <span>사육 42두 · 최근 접종 구제역 백신 10.08</span>
            <span>최근 소독 11.02 · 외부 출입 10.31</span>
          </Card>
        </Row>
        <Card>
          <b>최근 14일 일지</b>
          <span>11.02 2번 축사 소독 · 1234번 사료 남김</span>
          <span>10.30 1234번 사료 조금 남김 · <em>평소와 다름 알림</em></span>
        </Card>
        <Row>
          <Card>
            <b>처리 이력</b>
            <span>11.02 09:42 농가 전달 승인</span>
          </Card>
          <Card to="/r-s04">
            <b>관련 공식 지침</b>
            <span>구제역 SOP · 예방법 제13조</span>
          </Card>
        </Row>
        <Info tone="g">질병 여부 판단과 조치는 접수자·방역기관이 공식 절차에 따라 결정합니다.</Info>
      </Col>
    </Cols>
    {children}
  </Page>
);

const RS02 = () => <Inbox />;

const RS02B = () => (
  <Page who="홍성축협 이력 담당 · 최지훈">
    <Pad>
      <Row>
        <H>출생 신고 초안 · 김한우 농장</H>
        <Pill tone="w">기한 11월 5일 · D-3</Pill>
      </Row>
      <KV rows={[['신고인', '김한우 (448012)'], ['어미 소', '002 0871 ···· · 0871번'], ['태어난 날', '2026년 11월 1일'], ['성별 · 품종', '암 · 한우'], ['송아지 귀표', '미입력 — 축협 확인 필요', true]]} />
      <Row>
        <Btn v="s">항목 전체 복사</Btn>
        <Btn v="s" to="/r-p01">농가에 전화하기</Btn>
        <Btn to="/r-s02">이력제 신고 마침</Btn>
      </Row>
      <Card>
        <b>처리 이력</b>
        <span>11.01 20:10 농가 부탁 · 11.02 09:10 확인 시작</span>
      </Card>
    </Pad>
  </Page>
);

const RP01 = () => (
  <Inbox>
    <Modal>
      <H>농가에 전화하기</H>
      <P>김한우 님 · 김한우 농장</P>
      <Row>
        <H>010-2481-0937</H>
        <Btn v="s">번호 복사</Btn>
      </Row>
      <Btn href="tel:01024810937">전화 걸기</Btn>
      <Input label="예) 통화함. 오후 2시 방역관 방문 예정" />
      <Btn v="t" to={-1}>메모 저장</Btn>
    </Modal>
  </Inbox>
);

const RP02 = () => (
  <Inbox>
    <Modal>
      <H>신고서로 옮기기</H>
      <P>시행규칙 제13조 필수 6개 항목을 농가 기록에서 채웠습니다.</P>
      <KV rows={[
        ['소유자 성명', '김한우'],
        ['사육장소 또는 발견장소', '충남 홍성군 홍북읍 · 2번 축사'],
        ['가축의 종류 및 두수', '한우 1두 (1234번) / 전체 42두'],
        ['질병명(추정 병명 또는 발견 당시 상태)', '발견 당시 상태: 침 흘림, 사료 남김'],
        ['죽은 연월일(불분명 시 발견 연월일)', '발견 2026-11-02'],
        ['신고자 성명 및 주소', '김한우 · 충남 홍성군 홍북읍'],
      ]} />
      <Btn to={-1}>항목 전체 복사</Btn>
    </Modal>
  </Inbox>
);

const RP03 = () => (
  <Inbox>
    <Modal>
      <H>입 사진</H>
      <Pic>원본 사진</Pic>
      <Info>요청 부위: <b>입</b> · 판정 부위: <b>입</b> (일치)</Info>
      <Btn v="t" to={-1}>닫기</Btn>
    </Modal>
  </Inbox>
);

const RP04 = () => (
  <Inbox>
    <Modal>
      <H>처리 완료</H>
      <P>농가 앱에 처리 결과가 표시됩니다.</P>
      <Card>
        {['방역기관 검사 요청', '수의사 진료 안내', '경과 관찰 안내', '공식 증상 해당 없음'].map((x, i) => (
          <label key={x}><input type="radio" name="result" defaultChecked={i === 0} /> {x}</label>
        ))}
      </Card>
      <Input label="메모 (선택)" />
      <Btn to="/r-s02">처리 완료로 바꾸기</Btn>
    </Modal>
  </Inbox>
);

const RS03 = () => (
  <Page>
    <Pad>
      <H>관할 농가 7곳 <Muted>미응답·소규모 농가를 먼저 보여 줍니다</Muted></H>
      <Kpis items={[['기한 임박', '3곳'], ['알림 미응답', '3곳'], ['50두 미만', '6곳'], ['오늘 기록', '2곳']]} />
      <Tbl
        head={['농가', '지역', '두수', '연락처', '마지막 기록', '기한', '알림', '']}
        rows={[
          ['박정희 농장', '은하면', '9두', '010-****-2210', '11.01', '귀표 D-5', '미응답', '다시 알리기'],
          ['윤대근 농장', '광천읍', '7두', <>010-****-7731 <Pill tone="w">11.10 변경</Pill></>, '10.15', '-', '미응답', '다시 알리기'],
          ['정순자 농장', '결성면', '12두', '010-****-3390', '10.24', '출생 D-1', '미응답', '다시 알리기'],
          ['김한우 농장', '홍북읍', '42두', '010-****-0937', '11.02', '출생 D-3', '확인함', '연락하기'],
        ]}
        rowTo={(i) => (i === 3 ? '/r-p01' : undefined)}
      />
    </Pad>
  </Page>
);

const RS04 = () => (
  <Page>
    <Pad>
      <H>공식 지침</H>
      <P>농가 앱의 증상 질문, 촬영 안내, 신고 후 안내는 아래 지침 원문에서만 가져옵니다.</P>
      <details className="card" open>
        <summary><b>구제역 긴급행동지침(SOP) 개정('26.5.6.)</b> · 농림축산식품부</summary>
        <span>· 의심증상: 침 흘림, 입·발굽 주변 수포, 사료 섭취 저하</span>
        <span>· 의심축 발견 시 즉시 신고</span>
        <span>· 가축·분뇨·장비 이동제한, 사람·차량 출입제한</span>
      </details>
      <details className="card"><summary><b>럼피스킨 긴급행동지침(SOP)</b></summary></details>
      <details className="card"><summary><b>가축전염병 예방법 제11조 · 시행규칙 제13조</b></summary></details>
    </Pad>
  </Page>
);

const RS05 = () => (
  <Page>
    <Pad>
      <H>이번 주 통계</H>
      <Kpis items={[['접수된 기록', '4건'], ['처리 완료', '2건'], ['사진 포함', '3건']]} />
      <Chart values={[30, 0, 60, 30, 0, 60, 90]} />
    </Pad>
  </Page>
);

const RE01 = () => (
  <>
    <Mast>점검 예정: 11월 25일 22:00~23:00</Mast>
    <Gnb brand="촌수의사" items={MENU} />
    <Center>
      <H>지금은 점검 중이에요</H>
      <P>오후 3시에 다시 열려요. 급한 신고 접수는 기존 전화·시스템을 이용해 주세요.</P>
      <Muted>오류 번호 req_8f2a1c</Muted>
      <Btn to="/r-s02">다시 확인하기</Btn>
    </Center>
  </>
);

const RE02 = () => (
  <Inbox>
    <Modal>
      <H>다른 담당자가 먼저 처리했어요</H>
      <P>이영수 농장 · 0871번 — 김민수 주무관이 11.02 08:52에 "처리 완료"로 바꿨어요.</P>
      <Btn to="/r-s02">최신 상태로 보기</Btn>
      <Muted>오류 번호 req_31b9e0</Muted>
    </Modal>
  </Inbox>
);

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
  ['R-E01', '[오류] 점검 · 오류 페이지', RE01],
  ['R-E02', '[오류] 처리 충돌 모달', RE02],
];

mount(screens, 'R-S01', 'R-E01', { login: 'R-S01', home: 'R-S02', password: 'R-S06', open: ['R-E01'] });
