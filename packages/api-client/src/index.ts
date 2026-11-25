/// <reference types="vite/client" />
// 요청·응답 형식은 mnm-dev `docs/api/openapi.yaml` 기준
export * from './farmer';

export type Role = 'farmer' | 'receiver' | 'admin';
/** 로그인 응답 (AUTH-01·02·04) */
export type Session = { access_token: string; expires_at: string; role: Role; must_change_pw: boolean };
export type FieldError = { field: string; message: string };

/** 서버 오류 응답 `{ code, message, errors, request_id }`. 네트워크 실패는 code `NET-OFF` */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly errors: FieldError[] = [],
    readonly requestId?: string,
  ) {
    super(message);
  }
}

/** 목록 응답의 data. 다음 요청에 next_cursor를 cursor로 넘긴다 */
export type Page<T> = { items: T[]; has_next: boolean; next_cursor: string | null };

/** 빈 값은 빼고 쿼리 문자열을 만든다. 없으면 '' */
export function qs(p: Record<string, string | number | undefined | null>) {
  const s = new URLSearchParams(Object.entries(p).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)])).toString();
  return s ? '?' + s : '';
}

const BASE: string = import.meta.env.VITE_API_BASE_URL ?? '';
/** API 주소가 있는 빌드인지. 없으면(화면 검토용 배포) 로그인 없이 화면을 열고 가짜 데이터를 보여 준다 */
export const apiReady = BASE !== '';

let mocks: Record<string, unknown> = {};
/** API 주소가 없는 빌드에서 GET 응답 대신 줄 가짜 데이터. 키는 쿼리를 뺀 경로 */
export const setMocks = (m: Record<string, unknown>) => {
  mocks = m;
};

/* ---------- 로그인 상태 ---------- */
const KEY = 'mnm-session';

/** 저장된 로그인. 없거나 만료됐으면 null */
export function getSession(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Session | null;
    return s && Date.parse(s.expires_at) > Date.now() ? s : null;
  } catch {
    return null;
  }
}

function saveSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    // 저장이 막힌 브라우저(사생활 보호 모드 등): 새로고침하면 다시 로그인해야 한다
  }
}

export const logout = () => saveSession(null);

let onExpired = () => {};
/** AUTH-401(로그인 만료)을 받았을 때 할 일. 앱이 로그인 화면으로 보낸다 */
export const setOnExpired = (f: () => void) => {
  onExpired = f;
};

/* ---------- 호출 ---------- */
const TIMEOUT_MS = 15_000; // 일반 응답 지연 기준 (오류·예외 TIMEOUT)
// 파일 올리기(FormData): 음성은 서버가 음성 인식·항목 정리를 이어 불러 각 8초라 15초를 넘길 수 있다. 올리는 시간까지 (제안값, 실측으로 조정)
const UPLOAD_TIMEOUT_MS = 40_000;
const GET_RETRY_MS = [1000, 3000]; // 조회(GET)만 시간이 지나면 1초·3초 뒤 다시 (저장·전달은 자동 재시도 금지)
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * `{ data }`의 data를 돌려준다. 204면 undefined. 실패하면 ApiError를 던진다. body가 FormData면 multipart로 보낸다.
 * 15초(파일 올리기는 40초) 안에 답이 없으면 TIMEOUT (조회는 두 번 더 해 본 뒤)
 */
export async function api<T>(path: string, opts: { method?: string; body?: unknown; headers?: Record<string, string> } = {}): Promise<T> {
  for (const delay of opts.method && opts.method !== 'GET' ? [] : GET_RETRY_MS) {
    try {
      return await call<T>(path, opts);
    } catch (e) {
      if (!(e instanceof ApiError && e.code === 'TIMEOUT')) throw e;
      await wait(delay);
    }
  }
  return call<T>(path, opts);
}

async function call<T>(path: string, { method = 'GET', body, headers }: { method?: string; body?: unknown; headers?: Record<string, string> }): Promise<T> {
  if (!apiReady) {
    const m = mocks[path.split('?')[0]];
    if (method === 'GET' && m !== undefined) return m as T;
    throw new ApiError(0, 'MOCK', '화면 검토용 배포라 서버에 보내지 않아요.');
  }
  const token = getSession()?.access_token;
  const form = body instanceof FormData;
  let res: Response;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), form ? UPLOAD_TIMEOUT_MS : TIMEOUT_MS);
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        ...(body === undefined || form ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : form ? body : JSON.stringify(body),
      signal: ctl.signal,
    });
  } catch {
    if (ctl.signal.aborted) throw new ApiError(0, 'TIMEOUT', '조금 늦어지고 있어요. 다시 시도해 주세요.');
    throw new ApiError(0, 'NET-OFF', '인터넷이 연결되지 않았어요. 연결되면 이어서 보낼게요.');
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => null);
  if (res.ok && json) return json.data as T;
  const e = new ApiError(
    res.status,
    json?.code ?? 'SRV-5XX',
    json?.message ?? '잠시 문제가 생겼어요. 입력하신 내용은 그대로 있어요. 다시 시도해 주세요.',
    json?.errors ?? [],
    json?.request_id,
  );
  if (e.code === 'AUTH-401') {
    logout();
    onExpired();
  }
  throw e;
}

/** 중복되면 안 되는 요청(신고 전달·축협 부탁)의 Idempotency-Key. 같은 화면에서 다시 보낼 때는 같은 키를 쓴다 */
export const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2));

/** FARM-12 양식대로 저장소에 파일을 바로 올린다 (API 서버를 거치지 않음). 실패하면 UPLOAD-FAIL */
export async function uploadFile(upload_url: string, fields: Record<string, string>, file: Blob) {
  const f = new FormData();
  Object.entries(fields).forEach(([k, v]) => f.append(k, v));
  f.append('file', file); // 저장소 POST 양식은 file이 마지막이어야 한다
  const res = await fetch(upload_url, { method: 'POST', body: f }).catch(() => null);
  if (!res?.ok) throw new ApiError(413, 'UPLOAD-FAIL', '파일을 올리지 못했어요. 다시 올려 주세요.');
}

/* ---------- 인증 (AUTH-01·02·04) ---------- */
const signIn = async (path: string, body: unknown) => {
  const s = await api<Session>(path, { method: 'POST', body });
  saveSession(s);
  return s;
};

/** 농가 로그인: 농장식별번호 6자리 + 휴대폰 번호(하이픈 있어도 됨) */
export const farmerLogin = (farm_no: string, phone: string) => signIn('/api/auth/farmer/login', { farm_no, phone });
/** 접수자·운영자 로그인 */
export const login = (login_id: string, password: string) => signIn('/api/auth/login', { login_id, password });
/** 임시 비밀번호 → 새 비밀번호. 새 토큰으로 바뀐다 */
export const changePassword = (new_password: string) => signIn('/api/auth/password', { new_password });
export * from './admin';
export * from './receiver';
