import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import RedHotStore from "./RedHotStore";
import RedHotIntro from "./RedHotIntro";

const RedHotAdmin = lazy(() => import("./RedHotAdmin"));

const PAGES = { INTRO: "intro", STORE: "store", ADMIN: "admin" };

const TRANSITION_CSS = `
  .rh-page {
    position: fixed;
    inset: 0;
    will-change: opacity, transform;
    overflow-y: auto;
    overflow-x: hidden;
    background: #f7f5f2;
  }
  .rh-page-enter {
    opacity: 0;
    transform: translateY(28px) scale(0.985);
    pointer-events: none;
  }
  .rh-page-enter-active {
    opacity: 1;
    transform: translateY(0) scale(1);
    transition: opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1),
                transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .rh-page-exit {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: none;
  }
  .rh-page-exit-active {
    opacity: 0;
    transform: translateY(-20px) scale(1.015);
    transition: opacity 0.38s cubic-bezier(0.55, 0, 1, 0.45),
                transform 0.38s cubic-bezier(0.55, 0, 1, 0.45);
  }
  .rh-page-back-enter {
    opacity: 0;
    transform: translateY(-28px) scale(0.985);
    pointer-events: none;
  }
  .rh-page-back-enter-active {
    opacity: 1;
    transform: translateY(0) scale(1);
    transition: opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1),
                transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .rh-page-back-exit {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: none;
  }
  .rh-page-back-exit-active {
    opacity: 0;
    transform: translateY(28px) scale(0.985);
    transition: opacity 0.38s cubic-bezier(0.55, 0, 1, 0.45),
                transform 0.38s cubic-bezier(0.55, 0, 1, 0.45);
  }
  .rh-page[data-page="admin"] { background: #0a0a0a; }
  .rh-back-btn {
    position: fixed;
    bottom: 28px;
    left: 28px;
    z-index: 99998;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: rgba(247,245,242,0.92);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid #d4c9b8;
    border-radius: 40px;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: 11px;
    letter-spacing: 0.16em;
    font-weight: 600;
    color: #5c4f3d;
    text-transform: uppercase;
    box-shadow: 0 4px 20px rgba(0,0,0,0.10);
    transition: opacity 0.35s ease, transform 0.35s ease,
                border-color 0.2s, color 0.2s, box-shadow 0.2s;
  }
  .rh-back-btn:hover {
    border-color: #c81e1e;
    color: #c81e1e;
    box-shadow: 0 6px 24px rgba(200,30,30,0.18);
  }
  .rh-back-btn.hidden {
    opacity: 0;
    transform: translateY(12px);
    pointer-events: none;
  }
  .rh-admin-loading {
    position: fixed; inset: 0; background: #0a0a0a;
    display: flex; align-items: center; justify-content: center;
  }
  .rh-admin-spinner {
    width: 28px; height: 28px;
    border: 2px solid #222;
    border-top-color: #c0392b;
    border-radius: 50%;
    animation: rh-spin 0.8s linear infinite;
  }
  @keyframes rh-spin { to { transform: rotate(360deg); } }
`;

function usePager(initial) {
  const [current,  setCurrent]  = useState(initial);
  const [previous, setPrevious] = useState(null);
  const [phase,    setPhase]    = useState("idle");
  const [isBack,   setIsBack]   = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const history  = useRef([initial]);
  const pending  = useRef(null);
  const busy     = useRef(false);

  const EXIT_MS  = 380;
  const ENTER_MS = 600;

  const navigate = useCallback((next, back = false) => {
    if (next === current || busy.current) return;
    busy.current = true;
    pending.current = next;
    setIsBack(back);
    setPrevious(current);
    setPhase("exit");

    setTimeout(() => {
      setCurrent(pending.current);
      setPhase("enter");
      setTimeout(() => {
        setPhase("idle");
        setPrevious(null);
        busy.current = false;
      }, ENTER_MS + 50);
    }, EXIT_MS);

    history.current = back ? history.current.slice(0, -1) : [...history.current, next];
    setCanGoBack(history.current.length > 1);
  }, [current]);

  const goBack = useCallback(() => {
    if (history.current.length <= 1) return;
    navigate(history.current[history.current.length - 2], true);
  }, [navigate]);

  return { current, previous, phase, isBack, navigate, goBack, canGoBack };
}

function PageSlot({ children, pageKey, phase, isBack, isCurrent }) {
  const prefix = isBack ? "rh-page-back" : "rh-page";
  const cls = [
    "rh-page",
    isCurrent  && phase === "enter" ? `${prefix}-enter ${prefix}-enter-active` : "",
    !isCurrent && phase === "exit"  ? `${prefix}-exit  ${prefix}-exit-active`  : "",
  ].join(" ").trim();

  if (!isCurrent && phase !== "exit") return null;

  return (
    <div className={cls} data-page={pageKey}>
      {children}
    </div>
  );
}

export default function App() {
  const { current, previous, phase, isBack, navigate, goBack, canGoBack } =
    usePager(PAGES.INTRO);

  // Stable ESC key handler — goBack is memoized via useCallback
  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape" && canGoBack) goBack(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [canGoBack, goBack]);

  const showBack = canGoBack && current !== PAGES.INTRO && phase === "idle";

  const adminFallback = (
    <div className="rh-admin-loading">
      <div className="rh-admin-spinner" />
    </div>
  );

  const pageMap = {
    [PAGES.INTRO]: (
      <RedHotIntro onComplete={() => navigate(PAGES.STORE)} />
    ),
    [PAGES.STORE]: (
      <RedHotStore onNavigateAdmin={() => navigate(PAGES.ADMIN)} />
    ),
    [PAGES.ADMIN]: (
      <Suspense fallback={adminFallback}>
        <RedHotAdmin onNavigateStore={() => navigate(PAGES.STORE)} />
      </Suspense>
    ),
  };

  return (
    <>
      <style>{TRANSITION_CSS}</style>

      <PageSlot pageKey={current} phase={phase} isBack={isBack} isCurrent={true}>
        {pageMap[current]}
      </PageSlot>

      {previous && (
        <PageSlot pageKey={previous} phase={phase} isBack={isBack} isCurrent={false}>
          {pageMap[previous]}
        </PageSlot>
      )}

      <button
        className={`rh-back-btn${showBack ? "" : " hidden"}`}
        onClick={goBack}
        aria-label="Go back"
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
          <path d="M8.5 2L3.5 6.5L8.5 11"
            stroke="#c81e1e" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>
    </>
  );
}
