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
export const savedFarm = () => read<MyFarm | null>(FARM_KEY, null);
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
  tries: number;
  failed?: boolean;
};
const QUEUE_KEY = 'mnm-send-queue';
const MAX_TRIES = 3; // 3회 실패하면 자동 전송을 멈추고 [다시 보내기]를 보인다 (SOS-QUEUE)

let queue = read<Queued[]>(QUEUE_KEY, []);
let sent = 0; // 이번에 자동으로 보낸 건수 (홈 안내용)
const subs = new Set<() => void>();
const set = (q: Queued[]) => {
  queue = q;
  write(QUEUE_KEY, q);
  subs.forEach((f) => f());
};
const useStore = <T,>(get: () => T) => useSyncExternalStore((f) => (subs.add(f), () => void subs.delete(f)), get);
export const useQueue = () => useStore(() => queue);
export const useSent = () => useStore(() => sent);
export const clearSent = () => {
  sent = 0;
  subs.forEach((f) => f());
};

/** 인터넷이 없어 못 보낸 전달을 대기열에 넣는다 */
export const enqueue = (q: Omit<Queued, 'tries'>) => set([...queue.filter((x) => x.key !== q.key), { ...q, tries: 0 }]);

let flushing = false;
/** 대기 중인 전달을 순서대로 보낸다. 인터넷이 없으면 멈추고 다음 연결 때 다시 */
export async function flush() {
  if (flushing || !apiReady || !getSession() || !navigator.onLine) return;
  flushing = true;
  try {
    for (const q of queue.filter((x) => !x.failed)) {
      const { key, tries, failed, ...body } = q;
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
}

/** 3회 실패한 건을 다시 자동 전송 대상으로 돌리고 보낸다 */
export const retryFailed = () => {
  set(queue.map((x) => ({ ...x, tries: 0, failed: false })));
  return flush();
};

/** 앱 시작 때 한 번: 남은 대기열을 보내고, 인터넷이 다시 연결될 때마다 보낸다 */
export function startOutbox() {
  addEventListener('online', () => void flush());
  void flush();
}
