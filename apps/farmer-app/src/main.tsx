import { setMocks } from '@mnm/api-client';
import { farmerMocks } from '@mnm/mocks';
import { mount, type Screen } from '@mnm/ui';
import * as home from './home';
import * as diary from './diary';
import * as report from './report';
import * as check from './check';
import * as popups from './popups';
import { startOutbox } from './outbox';

setMocks(farmerMocks);
startOutbox();

// 화면 ID는 화면설계서 기준. 경로는 ID 소문자(/f-s01)
const screens: Screen[] = [
  ['F-S00', '로그인', home.FS00],
  ['F-S01', '홈', home.FS01],
  ['F-S02', '말로 기록하기', diary.FS02],
  ['F-S02T', '글로 쓰기', diary.FS02T],
  ['F-S03', '기록 확인', diary.FS03],
  ['F-S04Q', '신고서 빈칸 묻기 (이력 신고)', report.FS04Q],
  ['F-S03E', '기록 고치기', diary.FS03E],
  ['F-S04', '신고서 초안 (출생)', report.FS04],
  ['F-S04D', '신고서 초안 (폐사)', report.FS04D],
  ['F-S04M', '신고서 초안 (양도·양수·이동)', report.FS04M],
  ['F-S05', '이력 신고서 확인', report.FS05],
  ['F-S06', '축협에 부탁하기', report.FS06],
  ['F-S07', '신고 완료 / 부탁 완료', report.FS07],
  ['F-S08', '소 고르기', check.FS08],
  ['F-S08S', '본 것 말하기', check.FS08S],
  ['F-S09Q', '신고서 빈칸 묻기', check.FS09Q],
  ['F-S09', '공식 증상 질문', check.FS09],
  ['F-S10', '부위 사진 찍기', check.FS10],
  ['F-S10V', '행동 영상 찍기', check.FS10V],
  ['F-S11', '오늘 기록 요약', check.FS11],
  ['F-S19', '축협 직원에게 보여주기', check.FS19],
  ['F-S12', '신고 방법 고르기', check.FS12],
  ['F-S13', '보내기 전 확인 (승인)', check.FS13],
  ['F-S13P', '보내기 전 확인 (전화·인터넷 신고서)', check.FS13P],
  ['F-S14', '전달 완료', check.FS14],
  ['F-S14P', '지금 전화로 신고', check.FS14P],
  ['F-S14W', '신고서 항목 복사', check.FS14W],
  ['F-S15', '농장 일지', diary.FS15],
  ['F-S15D', '일지 기록 상세', diary.FS15D],
  ['F-S16', '알림', home.FS16],
  ['F-S17', '내 정보·설정', home.FS17],
  ['F-S17S', '보낸 기록 목록', home.FS17S],
  ['F-S18', '내 소 관리', home.FS18],
  ['F-P01', '[팝업] 바로 신고 시트', popups.FP01],
  ['F-P02', '[팝업] 귀표 번호 입력', popups.FP02],
  ['F-P03', '[팝업] 동의 내용 보기', popups.FP03],
  ['F-P04', '[팝업] 소 추가', popups.FP04],
  ['F-P04N', '[팝업] 소 추가 · 직접 입력', popups.FP04N],
  ['F-P05', '[팝업] 소 정보', popups.FP05],
  ['F-P06', '[팝업] 연락처 바꾸기', popups.FP06],
  ['F-E01', '[오류] 점검 중', popups.FE01],
  ['F-E02', '[오류] 인터넷 끊김', popups.FE02],
  ['F-E04', '[오류] 신고할 때 말할 내용', popups.FE04],
  ['F-E03', '[오류] 없는 페이지', popups.FE03],
];

// 로그인 없이 여는 화면: 로그인·동의 보기, [바로 신고](전화), 오류 화면
mount(screens, 'F-S00', 'F-E03', { login: 'F-S00', home: 'F-S01', open: ['F-P01', 'F-P03', 'F-E01', 'F-E02', 'F-E03', 'F-E04'] });
