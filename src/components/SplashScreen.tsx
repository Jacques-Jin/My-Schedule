import { useEffect, useRef, useState } from "react";
import { getStoredTheme } from "../themes/loader";
import "../splash.css";

interface SplashScreenProps {
  onFinished: () => void;
  ready: boolean;
}

type SplashPhase = "entering" | "drawing" | "settling" | "highlight" | "closing" | "holding" | "exiting" | "done";

// Timing constants (ms)
const DESKTOP_TIMING = {
  entering: 200,
  drawing: 950,
  settling: 1150,
  highlight: 1450,
  closing: 1600,
  holding: 1750,
  exiting: 1900,
  minDuration: 1200,
  maxDuration: 2500,
};

const MOBILE_TIMING = {
  entering: 150,
  drawing: 700,
  settling: 880,
  highlight: 1050,
  closing: 1180,
  holding: 1300,
  exiting: 1400,
  minDuration: 900,
  maxDuration: 2500,
};

export default function SplashScreen({ onFinished, ready }: SplashScreenProps) {
  const [theme, setTheme] = useState("default");
  const [phase, setPhase] = useState<SplashPhase>("entering");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const timersRef = useRef<number[]>([]);
  const skipRef = useRef(false);

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const timing = isMobile ? MOBILE_TIMING : DESKTOP_TIMING;

  // Phase state machine
  useEffect(() => {
    if (skipRef.current) return;

    const schedule = (fn: () => void, delay: number) => {
      const id = window.setTimeout(fn, delay);
      timersRef.current.push(id);
    };

    schedule(() => setPhase("drawing"), timing.entering);
    schedule(() => setPhase("settling"), timing.drawing);
    schedule(() => setPhase("highlight"), timing.settling);
    schedule(() => setPhase("closing"), timing.highlight);
    schedule(() => setPhase("holding"), timing.closing);

    // Exit condition: min duration met AND ready, OR max duration reached
    const checkExit = () => {
      if (skipRef.current) return;
      if (ready || Date.now() - startTime >= timing.maxDuration) {
        setPhase("exiting");
        schedule(() => {
          setPhase("done");
          onFinished();
        }, 200);
      } else {
        // Not ready yet, check again in 100ms
        schedule(checkExit, 100);
      }
    };

    const startTime = Date.now();
    schedule(checkExit, timing.holding);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [timing, onFinished, ready]);

  // Skip handler
  useEffect(() => {
    const handleSkip = () => {
      if (skipRef.current || phase === "done" || phase === "exiting") return;
      skipRef.current = true;
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      setPhase("exiting");
      window.setTimeout(() => {
        setPhase("done");
        onFinished();
      }, 200);
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
    <div className="splash-root" data-theme={themeAttr} aria-hidden="true" role="presentation">
      <div className={`splash-container splash-phase-${phase}`}>
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
