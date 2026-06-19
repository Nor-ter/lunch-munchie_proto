import { type ReactNode, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";

function usePrevious<T>(value: T): T | undefined {
  const state = useRef({ curr: value, prev: undefined as T | undefined });
  if (state.current.curr !== value) {
    state.current = { curr: value, prev: state.current.curr };
  }
  return state.current.prev;
}

function getSlideDirection(from: string | undefined, to: string): number {
  if (from === "/" && to === "/lunchie/settings") return 1;
  if (from === "/lunchie/settings" && to === "/") return -1;
  return 0;
}

const slideEase = [0.32, 0.72, 0, 1] as const;

const variants = {
  initial: (direction: number) => ({
    x: direction > 0 ? "100%" : "-28%",
    zIndex: 2,
  }),
  animate: {
    x: 0,
    zIndex: 2,
    transition: { type: "tween" as const, ease: slideEase, duration: 0.42 },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-28%" : "100%",
    zIndex: 1,
    transition: { type: "tween" as const, ease: slideEase, duration: 0.42 },
  }),
};

type SlideTransitionRoutesProps = {
  children: ReactNode;
};

export default function SlideTransitionRoutes({ children }: SlideTransitionRoutesProps) {
  const [location] = useLocation();
  const previousLocation = usePrevious(location);
  const direction = getSlideDirection(previousLocation, location);
  const slide = direction !== 0;

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={location}
          custom={direction}
          variants={variants}
          initial={slide ? "initial" : false}
          animate="animate"
          exit={slide ? "exit" : undefined}
          className="min-h-dvh w-full"
          style={{
            position: slide ? "absolute" : "relative",
            inset: slide ? 0 : undefined,
            background: "#FCF4EE",
            willChange: slide ? "transform" : undefined,
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
