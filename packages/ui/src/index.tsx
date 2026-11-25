import { useEffect, useRef, useState, useSyncExternalStore, type ComponentType, type FormEvent, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError, apiReady, changePassword, getSession, login, logout, setOnExpired, type Page, type Role } from '@mnm/api-client';
import './ui.css';

export { Link, useNavigate, useSearchParams } from 'react-router-dom';

/** 이동 대상: 경로 문자열 또는 -1(직전 화면) */
export type To = string | -1;
type Kids = { children?: ReactNode };
type Tone = 'w' | 'd' | 'g' | 'ok';

/** 화면 ID(F-S01) → 경로(/f-s01) */
export const path = (id: string) => '/' + id.toLowerCase();

function useGo() {
  const nav = useNavigate();
  return (to?: To) => (to === undefined ? undefined : () => (to === -1 ? nav(-1) : nav(to)));
}

/** to가 있으면 버튼, 없으면 div로 그리는 공통 래퍼 */
function Tap({ to, className, children }: Kids & { to?: To; className: string }) {
  const go = useGo();
  return to === undefined ? (
    <div className={className}>{children}</div>
  ) : (
    <button type="button" className={className + ' tap'} onClick={go(to)}>
      {children}
    </button>
  );
}

/* ---------- 공통 블록 ---------- */
export const H = ({ center, children }: Kids & { center?: boolean }) => <h1 className={'h' + (center ? ' c' : '')}>{children}</h1>;
export const P = ({ center, children }: Kids & { center?: boolean }) => <p className={'p' + (center ? ' c' : '')}>{children}</p>;
export const Pill = ({ tone, children }: Kids & { tone?: Tone }) => <span className={'pill ' + (tone ?? '')}>{children}</span>;
export const Row = ({ children }: Kids) => <div className="row">{children}</div>;
export const Muted = ({ children }: Kids) => <span className="muted">{children}</span>;
export const Info = ({ tone, children }: Kids & { tone?: Tone }) => <div className={'info ' + (tone ?? '')}>{children}</div>;
export const Card = ({ to, children }: Kids & { to?: To }) => <Tap to={to} className="card">{children}</Tap>;
export const Opt = ({ to, sel, children }: Kids & { to?: To; sel?: boolean }) => <Tap to={to} className={'opt' + (sel ? ' sel' : '')}>{children}</Tap>;
export const Done = () => <div className="done" aria-hidden>✓</div>;
export const Mic = () => <button type="button" className="mic" aria-label="마이크" />;
/** src가 있으면 그 사진을 채워 보인다 (글자는 사진 설명으로) */
export const Pic = ({ to, oval, src, children }: Kids & { to?: To; oval?: boolean; src?: string | null }) => (
  <Tap to={to} className="pic">
    {src ? <img src={src} alt={typeof children === 'string' ? children : ''} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} /> : <>
      {oval && <span className="oval" />}
      <span>{children}</span>
    </>}
  </Tap>
);

/** v: p 주 버튼 / s 보조 / t 3순위 / d 신고 */
export function Btn({ v = 'p', to, href, onClick, submit, disabled, children }: Kids & { v?: 'p' | 's' | 't' | 'd'; to?: To; href?: string; onClick?: () => void; submit?: boolean; disabled?: boolean }) {
  const go = useGo();
  return href ? (
    <a className={'btn ' + v} href={href} onClick={onClick}>{children}</a>
  ) : (
    <button type={submit ? 'submit' : 'button'} className={'btn ' + v} disabled={disabled} onClick={onClick ?? go(to)}>{children}</button>
  );
}

/** 누르면 text를 클립보드에 복사한다. 복사가 막힌 환경(http 등)이면 그렇다고 알린다 */
export function CopyBtn({ text, children }: Kids & { text: string }) {
  const [msg, setMsg] = useState<string>();
  const copy = () =>
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(text))
      .catch(() => {
        // 클립보드 API가 막힌 곳(인앱 브라우저·권한 거부)은 예전 방식으로 한 번 더
        const t = document.createElement('textarea');
        t.value = text;
        document.body.append(t);
        t.select();
        const ok = document.execCommand('copy');
        t.remove();
        if (!ok) throw new Error('copy');
      })
      .then(() => setMsg('복사했어요'), () => setMsg('복사가 안 돼요'));
  return <Btn v="s" onClick={copy}><span aria-live="polite">{msg ?? children}</span></Btn>;
}

export const Tile = ({ title, sub, v = 'p', to }: { title: string; sub: string; v?: 'p' | 's' | 'd'; to?: To }) => (
  <Tap to={to} className={'tile ' + v}>
    <b>{title}</b>
    <small>{sub}</small>
  </Tap>
);

export const RouteCard = ({ title, sub, danger, to }: { title: string; sub: string; danger?: boolean; to?: To }) => (
  <Tap to={to} className={'route' + (danger ? ' d' : '')}>
    <b>{title}</b>
    <small>{sub}</small>
  </Tap>
);

/** rows: [항목, 값, 빈칸 여부?, 이동?] */
export const KV = ({ rows }: { rows: [string, ReactNode, boolean?, To?][] }) => (
  <div className="card kv">
    {rows.map(([k, v, blank, to]) => (
      <Tap key={k} to={to} className="kvr">
        <span>{k}</span>
        <b className={blank ? 'blank' : ''}>{v}</b>
      </Tap>
    ))}
  </div>
);

export const Steps = ({ n, on }: { n: number; on: number }) => (
  <div className="steps" aria-label={`${on + 1} / ${n} 단계`}>
    {Array.from({ length: n }, (_, i) => <i key={i} className={i <= on ? 'on' : ''} />)}
  </div>
);
export const Dots = ({ n, on }: { n: number; on: number }) => (
  <div className="dots" aria-label={`${on + 1} / ${n} 단계`}>
    {Array.from({ length: n }, (_, i) => <i key={i} className={i === on ? 'on' : ''} />)}
  </div>
);

/** 빨간 안내 문구. 내용이 없으면 그리지 않는다 */
export const Err = ({ children }: Kids) => (children ? <span className="err" role="alert">{children}</span> : null);

/** top이면 칸 위에 이름을 보인다 (값이 채워진 편집 칸용) */
const Field = ({ label, top, children }: Kids & { label: string; top?: boolean }) =>
  top ? <label className="fld"><small>{label}</small>{children}</label> : <>{children}</>;

/** err: 칸 아래 빨간 안내 (VALID-422 칸별 문구 등). 나머지 속성은 input(rows면 textarea)에 그대로 */
export const Input = ({ label, rows, err, top, ...p }: { label: string; rows?: number; err?: string; top?: boolean } & InputHTMLAttributes<HTMLInputElement>) => (
  <Field label={label} top={top}>
    {rows ? (
      <textarea className="input" rows={rows} placeholder={label} aria-label={label} aria-invalid={err ? true : undefined} {...(p as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
    ) : (
      <input className="input" placeholder={label} aria-label={label} aria-invalid={err ? true : undefined} {...p} />
    )}
    <Err>{err}</Err>
  </Field>
);

/** options: [값, 보이는 글자]. 첫 칸(빈 값)에 label을 보인다 */
export const Select = ({ label, options, err, top, ...p }: { label: string; options: [string, string][]; err?: string; top?: boolean } & SelectHTMLAttributes<HTMLSelectElement>) => (
  <Field label={label} top={top}>
    <select className="input" aria-label={label} aria-invalid={err ? true : undefined} {...p}>
      <option value="">{label}</option>
      {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
    </select>
    <Err>{err}</Err>
  </Field>
);

/** 엔터로도 보내지는 폼. 레이아웃은 감싸지 않은 것과 같다 */
export const Form = ({ onSubmit, children }: Kids & { onSubmit: (e: FormEvent) => void }) => (
  <form className="form" onSubmit={onSubmit} noValidate>{children}</form>
);

/** onPick이 있으면 선택 값은 부모가 on으로 관리한다 */
export function Chips({ items, on = -1, onPick }: { items: string[]; on?: number; onPick?: (i: number) => void }) {
  const [own, setOwn] = useState(on);
  const sel = onPick ? on : own;
  return (
    <div className="chips">
      {items.map((x, i) => (
        <button type="button" key={x} className={i === sel ? 'on' : ''} aria-pressed={i === sel} onClick={() => (onPick ?? setOwn)(i)}>{x}</button>
      ))}
    </div>
  );
}

export const Keypad = () => (
  <div className="keypad">
    {[1, 2, 3, 4, 5, 6, 7, 8, 9, '지움', 0, '완료'].map((k) => <button type="button" key={k}>{k}</button>)}
  </div>
);

/* ---------- 화면 설정: 글자 크기·선명한 화면·소리 안내 ---------- */
type Prefs = { font?: number; hc?: boolean; speak?: boolean };
const KEY = 'mnm-prefs';
const isFarmer = () => document.documentElement.classList.contains('farmer');
/** 글자 크기 단계 [이름, px]. 농가 앱 5단계, 접수자 웹 3단계. 단계를 바꾸면 html font-size만 바뀐다(전부 rem) */
export const fontSteps = (): [string, number][] =>
  isFarmer() ? [['작게', 16], ['보통', 19], ['조금 크게', 21], ['크게', 23], ['가장 크게', 26]] : [['보통', 16], ['크게', 18], ['가장 크게', 20]];
const fontStep = (px?: number) => {
  const steps = fontSteps();
  return Math.max(0, steps.findIndex(([, v]) => v === (px ?? steps[isFarmer() ? 1 : 0][1])));
};

// 기기(localStorage)에 저장하고, 앱이 setPrefsSaver로 넘긴 함수로 서버(FARM-20)에도 저장한다
let prefs: Prefs = (() => {
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {}) as Prefs;
  } catch {
    return {};
  }
})();
const subs = new Set<() => void>();
function applyPrefs() {
  const el = document.documentElement;
  el.style.fontSize = prefs.font ? prefs.font + 'px' : '';
  el.classList.toggle('hc', !!prefs.hc && isFarmer());
}
applyPrefs();

export type { Prefs };
let saver: ((p: Prefs) => void) | undefined;
/** 화면 설정을 바꿀 때마다 부를 함수 (농가 앱: 서버 저장) */
export const setPrefsSaver = (f: (p: Prefs) => void) => {
  saver = f;
};

/** save=false: 서버에서 받은 값을 적용할 때 (다시 저장하지 않음) */
export function setPrefs(p: Prefs, save = true) {
  prefs = { ...prefs, ...p };
  if (save) saver?.(prefs);
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // 저장이 막힌 브라우저(사생활 보호 모드 등)에서도 지금 화면에는 적용한다
  }
  applyPrefs();
  subs.forEach((f) => f());
}
export const usePrefs = () => useSyncExternalStore((f) => (subs.add(f), () => void subs.delete(f)), () => prefs);

/* 소리 안내: 브라우저 음성(Web Speech). 일부 인앱 브라우저·WebView에는 없다 */
export const canSpeak = typeof speechSynthesis !== 'undefined';
let screenText = () => '';
function speak() {
  if (!canSpeak) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(screenText());
  u.lang = 'ko-KR';
  speechSynthesis.speak(u);
}
/* ---------- 토스트: 화면 아래 잠깐 뜨는 안내 (3초) ---------- */
let toastMsg = '';
let toastTimer: ReturnType<typeof setTimeout> | undefined;
const toastSubs = new Set<() => void>();
const setToast = (m: string) => {
  toastMsg = m;
  toastSubs.forEach((f) => f());
};
export function toast(msg: string) {
  clearTimeout(toastTimer);
  setToast(msg);
  toastTimer = setTimeout(() => setToast(''), 3000);
}
function Toast() {
  const m = useSyncExternalStore((f) => (toastSubs.add(f), () => void toastSubs.delete(f)), () => toastMsg);
  return m ? <div className="toast" role="status">{m}</div> : null;
}

// 소리 안내가 없는 휴대폰도 버튼은 그대로 두고 누르면 알린다 (TTS-NA)
const toggleSpeak = () => {
  if (!canSpeak) return toast('이 휴대폰에서는 소리 안내를 쓸 수 없어요.');
  setPrefs({ speak: !prefs.speak });
  if (prefs.speak) speak();
  else if (canSpeak) speechSynthesis.cancel();
};

/** 헤더 [글씨 크기] 버튼. 누를 때마다 다음 글자 크기 */
export function FontBtn() {
  const p = usePrefs();
  const steps = fontSteps();
  const i = fontStep(p.font);
  return (
    <button type="button" className="fz" aria-label={`글씨 크기: ${steps[i][0]}`} onClick={() => setPrefs({ font: steps[(i + 1) % steps.length][1] })}>
      글씨 크기 <span style={{ whiteSpace: 'nowrap' }}>{steps[i][0]}</span>
    </button>
  );
}

const Switch = ({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) => (
  <button type="button" className="kvr tap" aria-pressed={on} onClick={onClick}>
    <b>{label}</b>
    <span>{on ? '켬' : '끔'} ›</span>
  </button>
);

/** 화면 설정 카드 (F-S17): 글자 크기·선명한 화면·소리 안내 */
export function PrefsCard() {
  const p = usePrefs();
  const steps = fontSteps();
  return (
    <div className="card">
      <b>글씨 크기</b>
      <Chips items={steps.map(([n]) => n)} on={fontStep(p.font)} onPick={(i) => setPrefs({ font: steps[i][1] })} />
      <Switch label="선명한 화면" on={!!p.hc} onClick={() => setPrefs({ hc: !p.hc })} />
      <Switch label="소리 안내" on={!!p.speak && canSpeak} onClick={toggleSpeak} />
    </div>
  );
}

/* ---------- 인터넷 연결 (NET-OFF) ---------- */
const onNet = (f: () => void) => {
  addEventListener('online', f);
  addEventListener('offline', f);
  return () => {
    removeEventListener('online', f);
    removeEventListener('offline', f);
  };
};
/** 지금 인터넷이 연결돼 있는지. 끊기거나 다시 연결되면 다시 그린다 */
export const useOnline = () => useSyncExternalStore(onNet, () => navigator.onLine);
const OFFLINE = '⚠ 인터넷이 연결되지 않았어요. 연결되면 이어서 보낼게요.';

/* ---------- 농가 앱 틀 ---------- */
// 하단 탭 [알림]의 안 읽은 수 (홈 요약 FARM-05에서 채움)
let unread = 0;
const unreadSubs = new Set<() => void>();
export const setUnread = (n: number) => {
  unread = n;
  unreadSubs.forEach((f) => f());
};
const useUnread = () => useSyncExternalStore((f) => (unreadSubs.add(f), () => void unreadSubs.delete(f)), () => unread);

const TABS: [string, string][] = [['홈', '/f-s01'], ['기록', '/f-s15'], ['알림', '/f-s16'], ['내 정보', '/f-s17']];

/**
 * 농가 앱 화면 틀. 헤더·하단 탭·[바로 신고] 고정 버튼을 그린다.
 * tab: 하단 탭에서 켜질 항목(없으면 탭 숨김), report: [바로 신고] 고정 버튼 표시.
 * 인터넷이 끊긴 동안은 모든 화면 위에 안내 띠를 고정하고, 다시 연결되면 없앤다 (NET-OFF)
 */
export function Phone({ title, back = true, tab, report = true, banner, say, children }: Kids & { title: string; back?: boolean; tab?: string; report?: boolean; banner?: string; say?: string }) {
  const go = useGo();
  const p = usePrefs();
  const n = useUnread();
  const online = useOnline();
  useEffect(() => {
    // shortcut: 소리 안내 문구(say)가 없으면 화면 제목을 읽는다, 화면별 문구 연결 시 say를 채운다
    screenText = () => say ?? document.querySelector('.h')?.textContent ?? title;
    // 켜 둔 동안 화면이 바뀌면 자동으로 읽는다. 켜고 끌 때 다시 읽지 않도록 훅 값이 아닌 모듈 값을 본다
    if (prefs.speak) speak();
  }, [say, title]);
  return (
    <div className="phone">
      {!online && <div className="mast w" role="status">{OFFLINE}</div>}
      {banner && <div className="mast w">{banner}</div>}
      <header className="hdr">
        {back && <button type="button" className="bk" aria-label="뒤로" onClick={go(-1)}>‹</button>}
        <span className="tt">{title}</span>
        <FontBtn />
        <button type="button" className={p.speak && canSpeak ? 'on' : ''} aria-pressed={!!p.speak && canSpeak} onClick={toggleSpeak}>듣기</button>
      </header>
      <main className="body">{children}</main>
      <Toast />
      {(report || tab) && (
        <footer className="foot">
          {report && <div className="fix"><Btn v="d" to="/f-p01">바로 신고 1588-9060</Btn></div>}
          {tab && (
            <nav className="tab" aria-label="하단 탭">
              {TABS.map(([name, to]) => (
                <Link key={name} to={to} className={name === tab ? 'on' : ''} aria-current={name === tab ? 'page' : undefined}>
                  {name}
                  {name === '알림' && n > 0 && <b className="badge">{n}</b>}
                </Link>
              ))}
            </nav>
          )}
        </footer>
      )}
    </div>
  );
}

/** 바텀시트 (농가 앱). 바깥을 누르면 직전 화면으로 */
export function Sheet({ children }: Kids) {
  const go = useGo();
  return (
    <div className="dim bottom" onClick={go(-1)}>
      <div className="sheet" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

/** 가운데 모달. 바깥을 누르면 onClose, 없으면 직전 화면으로 */
export function Modal({ onClose, children }: Kids & { onClose?: () => void }) {
  const go = useGo();
  return (
    <div className="dim" onClick={onClose ?? go(-1)}>
      <div className="modal" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

/* ---------- 웹(접수자·어드민) 틀 ---------- */
export const Mast = ({ children }: Kids) => <div className="mast">{children}</div>;

export const Gnb = ({ brand, items = [], right }: { brand: string; items?: [string, string][]; right?: ReactNode }) => (
  <header className="gnb">
    <span className="logo">{brand}</span>
    <nav>
      {items.map(([name, to]) => <NavLink key={name} to={to}>{name}</NavLink>)}
    </nav>
    <span className="muted right">{right}</span>
  </header>
);

export const Side = ({ items, children }: Kids & { items: [string, string][] }) => (
  <div className="side">
    <nav>
      {items.map(([name, to]) => <NavLink key={name} to={to}>{name}</NavLink>)}
    </nav>
    <main className="col pad">{children}</main>
  </div>
);

export const Pad = ({ children }: Kids) => <main className="col pad">{children}</main>;
export const Center = ({ children }: Kids) => <main className="col center">{children}</main>;
export const Col = ({ children }: Kids) => <div className="col">{children}</div>;
/** cols: 데스크톱 열 너비(예: "280px 1fr"). 좁은 화면에서는 한 열로 쌓인다 */
export const Cols = ({ cols, children }: Kids & { cols: string }) => <div className="cols" style={{ ['--cols' as string]: cols }}>{children}</div>;

export const Item = ({ to, on, title, sub }: { to?: To; on?: boolean; title: ReactNode; sub: string }) => (
  <Tap to={to} className={'item' + (on ? ' on' : '')}>
    <span>{title}</span>
    <small>{sub}</small>
  </Tap>
);

export const Kpis = ({ items }: { items: [string, string][] }) => (
  <div className="kpis">
    {items.map(([k, v]) => (
      <div key={k} className="kpi"><small>{k}</small><b>{v}</b></div>
    ))}
  </div>
);

/** rowTo: 행 번호 → 이동 대상 (없으면 클릭 불가) */
export function Tbl({ head, rows, rowTo }: { head: string[]; rows: ReactNode[][]; rowTo?: (i: number) => To | undefined }) {
  const go = useGo();
  return (
    <div className="tblwrap">
      <table className="tbl">
        <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => {
            const to = rowTo?.(i);
            return (
              <tr key={i} className={to === undefined ? '' : 'tap'} tabIndex={to === undefined ? undefined : 0} onClick={go(to)} onKeyDown={(e) => e.key === 'Enter' && go(to)?.()}>
                {r.map((c, j) => <td key={j}>{c}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export const Chart = ({ values }: { values: number[] }) => (
  <div className="chart" role="img" aria-label="날짜별 접수 건수 막대 그래프">
    {values.map((v, i) => <i key={i} style={{ height: Math.max(v, 4) + '%' }} />)}
  </div>
);

/* ---------- 데이터 불러오기 ---------- */
/** 웹(접수자·어드민) 오류 문구: 서버 message + 오류 번호(request_id) */
export const errText = (e: ApiError) => e.message + (e.requestId ? ` (오류 번호 ${e.requestId})` : '');
const toApiError = (e: unknown) => (e instanceof ApiError ? e : new ApiError(0, 'SRV-5XX', '잠시 문제가 생겼어요. 다시 시도해 주세요.'));

export type Query = { loading: boolean; err?: ApiError; reload: () => void };

/** GET 결과. path가 바뀌거나 reload하면 다시 부른다. 다시 부르는 동안 이전 data는 그대로 둔다 */
export function useApi<T>(path: string): Query & { data?: T } {
  const [s, setS] = useState<{ data?: T; err?: ApiError; loading: boolean }>({ loading: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    setS((x) => ({ data: x.data, loading: true }));
    api<T>(path).then(
      (data) => live && setS({ data, loading: false }),
      (e) => live && setS({ err: toApiError(e), loading: false }),
    );
    return () => {
      live = false;
    };
  }, [path, n]);
  return { ...s, reload: () => setN((x) => x + 1) };
}

/** 목록(Page) 결과. more()로 다음 쪽을 이어 붙인다. 다음 쪽이 없으면 more는 undefined */
export function usePage<T>(path: string): Query & { items: T[]; more?: () => void } {
  const [s, setS] = useState<{ items: T[]; next: string | null; err?: ApiError; loading: boolean }>({ items: [], next: null, loading: true });
  const [n, setN] = useState(0);
  const seq = useRef(0);
  const load = (cursor?: string) => {
    const my = ++seq.current; // 늦게 온 이전 요청(검색어를 바꾸기 전)의 응답은 버린다
    setS((x) => ({ ...x, err: undefined, loading: true }));
    api<Page<T>>(path + (cursor ? (path.includes('?') ? '&' : '?') + 'cursor=' + encodeURIComponent(cursor) : '')).then(
      (p) => my === seq.current && setS((x) => ({ items: cursor ? [...x.items, ...p.items] : p.items, next: p.has_next ? p.next_cursor : null, loading: false })),
      (e) => my === seq.current && setS((x) => ({ ...x, err: toApiError(e), loading: false })),
    );
  };
  useEffect(load, [path, n]);
  const { items, err, loading, next } = s;
  return { items, err, loading, reload: () => setN((x) => x + 1), more: next && !loading ? () => load(next) : undefined };
}

/** 불러오는 중 · 오류([다시 시도]) · 빈 목록 안내. empty 문구는 빈 목록일 때만 넘긴다 */
export function Status({ q, empty }: { q: Query; empty?: string | false }) {
  if (q.err) return <Info tone="d"><span role="alert">{errText(q.err)}</span> <Btn v="t" onClick={q.reload}>다시 시도</Btn></Info>;
  if (q.loading) return <Muted>불러오는 중…</Muted>;
  return empty ? <Muted>{empty}</Muted> : null;
}

/* ---------- 로그인 ---------- */
/** 로그인 후 갈 곳: ?next=(로그인 화면으로 오기 전에 보던 화면) 또는 home */
export function useGoNext(home: string) {
  const nav = useNavigate();
  const next = useSearchParams()[0].get('next');
  return () => nav(next?.startsWith('/') && !next.startsWith('//') ? next : home, { replace: true });
}

/**
 * 로그인 폼 공통: 보내는 중·잠금·오류 문구. send에서 ApiError를 던지면 칸별 문구(err[field]) 또는 전체 문구(err._)로 보여 준다.
 * AUTH-LOCK이면 문구 속 남은 분 동안 버튼을 막는다
 */
export function useAuthForm(send: () => Promise<void>, msg = (e: ApiError) => e.message) {
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const submit = async (ev?: FormEvent) => {
    ev?.preventDefault();
    setBusy(true);
    setErr({});
    try {
      await send();
    } catch (x) {
      if (!(x instanceof ApiError)) throw x;
      setErr(x.errors.length ? Object.fromEntries(x.errors.map((e) => [e.field, e.message])) : { _: msg(x) });
      const m = x.code === 'AUTH-LOCK' && /(\d+)분/.exec(x.message);
      if (m) {
        setLocked(true);
        setTimeout(() => setLocked(false), Number(m[1]) * 60_000);
      }
    } finally {
      setBusy(false);
    }
  };
  return { submit, err, busy: busy || locked };
}

const WEB_APP: Partial<Record<Role, string>> = { receiver: '접수자 웹', admin: '어드민' };
/** 서버 message는 농가 문구라 접수자 웹·어드민 문구로 바꾼다 (오류·예외 처리 탭) */
const webMsg = (e: ApiError) =>
  e.code === 'AUTH-FAIL'
    ? '아이디나 비밀번호를 다시 확인해 주세요.'
    : e.code === 'AUTH-LOCK'
      ? e.message.replace(/농장식별번호는.*$/, '촌수의사 운영팀에 문의하세요.')
      : e.message + (e.status >= 500 && e.requestId ? ` (오류 번호 ${e.requestId})` : '');

/** 접수자·운영자 로그인 (R-S01). 어드민도 이 화면을 쓴다. role이 다른 계정은 막는다 */
export function WebLogin({ role, home, sub }: { role: Role; home: string; sub: string }) {
  const nav = useNavigate();
  const goNext = useGoNext(home);
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const { submit, err, busy } = useAuthForm(async () => {
    const s = await login(id, pw);
    if (s.role !== role) {
      logout();
      throw new ApiError(403, 'AUTH-403', `${s.role === 'admin' ? '운영자' : '접수자'} 계정은 ${WEB_APP[s.role]}에서 로그인해 주세요.`);
    }
    if (s.must_change_pw) nav('/r-s06' + location.search, { replace: true });
    else goNext();
  }, webMsg);
  return (
    <Center>
      <Form onSubmit={submit}>
        <H>촌수의사 <Muted>{sub}</Muted></H>
        <Input label="아이디" autoComplete="username" value={id} onChange={(e) => setId(e.target.value)} err={err.login_id} />
        <Input label="비밀번호" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} err={err.password} />
        <Err>{err._}</Err>
        <Btn submit disabled={busy}>로그인</Btn>
        <P>계정 발급·비밀번호 초기화는 촌수의사 운영팀에 문의하세요</P>
      </Form>
    </Center>
  );
}

/** 임시 비밀번호 바꾸기 (R-S06). 바꾸면 새 토큰으로 home(또는 보던 화면)으로 */
export function WebPassword({ home }: { home: string }) {
  const goNext = useGoNext(home);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const { submit, err, busy } = useAuthForm(async () => {
    // shortcut: 불일치 문구는 명세에 없어 제안값, 명세 문구가 정해지면 바꾼다
    if (pw !== pw2) throw new ApiError(422, 'VALID-422', '', [{ field: 'confirm', message: '두 비밀번호가 달라요. 다시 넣어 주세요.' }]);
    await changePassword(pw);
    goNext();
  }, webMsg);
  return (
    <Center>
      <Form onSubmit={submit}>
        <H>새 비밀번호를 정해 주세요</H>
        <P>임시 비밀번호로 로그인했어요. 계속하려면 비밀번호를 바꿔야 해요.</P>
        <Input label="새 비밀번호 (8자 이상, 영문·숫자)" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} err={err.new_password} />
        <Input label="새 비밀번호 확인" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} err={err.confirm} />
        <Err>{err._}</Err>
        <Btn submit disabled={busy}>바꾸고 시작하기</Btn>
      </Form>
    </Center>
  );
}

/** 로그인이 필요한 앱의 설정. 화면 ID로 적는다. open: 로그인 없이 여는 화면, password: 임시 비밀번호 변경 화면 */
export type Auth = { login: string; home: string; password?: string; open: string[] };

const toLogin = (auth: Auth, from: string) => path(auth.login) + '?next=' + encodeURIComponent(from);

function Guard({ id, auth, children }: Kids & { id: string; auth: Auth }) {
  const loc = useLocation();
  const s = getSession();
  if (id === auth.login) return s ? <Navigate to={path(auth.home)} replace /> : <>{children}</>;
  if (auth.open.includes(id)) return <>{children}</>;
  if (!s) return <Navigate to={toLogin(auth, loc.pathname + loc.search)} replace />;
  // 임시 비밀번호 상태면 다른 주소로 가도 바꾸기 화면으로
  if (s.must_change_pw && auth.password && id !== auth.password) return <Navigate to={path(auth.password)} replace />;
  return <>{children}</>;
}

/* ---------- 앱 시작 ---------- */
export type Screen = [id: string, name: string, C: ComponentType];

/** 화면 전체 목록 (개발 확인용, /screens) */
function ScreenIndex({ screens }: { screens: Screen[] }) {
  return (
    <main className="col pad">
      <h1 className="h">화면 목록 ({screens.length})</h1>
      {screens.map(([id, name]) => <Link key={id} to={path(id)}>{id} {name}</Link>)}
    </main>
  );
}

/** 화면 배열을 받아 화면 ID별 경로(/f-s01 등)로 라우팅한다. auth가 있으면 로그인한 사람만 화면을 연다 */
export function mount(screens: Screen[], home: string, notFound: string, auth?: Auth) {
  const NotFound = screens.find(([id]) => id === notFound)![2];
  // shortcut: API 주소가 없는 빌드(화면 검토용 Vercel 배포)는 로그인 없이 모든 화면을 연다, 배포에 API 주소·CORS가 정해지면 조건을 없앤다
  const guard = apiReady ? auth : undefined;
  if (guard) setOnExpired(() => location.assign(toLogin(guard, location.pathname + location.search)));
  createRoot(document.getElementById('root')!).render(
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={path(home)} replace />} />
        {screens.map(([id, , C]) => <Route key={id} path={path(id)} element={guard ? <Guard id={id} auth={guard}><C /></Guard> : <C />} />)}
        <Route path="/screens" element={<ScreenIndex screens={screens} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>,
  );
}
