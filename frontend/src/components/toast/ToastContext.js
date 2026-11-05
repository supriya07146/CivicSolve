import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import "../../styles/Toast.css";

const ToastContext = createContext(null);

const DEFAULT_DURATION = 4500;
const EXIT_DURATION = 380; // keep in sync with cs-toast-exit in Toast.css

/* =====================================================
   ILLUSTRATIONS (animated with CSS in Toast.css)
   ===================================================== */

const CONFETTI = [
  { dx: -27, dy: -21, cls: "a", r: 2.4 },
  { dx: 25, dy: -25, cls: "b", r: 2 },
  { dx: 29, dy: 6, cls: "c", r: 2.4 },
  { dx: 19, dy: 26, cls: "d", r: 2 },
  { dx: -22, dy: 24, cls: "b", r: 2.4 },
  { dx: -30, dy: 3, cls: "c", r: 2 },
];

function SuccessArt() {
  return (
    <svg viewBox="0 0 64 64" className="cs-art-svg" aria-hidden="true">
      <circle className="cs-art-bg" cx="32" cy="32" r="28" />
      <circle className="cs-art-ring" cx="32" cy="32" r="19" />
      <circle className="cs-art-disc" cx="32" cy="32" r="18" />
      <path className="cs-art-mark" d="M23 33l6 6 12-13" />
      {CONFETTI.map((c, i) => (
        <circle
          key={i}
          className={`cs-confetti cs-confetti--${c.cls}`}
          cx="32"
          cy="32"
          r={c.r}
          style={{ "--dx": `${c.dx}px`, "--dy": `${c.dy}px`, "--i": i }}
        />
      ))}
    </svg>
  );
}

function WarningArt() {
  return (
    <svg viewBox="0 0 64 64" className="cs-art-svg" aria-hidden="true">
      <circle className="cs-art-bg" cx="32" cy="32" r="28" />
      <circle className="cs-art-ring" cx="32" cy="32" r="19" />
      <g className="cs-art-rock">
        <path
          className="cs-art-disc cs-art-tri"
          d="M32 17 L48 45 H16 Z"
        />
        <path className="cs-art-mark cs-art-bang" d="M32 27v9" />
        <circle className="cs-art-dot" cx="32" cy="41" r="1.9" />
      </g>
    </svg>
  );
}

function ErrorArt() {
  return (
    <svg viewBox="0 0 64 64" className="cs-art-svg" aria-hidden="true">
      <circle className="cs-art-bg" cx="32" cy="32" r="28" />
      <circle className="cs-art-ring" cx="32" cy="32" r="19" />
      <g className="cs-art-shake">
        <circle className="cs-art-disc" cx="32" cy="32" r="18" />
        <path className="cs-art-mark" d="M25 25l14 14M39 25l-14 14" />
      </g>
      {[0, 90, 180, 270].map((a, i) => (
        <path
          key={a}
          className="cs-art-spark"
          d="M32 7v5"
          transform={`rotate(${a + 45} 32 32)`}
          style={{ "--i": i }}
        />
      ))}
    </svg>
  );
}

function InfoArt() {
  return (
    <svg viewBox="0 0 64 64" className="cs-art-svg" aria-hidden="true">
      <circle className="cs-art-bg" cx="32" cy="32" r="28" />
      <circle className="cs-art-ring" cx="32" cy="32" r="19" />
      <g className="cs-art-float">
        <path
          className="cs-art-disc"
          d="M18 20a4 4 0 0 1 4-4h20a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4H30l-8 7v-7a4 4 0 0 1-4-4z"
        />
        <circle className="cs-art-dot" cx="32" cy="24" r="1.9" />
        <path className="cs-art-mark cs-art-bang" d="M32 29v5" />
      </g>
      <path className="cs-art-twinkle" d="M50 11v7M46.5 14.5h7" style={{ "--i": 0 }} />
      <path className="cs-art-twinkle" d="M13 46v5M10.5 48.5h5" style={{ "--i": 1 }} />
    </svg>
  );
}

function LogoutArt() {
  return (
    <svg viewBox="0 0 64 64" className="cs-art-svg" aria-hidden="true">
      <circle className="cs-art-bg" cx="32" cy="32" r="28" />
      <circle className="cs-art-ring" cx="32" cy="32" r="19" />
      <rect className="cs-art-disc" x="15" y="14" width="25" height="36" rx="3" />
      <rect className="cs-art-door" x="18" y="17" width="19" height="30" rx="2" />
      <circle className="cs-art-knob" cx="33" cy="32" r="1.6" />
      <g className="cs-art-arrow">
        <path d="M40 32h13M48 25.5l6.5 6.5-6.5 6.5" />
      </g>
    </svg>
  );
}

const TOAST_ART = {
  success: <SuccessArt />,
  warning: <WarningArt />,
  error: <ErrorArt />,
  info: <InfoArt />,
  logout: <LogoutArt />,
};

/* =====================================================
   PROVIDER
   ===================================================== */

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const timersRef = useRef(new Map()); // id -> { timeoutId, remaining, startedAt }
  const exitTimersRef = useRef(new Set());
  const dismissingRef = useRef(new Set());
  const onCloseRef = useRef(new Map()); // id -> callback
  const nextIdRef = useRef(0);

  const clearTimer = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer.timeoutId);
      timersRef.current.delete(id);
    }
  }, []);

  /**
   * Plays the exit animation, removes the toast, and THEN runs
   * its onClose callback (used for the delayed logout redirect).
   */
  const dismissToast = useCallback(
    (id) => {
      if (dismissingRef.current.has(id)) return;
      dismissingRef.current.add(id);

      clearTimer(id);

      setToasts((current) =>
        current.map((toast) =>
          toast.id === id ? { ...toast, leaving: true, paused: false } : toast
        )
      );

      const exitId = setTimeout(() => {
        exitTimersRef.current.delete(exitId);
        dismissingRef.current.delete(id);

        setToasts((current) => current.filter((toast) => toast.id !== id));

        const callback = onCloseRef.current.get(id);
        onCloseRef.current.delete(id);
        if (typeof callback === "function") callback();
      }, EXIT_DURATION);

      exitTimersRef.current.add(exitId);
    },
    [clearTimer]
  );

  const startTimer = useCallback(
    (id, ms) => {
      const timeoutId = setTimeout(() => dismissToast(id), ms);
      timersRef.current.set(id, {
        timeoutId,
        remaining: ms,
        startedAt: Date.now(),
      });
    },
    [dismissToast]
  );

  const pauseToast = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (!timer) return;

    clearTimeout(timer.timeoutId);
    timer.remaining -= Date.now() - timer.startedAt;

    setToasts((current) =>
      current.map((toast) =>
        toast.id === id ? { ...toast, paused: true } : toast
      )
    );
  }, []);

  const resumeToast = useCallback(
    (id) => {
      const timer = timersRef.current.get(id);
      if (!timer) return;

      startTimer(id, Math.max(600, timer.remaining));

      setToasts((current) =>
        current.map((toast) =>
          toast.id === id ? { ...toast, paused: false } : toast
        )
      );
    },
    [startTimer]
  );

  /**
   * showToast(type, title, message, duration, options)
   *   type:    "success" | "warning" | "error" | "info" | "logout"
   *   options: {
   *     onClose?: () => void   // runs after the toast has finished + animated out
   *     pauseOnHover?: boolean // default true
   *   }
   */
  const showToast = useCallback(
    (
      type = "success",
      title = "Success",
      message = "",
      duration = DEFAULT_DURATION,
      options = {}
    ) => {
      const safeType = TOAST_ART[type] ? type : "info";
      const id = ++nextIdRef.current;
      const timeout = Math.max(1500, Number(duration) || DEFAULT_DURATION);

      if (typeof options.onClose === "function") {
        onCloseRef.current.set(id, options.onClose);
      }

      setToasts((current) => [
        ...current,
        {
          id,
          type: safeType,
          title,
          message,
          duration: timeout,
          pauseOnHover: options.pauseOnHover !== false,
          leaving: false,
          paused: false,
        },
      ]);

      startTimer(id, timeout);

      return id;
    },
    [startTimer]
  );

  useEffect(() => {
    const timers = timersRef.current;
    const exitTimers = exitTimersRef.current;

    return () => {
      timers.forEach((timer) => clearTimeout(timer.timeoutId));
      timers.clear();
      exitTimers.forEach((timerId) => clearTimeout(timerId));
      exitTimers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}

      <div className="cs-toast-stack" aria-label="Notifications">
        {toasts.map((toast) => (
          <section
            key={toast.id}
            className={[
              "cs-toast",
              `cs-toast--${toast.type}`,
              toast.leaving ? "cs-toast--leaving" : "",
              toast.paused ? "cs-toast--paused" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            role={toast.type === "error" ? "alert" : "status"}
            aria-live={toast.type === "error" ? "assertive" : "polite"}
            onMouseEnter={() =>
              toast.pauseOnHover && !toast.leaving && pauseToast(toast.id)
            }
            onMouseLeave={() =>
              toast.pauseOnHover && !toast.leaving && resumeToast(toast.id)
            }
          >
            <span className="cs-toast-bubbles" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>

            <span className="cs-art">{TOAST_ART[toast.type]}</span>

            <div className="cs-toast-content">
              <strong>{toast.title}</strong>
              {toast.message && <p>{toast.message}</p>}
            </div>

            <button
              type="button"
              className="cs-toast-close"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
            >
              ×
            </button>

            <span
              className="cs-toast-progress"
              style={{ animationDuration: `${toast.duration}ms` }}
              aria-hidden="true"
            />
          </section>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }

  return context;
}