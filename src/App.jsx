import { useState, useEffect, useRef } from "react";
import RedHotStore from "./RedHotStore";
import RedHotAdmin from "./RedHotAdmin";
import RedHotIntro from "./RedHotIntro";

// ── page keys ──────────────────────────────────────────────────────────────
const PAGES = { INTRO: "intro", STORE: "store", ADMIN: "admin" };

// ── CSS injected once ───────────────────────────────────────────────────────
const TRANSITION_CSS = `
  .rh-page {
    position: fixed;
    inset: 0;
    will-change: opacity, transform;
    overflow-y: auto;
    overflow-x: hidden;
    background: #f7f5f2;
  }

  /* forward: new page slides up from below */
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

  /* back: new page slides down from above */
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

  /* admin dark bg */
  .rh-page[data-page="admin"] { background: #0a0a0a; }

  /* back button */
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
`;

// ── pager hook ─────────────────────────────────────────────────────────────
function usePager(initial) {
  const [current,  setCurrent]  = useState(initial);
  const [previous, setPrevious] = useState(null);
  const [phase,    setPhase]    = useState("idle"); // idle | exit | enter
  const [isBack,   setIsBack]   = useState(false);
  const history  = useRef([initial]);
  const pending  = useRef(null);
  const busy     = useRef(false);

  const EXIT_MS  = 380;
  const ENTER_MS = 600;

  const navigate = (next, back = false) => {
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

    if (back) {
      history.current = history.current.slice(0, -1);
    } else {
      history.current = [...history.current, next];
    }
  };

  const goBack = () => {
    if (history.current.length <= 1) return;
    navigate(history.current[history.current.length - 2], true);
  };

  const canGoBack = history.current.length > 1;

  return { current, previous, phase, isBack, navigate, goBack, canGoBack };
}

// ── page slot ─────────────────────────────────────────────────────────────
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

// ── app ────────────────────────────────────────────────────────────────────
export default function App() {
  const { current, previous, phase, isBack, navigate, goBack, canGoBack } =
    usePager(PAGES.INTRO);

  // keyboard ESC = back
  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape" && canGoBack) goBack(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [canGoBack, goBack]);

  const showBack =
    canGoBack && current !== PAGES.INTRO && phase === "idle";

  const pageMap = {
    [PAGES.INTRO]: (
      <RedHotIntro onComplete={() => navigate(PAGES.STORE)} />
    ),
    [PAGES.STORE]: (
      <RedHotStore onNavigateAdmin={() => navigate(PAGES.ADMIN)} />
    ),
    [PAGES.ADMIN]: (
      <RedHotAdmin onNavigateStore={() => navigate(PAGES.STORE)} />
    ),
  };

  return (
    <>
      <style>{TRANSITION_CSS}</style>

      {/* active page */}
      <PageSlot
        pageKey={current}
        phase={phase}
        isBack={isBack}
        isCurrent={true}
      >
        {pageMap[current]}
      </PageSlot>

      {/* outgoing page (rendered only during exit) */}
      {previous && (
        <PageSlot
          pageKey={previous}
          phase={phase}
          isBack={isBack}
          isCurrent={false}
        >
          {pageMap[previous]}
        </PageSlot>
      )}

      {/* floating back button */}
      <button
        className={`rh-back-btn${showBack ? "" : " hidden"}`}
        onClick={goBack}
        aria-label="Go back"
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M8.5 2L3.5 6.5L8.5 11"
            stroke="#c81e1e" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>
    </>
  );
}
