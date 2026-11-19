import type { ReactNode } from 'react';
import { logout } from '@mnm/api-client';
import { Btn, Card, Chips, Gnb, H, Info, Input, Kpis, KV, Link, Modal, Muted, P, Pill, Row, Side, Tbl, WebLogin, WebPassword, mount, useSearchParams, type Screen } from '@mnm/ui';

const MENU: [string, string][] = [
  ['대시보드', '/a-s01'], ['사용자', '/a-s02'], ['접수 기관', '/a-s09'], ['신고·전달', '/a-s04'],
  ['안내 문구', '/a-s05'], ['공공데이터', '/a-s06'], ['모델·AI 로그', '/a-s07'], ['감사 로그', '/a-s08'],
];

/** 어드민 공통 틀: 상단 바 + 좌측 메뉴 */
const Page = ({ children }: { children: ReactNode }) => (
  <>
    <Gnb brand="촌수의사 어드민" right={<>운영자 · <Link to="/r-s01" onClick={logout}>로그아웃</Link></>} />
    <Side items={MENU}>{children}</Side>
  </>
);

/** 제목 + 오른쪽 주 버튼 */
const Head = ({ title, action, to }: { title: string; action: string; to?: string }) => (
  <Row>
    <H>{title}</H>
    <Btn to={to}>{action}</Btn>
  </Row>
);

const AS01 = () => (
  <Page>
    <H>운영 대시보드</H>
    <Tbl
      head={['구성요소', '상태', '최근 확인']}
      rows={[
        ['API 서버', '● 정상', '11.14 10:02'],
        ['AI 추론 (부위 일치)', '● 정상 · 평균 820ms', '11.14 10:02'],
        ['LLM·STT (OpenAI)', '▲ 지연 · 4.1s', '11.14 10:01'],
        ['공공데이터 수집', '● 정상 · 06:00', '11.14 06:00'],
        ['DB · 저장소', '● 정상', '11.14 10:02'],
      ]}
      rowTo={(i) => [undefined, '/a-s07', '/a-s07', '/a-s06', undefined][i]}
    />
    <Kpis items={[['오늘 기록', '37건'], ['오늘 전달', '4건'], ['미처리 접수', '2건'], ['AI 오류율', '0.8%']]} />
    <Info tone="w">LLM 응답 지연 — 모델·AI 로그에서 확인</Info>
  </Page>
);

const Users = ({ children }: { children?: ReactNode }) => (
  <Page>
    <Head title="사용자" action="+ 계정 만들기" to="/a-p01" />
    <Chips items={['전체 52', '농가 41', '접수자 9', '운영자 2', '정지 0']} on={0} />
    <Input label="이름·연락처·농장명 검색" />
    <Tbl
      head={['이름', '역할', '소속 / 농장', '연락처', '상태', '최근 접속']}
      rows={[
        ['김한우', '농가', '448012 · 김한우 농장', '010-****-0937', '활성', '11.14'],
        ['박서연', '접수자', '홍성축협 방역팀', '041-***-1200', '활성', '11.14'],
        ['정순자', '농가', '448027 · 정순자 농장', '010-****-3390', '활성', '-'],
        ['운영팀', '운영자', '촌수의사', '-', '활성', '11.14'],
      ]}
      rowTo={(i) => (i % 2 === 0 ? '/a-s03f' : '/a-s03')}
    />
    {children}
  </Page>
);

const AS02 = () => <Users />;

const AP01 = () => (
  <Users>
    <Modal>
      <H>계정 만들기</H>
      <Chips items={['농가', '접수자', '운영자']} on={0} />
      <Input label="농장식별번호 6자리" />
      <Input label="이름" />
      <Input label="휴대폰 번호" />
      <Input label="농장 주소 · 사육 두수" />
      <Input label="담당 축협 (접수 기관에서 선택) ▾" />
      <Row>
        <Btn v="t" to={-1}>취소</Btn>
        <Btn to="/a-p01?done=1">만들기</Btn>
      </Row>
    </Modal>
  </Users>
);

/** 계정 생성 결과 (임시 비밀번호 1회 표시). 값은 가짜 예시 */
const AP01Done = () => (
  <Users>
    <Modal>
      <H>접수자 계정을 만들었어요</H>
      <KV rows={[['아이디', 'seoyeon.park'], ['임시 비밀번호', 'Kd7m-29qx · 복사']]} />
      <P>이 창을 닫으면 다시 볼 수 없어요. 본인에게 직접 전달하세요.</P>
      <Btn to="/a-s02">확인</Btn>
    </Modal>
  </Users>
);

const AP01Route = () => (useSearchParams()[0].has('done') ? <AP01Done /> : <AP01 />);

const Check = ({ on, children }: { on?: boolean; children: ReactNode }) => (
  <label><input type="checkbox" defaultChecked={on} /> {children}</label>
);

const AS03 = () => (
  <Page>
    <H>박서연 <Pill>접수자</Pill></H>
    <Row>
      <Card>
        <b>계정</b>
        <span>아이디 seoyeon.park</span>
        <span>소속 홍성축협 방역팀</span>
        <span>관할 충남 홍성군 (법정동 44800)</span>
        <span>상태 활성</span>
      </Card>
      <Card>
        <b>권한</b>
        <Check on>수신함 열람·처리</Check>
        <Check on>관할 농가 보기</Check>
        <Check>다른 관할 보기</Check>
      </Card>
    </Row>
    <Row>
      <Btn v="t" to="/a-p01?done=1">비밀번호 초기화</Btn>
      <Btn v="t">계정 정지</Btn>
      <Btn to="/a-s02">저장</Btn>
    </Row>
  </Page>
);

const AS03F = () => (
  <Page>
    <H>김한우 <Pill>농가</Pill></H>
    <Row>
      <Card>
        <b>계정</b>
        <span>농장식별번호 448012</span>
        <span>휴대폰 010-****-0937</span>
        <span>담당 축협 홍성축협 ▾</span>
        <span>상태 활성 · 최근 접속 11.14</span>
      </Card>
      <Card>
        <b>농장</b>
        <span>충남 홍성군 ○○읍 · 한우 42두</span>
        <span>등록된 소 3마리</span>
        <span>최근 30일 기록 12건 · 보낸 기록 1건</span>
      </Card>
    </Row>
    <Row>
      <Btn v="t">계정 정지</Btn>
      <Btn to="/a-s02">저장</Btn>
    </Row>
    <Info tone="g">기록 내용은 이 화면에 보이지 않아요. 신고·전달 현황에서 열람하면 감사 기록이 남아요.</Info>
  </Page>
);

const AS09 = () => (
  <Page>
    <Head title="접수 기관" action="+ 기관 추가" />
    <Tbl
      head={['기관명', '종류', '관할 지역', '수신함', '접수자', '대표 연락처']}
      rows={[
        ['홍성축협', '축협', '충남 홍성군', '이력 담당 · 방역팀', '2명', '041-***-1200'],
        ['홍성군청 축산과', '시·군', '충남 홍성군', '방역', '1명', '041-***-2000'],
      ]}
    />
    <Card>
      <b>편집 · 홍성축협</b>
      <span>기관명 · 종류 [축협 ▾] · 대표 연락처</span>
      <span>관할 지역: 충남 홍성군 (법정동 44800) <u>+ 지역 추가</u></span>
      <span>수신함: 이력 담당 / 방역팀 <u>+ 수신함 추가</u></span>
      <Row>
        <Btn v="t">취소</Btn>
        <Btn>저장</Btn>
      </Row>
    </Card>
  </Page>
);

const AS04 = () => (
  <Page>
    <H>신고·전달 현황</H>
    <Chips items={['최근 7일', '전체 경로', '전체 상태', '전달 실패 1']} on={0} />
    <Tbl
      head={['승인 시각', '농가', '종류', '경로', '받는 곳', '상태', '전달']}
      rows={[
        ['11.02 09:42', '김한우', '소 상태 기록', '전화', '신고센터', '새로 도착', '도착'],
        ['11.02 08:15', '이영수', '소 상태 기록', '축협', '홍성축협 방역팀', '확인 중', '도착'],
        ['11.01 20:10', '김한우', '출생 신고 초안', '축협 부탁', '홍성축협 이력', '신고 완료', '대기 후 도착'],
        ['11.01 17:20', '최민호', '소 상태 기록', '인터넷 신고서', '홍성축협 방역팀', '-', <><b className="red">실패</b> <u>다시 보내기</u></>],
      ]}
    />
  </Page>
);

const AS05 = () => (
  <Page>
    <Head title="안내 문구 · 지식베이스" action="+ 문구 등록" />
    <Chips items={['증상 질문 4', '촬영 안내 4', '질병별 조치 6', '신고 항목 6', '검수 중 2']} on={0} />
    <Tbl
      head={['순서', '문구', '근거 문서·조항', '개정일', '상태', '검수']}
      rows={[
        ['1', '침을 흘리나요?', '구제역 SOP · 의심증상 / 농식품부 회신 C1', '26.05.06', '게시', '수의사'],
        ['2', '입이나 발굽 주변에 물집이 있나요?', '구제역 SOP · 의심증상', '26.05.06', '게시', '수의사'],
        ['3', '사료를 안 먹거나 남기나요?', '구제역 SOP · 의심증상', '26.05.06', '검수 중', '-'],
        ['4', '피부에 혹(결절)이 있나요?', '럼피스킨 SOP · 주요 확인사항', '-', '게시', '수의사'],
      ]}
    />
    <Card><span><b>편집: 문구 3</b> · 예시 그림 [이미지 교체] · 상태 [초안 ▾ 검수 중 ▾ 게시] · 원문 발췌 붙여넣기 칸</span></Card>
  </Page>
);

const AS06 = () => (
  <Page>
    <H>공공데이터 수집 현황</H>
    <Tbl
      head={['데이터', '주기', '마지막 성공', '건수(소)', '상태', '']}
      rows={[
        ['가축 질병 발생 정보', '매일 06:00', '11.14 06:00', '1,284', '정상', '지금 수집'],
        ['사육규모별 농장 통계', '매월 1일', '11.01 06:10', '3,512', '정상', '지금 수집'],
        ['거점소독시설', '매일 06:00', '11.13 06:00', '214', '실패 · 직전 데이터 유지', '지금 수집'],
      ]}
    />
    <Card>
      <b>실행 기록 · 거점소독시설</b>
      <span>11.14 06:00 실패 — API 응답 시간 초과 (3회 재시도)</span>
      <span>11.13 06:00 성공 — 214건 / region_code 변환 실패 0</span>
    </Card>
  </Page>
);

const AS07 = () => (
  <Page>
    <H>모델·AI 로그</H>
    <Tbl
      head={['모델', '운영 버전', '지표', '통과 기준', '후보', '']}
      rows={[
        ['부위 일치 (SigLIP 2)', 'v1 · 26.11.10', 'Acc 0.938 · F1 0.930', 'Acc ≥ 0.85', 'v2 Acc 0.951', <><u>승격</u> · <u>되돌리기</u></>],
        ['행동 인식 (YOLO11s)', 'v1 · 26.11.08', 'Macro F1 0.857', '클래스별 P·R ≥ 0.8', '-', '-'],
      ]}
    />
    <Card><span>부위 일치 대체 경로 (OpenAI Vision) · 현재 <b>꺼짐</b> <u>켜기</u></span></Card>
    <Kpis items={[['호출 (24h)', '412'], ['평균 지연', '1.2s'], ['오류율', '0.8%'], ['평소와 다름 "문제 없음"', '62%']]} />
    <Tbl
      head={['시각', '기능', '모델 버전', '결과', '지연']}
      rows={[
        ['10:01:22', 'STT', 'whisper-1', '성공', '2.3s'],
        ['10:01:25', '라우터 LLM', 'gpt-4o-mini', 'intent=diary', '1.8s'],
        ['09:58:10', '부위 일치', 'siglip2-v1', 'hoof → hoof (0.91)', '0.8s'],
      ]}
    />
  </Page>
);

const AS08 = () => (
  <Page>
    <H>감사 로그</H>
    <Chips items={['최근 7일', '전체 사용자', '열람', '수정', '전달', '승격']} on={0} />
    <Tbl
      head={['시각', '사용자', '행위', '대상']}
      rows={[
        ['11.14 09:50', '박서연 (접수자)', '열람', '요약 #r1 김한우 농장'],
        ['11.14 09:52', '박서연 (접수자)', '상태 변경', '#r1 새로 도착 → 확인 중'],
        ['11.13 18:00', '운영팀 (운영자)', '게시', '안내 문구 #3'],
      ]}
    />
  </Page>
);

const NotFound = () => (
  <Page>
    <H>찾는 화면이 없어요</H>
    <Muted>주소를 다시 확인해 주세요.</Muted>
    <Btn to="/a-s01">대시보드로</Btn>
  </Page>
);

// 화면 ID는 화면설계서 기준. 경로는 ID 소문자(/a-s01)
const screens: Screen[] = [
  ['R-S01', '로그인 (접수자 웹과 같은 화면)', () => <WebLogin role="admin" home="/a-s01" sub="어드민" />],
  ['R-S06', '비밀번호 바꾸기 (첫 로그인)', () => <WebPassword home="/a-s01" />],
  ['A-S01', '운영 대시보드', AS01],
  ['A-S02', '사용자 관리 (목록)', AS02],
  ['A-P01', '[팝업] 계정 만들기 · 임시 비밀번호', AP01Route],
  ['A-S03', '사용자 상세 (접수자·운영자)', AS03],
  ['A-S03F', '사용자 상세 (농가)', AS03F],
  ['A-S09', '접수 기관 관리', AS09],
  ['A-S04', '신고·전달 현황', AS04],
  ['A-S05', '공식 안내 문구 · 지식베이스', AS05],
  ['A-S06', '공공데이터 수집 현황', AS06],
  ['A-S07', '모델·AI 로그 (MLOps)', AS07],
  ['A-S08', '감사 로그', AS08],
  ['404', '없는 화면', NotFound],
];

mount(screens, 'A-S01', '404', { login: 'R-S01', home: 'A-S01', password: 'R-S06', open: ['404'] });
