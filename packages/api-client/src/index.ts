/// <reference types="vite/client" />
// 요청·응답 형식은 mnm-dev `docs/api/openapi.yaml` 기준

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

const BASE: string = import.meta.env.VITE_API_BASE_URL ?? '';
/** API 주소가 있는 빌드인지. 없으면(화면 검토용 배포) 로그인 없이 화면을 연다 */
export const apiReady = BASE !== '';

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
/** `{ data }`의 data를 돌려준다. 204면 undefined. 실패하면 ApiError를 던진다 */
export async function api<T>(path: string, { method = 'GET', body, headers }: { method?: string; body?: unknown; headers?: Record<string, string> } = {}): Promise<T> {
  const token = getSession()?.access_token;
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NET-OFF', '인터넷이 연결되지 않았어요. 연결되면 이어서 보낼게요.');
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
