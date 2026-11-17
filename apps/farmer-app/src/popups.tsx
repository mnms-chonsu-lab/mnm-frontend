import type { ReactNode } from 'react';
import { Btn, Card, Chips, H, Info, Input, Keypad, KV, Modal, P, Phone, Row, Sheet, useNavigate } from '@mnm/ui';
import { CallBtn, CallNumber } from './check';

/** 바텀시트 팝업 공통 틀: 뒤 화면 제목만 보이고 시트가 올라온다 */
const Popup = ({ title, banner, children }: { title: string; banner?: string; children: ReactNode }) => (
  <Phone title={title} report={false} banner={banner}>
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
      <Btn v="s" onClick={() => nav(navigator.onLine ? '/f-s12' : '/f-e04')}>오늘 기록도 함께 보내기</Btn>
      <Btn v="t" to={-1}>닫기</Btn>
    </Popup>
  );
}

export const FP02 = () => (
  <Popup title="신고서 초안">
    <H>귀표 번호 입력</H>
    <P>귀표에 적힌 12자리 숫자</P>
    <Input label="002 0000 0000 0" />
    <Keypad />
    <Btn to={-1}>입력 완료</Btn>
  </Popup>
);

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

export const FP04 = () => (
  <Popup title="내 소">
    <H>소 추가</H>
    <Input label="002 1234 5678 9 (귀표 12자리)" />
    <Info tone="ok"><b>찾았어요</b> 한우 · 암 · 2022년 3월 14일 출생<br />구제역 백신 최종 접종 2026년 4월 2일</Info>
    <Input label="축사 (선택) 예: 2번 축사" />
    <Btn to={-1}>등록하기</Btn>
    {/* shortcut: 이력 조회 결과와 연결되지 않음, 조회 API 연동 시 못 찾은 경우에만 자동으로 넘긴다 */}
    <Btn v="t" to="/f-p04n">번호를 못 찾았을 때 보기</Btn>
  </Popup>
);

export const FP04N = () => (
  <Popup title="내 소">
    <H>소 추가</H>
    <Input label="002 1234 5678 0 (귀표 12자리)" />
    <Info tone="w">이 번호로 등록된 소를 찾지 못했어요. 번호를 다시 확인해 주세요.</Info>
    <Chips items={['암', '수']} on={0} />
    <Input label="출생일 2024년 1월" />
    <Input label="축사 (선택)" />
    <Btn to="/f-s18">직접 입력으로 등록</Btn>
  </Popup>
);

export const FP05 = () => (
  <Popup title="내 소">
    <H>1234번</H>
    <KV rows={[['귀표', '002 1234 5678 9'], ['품종·성별', '한우 · 암'], ['출생', '2022년 3월 14일'], ['구제역 백신 최종', '2026년 4월 2일 (7차)'], ['불러온 날', '11월 12일 · 축산물이력제']]} />
    <Input label="축사: 2번 축사" />
    <Row>
      <Btn v="t" to="/f-s04d">목록에서 빼기</Btn>
      <Btn to={-1}>저장</Btn>
    </Row>
  </Popup>
);

export const FP06 = () => (
  <Popup title="내 정보">
    <H>연락처 바꾸기</H>
    <Input label="새 휴대폰 번호 010-0000-0000" />
    <Info tone="w">바꾼 번호로 다음에 로그인해요. 접수자에게 보이는 번호도 함께 바뀌어요.</Info>
    <Btn to={-1}>바꾸기</Btn>
  </Popup>
);

const OFFLINE = '⚠ 인터넷이 연결되지 않았어요';

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
  <Popup title="보내기 전 확인" banner={OFFLINE}>
    <H>아직 보내지 못했어요</H>
    <P>입력하신 내용은 그대로 있어요.</P>
    <Btn to={-1}>다시 시도</Btn>
    <Btn v="d" to="/f-e04">전화로 신고하기</Btn>
    <Btn v="t" to={-1}>나중에 보내기</Btn>
  </Popup>
);

export const FE04 = () => (
  <Phone title="신고할 때 말할 내용" report={false} banner={OFFLINE}>
    <H>먼저 <span className="red">전화로</span><br />신고해 주세요</H>
    <CallBtn>전화 걸기 1588-9060</CallBtn>
    <KV rows={[['농장', '김한우 농장 · 충남 홍성군 ○○읍'], ['소', '한우 1234번 (전체 42두)'], ['본 것', '침 흘림, 사료 남김'], ['처음 본 때', '11월 2일 아침'], ['신고자', '김한우 010-****-0937']]} />
    <Info tone="w">기록과 사진은 <b>보내기 대기 중</b>이에요. 인터넷이 연결되면 바로 보내 드릴게요.</Info>
    <Btn v="t" to="/f-s01">처음으로</Btn>
  </Phone>
);

export const FE03 = () => (
  <Phone title="촌수의사" back={false} report={false}>
    <H center>찾는 기록이<br /><em>없어요</em></H>
    <P center>삭제됐거나 링크가 만료됐어요.</P>
    <Btn to="/f-s01">홈으로</Btn>
    <Btn v="d" to="/f-p01">바로 신고 1588-9060</Btn>
  </Phone>
);
