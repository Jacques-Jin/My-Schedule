import { useEffect, useRef, useState } from "react";
import { getStoredTheme } from "../themes/loader";
import "../splash.css";

interface SplashScreenProps {
  onFinished: () => void;
  ready: boolean;
}

type SplashPhase = "entering" | "drawing" | "settling" | "highlight" | "poise" | "closing" | "holding" | "exiting" | "done";

// Timing constants (ms) — deliberately unhurried for a premium feel.
// "entering" is a quiet blank beat (ambient bg only) so the animation eases in.
// "poise" is a deliberate hold: wordmark fully set, ring gap still open,
// giving the eye a beat to register the brand before the ring completes.
const DESKTOP_TIMING = {
  entering: 700,
  drawing: 1800,
  settling: 2200,
  highlight: 2600,
  poise: 3200,
  closing: 3650,
  holding: 3850,
  exiting: 4200,
  minDuration: 2800,
  maxDuration: 5000,
};

const MOBILE_TIMING = {
  entering: 600,
  drawing: 1550,
  settling: 1900,
  highlight: 2250,
  poise: 2750,
  closing: 3150,
  holding: 3350,
  exiting: 3700,
  minDuration: 2400,
  maxDuration: 5000,
};

export default function SplashScreen({ onFinished, ready }: SplashScreenProps) {
  const [theme, setTheme] = useState("default");
  const [phase, setPhase] = useState<SplashPhase>("entering");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const timersRef = useRef<number[]>([]);
  const skipRef = useRef(false);
  // Stray pointerdown/keydown can arrive right after WebView boot; ignoring
  // input until the poise beat keeps them from killing the brand moment.
  const allowSkipRef = useRef(false);

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const timing = isMobile ? MOBILE_TIMING : DESKTOP_TIMING;

  const readyRef = useRef(ready);
  useEffect(() => {
    readyRef.current = ready;
  }, [ready]);

  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  // Phase state machine — scheduled once on mount. Re-arming on prop changes
  // would reset in-flight timers and scramble the timeline.
  useEffect(() => {
    const schedule = (fn: () => void, delay: number) => {
      const id = window.setTimeout(fn, delay);
      timersRef.current.push(id);
    };

    schedule(() => setPhase("drawing"), timing.entering);
    schedule(() => setPhase("settling"), timing.drawing);
    schedule(() => setPhase("highlight"), timing.settling);
    schedule(() => setPhase("poise"), timing.highlight);
    schedule(() => setPhase("closing"), timing.poise);
    schedule(() => setPhase("holding"), timing.closing);
    schedule(() => {
      allowSkipRef.current = true;
    }, timing.poise);

    // Exit condition: min duration met AND ready, OR max duration reached
    const startTime = Date.now();
    const checkExit = () => {
      if (skipRef.current) return;
      if (readyRef.current || Date.now() - startTime >= timing.maxDuration) {
        setPhase("exiting");
        schedule(() => {
          setPhase("done");
          onFinishedRef.current();
        }, 700);
      } else {
        // Not ready yet, check again in 100ms
        schedule(checkExit, 100);
      }
    };

    schedule(checkExit, timing.holding);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Skip handler
  useEffect(() => {
    const handleSkip = () => {
      if (skipRef.current || !allowSkipRef.current || phase === "done" || phase === "exiting") return;
      skipRef.current = true;
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      setPhase("exiting");
      window.setTimeout(() => {
        setPhase("done");
        onFinished();
      }, 700);
    };

    window.addEventListener("pointerdown", handleSkip);
    window.addEventListener("keydown", handleSkip);
    return () => {
      window.removeEventListener("pointerdown", handleSkip);
      window.removeEventListener("keydown", handleSkip);
    };
  }, [phase, onFinished]);

  const themeAttr = theme === "default" ? undefined : theme;

  return (
    <div className={`splash-root splash-phase-${phase}`} data-theme={themeAttr} aria-hidden="true" role="presentation">
      <div className="splash-container">
        <svg className="splash-ring" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--color-primary)" />
              <stop offset="100%" stopColor="#4E5FE6" />
            </linearGradient>
          </defs>
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="url(#ring-gradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="339.292"
            className="splash-arc"
            transform="rotate(-90 60 60)"
          />
          <circle
            cx="60"
            cy="6"
            r="3"
            fill="var(--color-primary)"
            className="splash-tip"
            opacity="0"
          />
        </svg>
        <div className="splash-text">
          <h1 className="splash-title">我的日程</h1>
          <p className="splash-subtitle">My Schedule</p>
        </div>
      </div>
    </div>
  );
}
