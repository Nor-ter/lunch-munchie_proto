import { type ReactNode, type ReactElement, cloneElement, isValidElement, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";

function usePrevious<T>(value: T): T | undefined {
  const state = useRef({ curr: value, prev: undefined as T | undefined });
  if (state.current.curr !== value) {
    state.current = { curr: value, prev: state.current.curr };
  }
  return state.current.prev;
}

// 슬라이드 방향: +1 = 앞으로(오른쪽에서 들어옴), -1 = 뒤로(왼쪽에서 들어옴), 0 = 전환 없음
function getSlideDirection(from: string | undefined, to: string): number {
  if (from === "/" && to === "/lunchie/settings") return 1;
  if (from === "/lunchie/settings" && to === "/") return -1;
  if (from === "/lunchie/settings" && to === "/session/lobby") return 1;
  if (from === "/session/lobby" && to === "/lunchie/settings") return -1;
  if (from === "/session/lobby" && to === "/lunchie/swipe") return 1;
  if (from === "/lunchie/swipe" && to === "/session/lobby") return -1;
  return 0;
}

const slideEase = [0.32, 0.72, 0, 1] as const;
const DURATION = 0.42;

// 들어오는 면은 화면 밖에서 0으로, 나가는 면은 반대쪽으로 살짝(패럴랙스) 밀려나며 동시에 진행된다.
// 핵심: enter/exit를 항상 정의하고 방향은 AnimatePresence의 custom(현재 전환 방향)으로 구동한다.
//  - 이렇게 해야 "직전 화면이 슬라이드 없이 마운트됐다는 이유로 exit가 빠지는" 버그가 사라진다.
// direction===0 (Lunchie 체인 밖)은 이동 없이 즉시 교체 → 기존 동작 유지.
const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : direction < 0 ? "-100%" : 0,
    zIndex: 2,
  }),
  center: (direction: number) => ({
    x: 0,
    zIndex: 2,
    transition: { type: "tween" as const, ease: slideEase, duration: direction === 0 ? 0 : DURATION },
  }),
  exit: (direction: number) => ({
    x: direction > 0 ? "-30%" : direction < 0 ? "100%" : 0,
    zIndex: 1,
    transition: { type: "tween" as const, ease: slideEase, duration: direction === 0 ? 0 : DURATION },
  }),
};

type SlideTransitionRoutesProps = {
  children: ReactNode;
};

export default function SlideTransitionRoutes({ children }: SlideTransitionRoutesProps) {
  const [location] = useLocation();
  const previousLocation = usePrevious(location);
  const direction = getSlideDirection(previousLocation, location);

  // 각 레이어의 <Switch>를 자기 레이어의 location으로 고정한다.
  // 그래야 나가는(이전) 레이어가 현재 location을 따라가 새 페이지를 보여주는
  // wouter+AnimatePresence 특유의 "두 레이어가 같은 화면" 문제가 생기지 않는다.
  const frozen = isValidElement(children)
    ? cloneElement(children as ReactElement<{ location?: string }>, { location })
    : children;

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={location}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          className="w-full"
          style={{
            position: "absolute",
            inset: 0,
            background: "#FCF4EE",
            willChange: "transform",
          }}
        >
          {/* 스크롤은 여기 안쪽 레이어에서만 일어나야 한다.
              motion.div(transform 보유)가 곧 스크롤 컨테이너이면, 그 안의
              position:fixed 요소(FAB 등)의 containing block이 이 motion.div가 되어
              뷰포트에 고정되지 못하고 페이지 스크롤을 따라 같이 움직여버린다. */}
          <div style={{ position: "absolute", inset: 0, overflowY: "auto" }}>
            {frozen}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
