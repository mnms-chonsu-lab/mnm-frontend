// 오프라인 신고 도우미 (SOS-OFFLINE · SOS-QUEUE)
// - 농장 정보를 기기에 저장해 두고, 인터넷이 없어도 "신고할 때 말할 내용"(F-E04)을 만든다
// - [네, 보낼게요]를 눌렀는데 인터넷이 없으면 보내기 대기열에 넣고, 연결되면 자동으로 보낸다 (승인 시각은 누른 시각 그대로)
import { useEffect, useSyncExternalStore } from 'react';
import { api, ApiError, apiReady, getSession, type DeliveryRoute, type MyFarm } from '@mnm/api-client';

const read = <T,>(key: string, empty: T): T => {
  try {
    return (JSON.parse(localStorage.getItem(key) ?? 'null') as T) ?? empty;
  } catch {
    return empty;
  }
};
const write = (key: string, v: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    // 저장이 막힌 브라우저(사생활 보호 모드 등): 이 화면을 연 동안만 기억한다
  }
};

/* ---------- 농장 정보 (기기 저장) ---------- */
const FARM_KEY = 'mnm-farm';
const FARM_NO_KEY = 'mnm-farm-no'; // 이 기기에서 마지막으로 로그인한 농장식별번호
const remove = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // 저장이 막힌 브라우저: 지울 것도 없다
  }
};
export const savedFarm = () => read<MyFarm | null>(FARM_KEY, null);
let owner = read<string | null>(FARM_NO_KEY, null);
/** 로그인한 농가를 기억한다. 다른 농가면 이전 농가의 농장 정보를 지우고, 이 농가가 못 보낸 기록을 보낸다 */
export function rememberFarm(farmNo: string) {
  if (farmNo !== owner) remove(FARM_KEY);
  owner = farmNo;
  write(FARM_NO_KEY, farmNo);
  subs.forEach((f) => f());
  void flush();
}
/** [로그아웃]: 다음 사람이 농장 정보를 못 보게 지운다. 못 보낸 기록은 남겨 두고 같은 농가가 다시 로그인하면 보낸다 */
export const clearFarm = () => remove(FARM_KEY);
/** 인터넷이 될 때 농장 정보를 받아 기기에 저장해 둔다 (홈) */
export function useFarmCache() {
  useEffect(() => {
    if (apiReady) api<MyFarm>('/api/farmer/me/farm').then((f) => write(FARM_KEY, f), () => {});
  }, []);
}

/* ---------- 보내기 대기열 ---------- */
/** 대기 중인 전달 한 건. key = Idempotency-Key (다시 보내도 한 번만 전달) */
export type Queued = {
  key: string;
  symptom_report_id: number;
  route: DeliveryRoute;
  send_to_coop?: boolean;
  share_phone: boolean;
  approved_at: string;
  /** 대기열에 넣은 농가. 같은 농가로 로그인했을 때만 보내고 보여 준다 (휴대폰을 같이 쓰는 경우) */
  farm_no: string | null;
  tries: number;
  failed?: boolean;
};
const QUEUE_KEY = 'mnm-send-queue';
const MAX_TRIES = 3; // 3회 실패하면 자동 전송을 멈추고 [다시 보내기]를 보인다 (SOS-QUEUE)
const RETRY_MS = 30_000; // 서버 오류 뒤 다시 보내기까지 (제안값, 실측으로 조정)

let queue = read<Queued[]>(QUEUE_KEY, []);
let sent = 0; // 이번에 자동으로 보낸 건수 (홈 안내용)
const subs = new Set<() => void>();
const set = (q: Queued[]) => {
  queue = q;
  write(QUEUE_KEY, q);
  subs.forEach((f) => f());
};
const useStore = <T,>(get: () => T) => useSyncExternalStore((f) => (subs.add(f), () => void subs.delete(f)), get);
/** 지금 로그인한 농가의 대기열 */
export function useQueue() {
  const q = useStore(() => queue);
  const o = useStore(() => owner);
  return q.filter((x) => x.farm_no === o);
}
export const useSent = () => useStore(() => sent);
export const clearSent = () => {
  sent = 0;
  subs.forEach((f) => f());
};

/** 인터넷이 없어 못 보낸 전달을 대기열에 넣는다 */
export const enqueue = (q: Omit<Queued, 'tries' | 'farm_no'>) => set([...queue.filter((x) => x.key !== q.key), { ...q, farm_no: owner, tries: 0 }]);

let flushing = false;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
/** 대기 중인 전달을 순서대로 보낸다. 인터넷이 없으면 멈추고 다음 연결 때 다시 */
export async function flush() {
  if (flushing || !apiReady || !getSession() || !navigator.onLine) return;
  flushing = true;
  try {
    for (const q of queue.filter((x) => !x.failed && x.farm_no === owner)) {
      const { key, tries, failed, farm_no, ...body } = q;
      try {
        await api('/api/farmer/deliveries', { method: 'POST', body, headers: { 'Idempotency-Key': key } });
      } catch (e) {
        if (e instanceof ApiError && e.code === 'NET-OFF') break;
        // 같은 키로 이미 전달됐으면(409) 보낸 것으로 본다
        if (!(e instanceof ApiError && e.code === 'CONFLICT-409')) {
          set(queue.map((x) => (x.key === key ? { ...x, tries: tries + 1, failed: tries + 1 >= MAX_TRIES } : x)));
          continue;
        }
      }
      sent += 1;
      set(queue.filter((x) => x.key !== key));
    }
  } finally {
    flushing = false;
  }
  // 서버 오류(5xx·시간 초과)는 online 이벤트가 다시 오지 않으니 잠시 뒤 다시 보낸다 (MAX_TRIES까지)
  if (queue.some((x) => x.tries > 0 && !x.failed && x.farm_no === owner)) {
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => void flush(), RETRY_MS);
  }
}

/** 3회 실패한 건을 다시 자동 전송 대상으로 돌리고 보낸다 */
export const retryFailed = () => {
  set(queue.map((x) => (x.farm_no === owner ? { ...x, tries: 0, failed: false } : x)));
  return flush();
};

/** 앱 시작 때 한 번: 남은 대기열을 보내고, 인터넷이 다시 연결될 때마다 보낸다 */
export function startOutbox() {
  addEventListener('online', () => void flush());
  void flush();
}
