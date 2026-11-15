import { useState, type ComponentType, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
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
export const Pic = ({ to, oval, children }: Kids & { to?: To; oval?: boolean }) => (
  <Tap to={to} className="pic">
    {oval && <span className="oval" />}
    <span>{children}</span>
  </Tap>
);

/** v: p 주 버튼 / s 보조 / t 3순위 / d 신고 */
export function Btn({ v = 'p', to, href, children }: Kids & { v?: 'p' | 's' | 't' | 'd'; to?: To; href?: string }) {
  const go = useGo();
  return href ? (
    <a className={'btn ' + v} href={href}>{children}</a>
  ) : (
    <button type="button" className={'btn ' + v} onClick={go(to)}>{children}</button>
  );
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

export const Input = ({ label, rows }: { label: string; rows?: number }) =>
  rows ? <textarea className="input" rows={rows} placeholder={label} aria-label={label} /> : <input className="input" placeholder={label} aria-label={label} />;

export function Chips({ items, on = -1 }: { items: string[]; on?: number }) {
  const [sel, setSel] = useState(on);
  return (
    <div className="chips">
      {items.map((x, i) => (
        <button type="button" key={x} className={i === sel ? 'on' : ''} aria-pressed={i === sel} onClick={() => setSel(i)}>{x}</button>
      ))}
    </div>
  );
}

export const Keypad = () => (
  <div className="keypad">
    {[1, 2, 3, 4, 5, 6, 7, 8, 9, '지움', 0, '완료'].map((k) => <button type="button" key={k}>{k}</button>)}
  </div>
);

/* ---------- 농가 앱 틀 ---------- */
const FONT = ['작게', '보통', '조금 크게', '크게', '가장 크게'];
const FONT_PX = [16, 19, 21, 23, 26];
const TABS: [string, string][] = [['홈', '/f-s01'], ['기록', '/f-s15'], ['알림', '/f-s16'], ['내 정보', '/f-s17']];

/**
 * 농가 앱 화면 틀. 헤더·하단 탭·[바로 신고] 고정 버튼을 그린다.
 * tab: 하단 탭에서 켜질 항목(없으면 탭 숨김), report: [바로 신고] 고정 버튼 표시
 */
export function Phone({ title, back = true, tab, report = true, banner, say, children }: Kids & { title: string; back?: boolean; tab?: string; report?: boolean; banner?: string; say?: string }) {
  const go = useGo();
  const [step, setStep] = useState(() => Math.max(0, FONT_PX.indexOf(parseInt(document.documentElement.style.fontSize) || 19)));
  const bigger = () => {
    const next = (step + 1) % FONT_PX.length;
    document.documentElement.style.fontSize = FONT_PX[next] + 'px';
    setStep(next);
  };
  return (
    <div className="phone">
      {banner && <div className="mast w">{banner}</div>}
      <header className="hdr">
        {back && <button type="button" className="bk" aria-label="뒤로" onClick={go(-1)}>‹</button>}
        <span className="tt">{title}</span>
        <button type="button" aria-label={`글자 크기: ${FONT[step]}`} onClick={bigger}>가 {FONT[step]}</button>
        {/* shortcut: 소리 안내 문구(say)가 없으면 화면 제목을 읽는다, 화면별 문구 연결 시 say를 채운다 */}
        <button type="button" onClick={() => speechSynthesis.speak(new SpeechSynthesisUtterance(say ?? document.querySelector('.h')?.textContent ?? title))}>듣기</button>
      </header>
      <main className="body">{children}</main>
      {(report || tab) && (
        <footer className="foot">
          {report && <div className="fix"><Btn v="d" to="/f-p01">바로 신고 1588-9060</Btn></div>}
          {tab && (
            <nav className="tab" aria-label="하단 탭">
              {TABS.map(([name, to]) => (
                <Link key={name} to={to} className={name === tab ? 'on' : ''} aria-current={name === tab ? 'page' : undefined}>
                  {name}
                  {name === '알림' && <b className="badge">2</b>}
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

/** 가운데 모달. 바깥을 누르면 직전 화면으로 */
export function Modal({ children }: Kids) {
  const go = useGo();
  return (
    <div className="dim" onClick={go(-1)}>
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

/** 화면 배열을 받아 화면 ID별 경로(/f-s01 등)로 라우팅한다 */
export function mount(screens: Screen[], home: string, notFound: string) {
  const NotFound = screens.find(([id]) => id === notFound)![2];
  createRoot(document.getElementById('root')!).render(
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={path(home)} replace />} />
        {screens.map(([id, , C]) => <Route key={id} path={path(id)} element={<C />} />)}
        <Route path="/screens" element={<ScreenIndex screens={screens} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>,
  );
}
