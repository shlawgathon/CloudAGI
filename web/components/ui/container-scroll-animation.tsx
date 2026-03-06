"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue
} from "framer-motion";

export function ContainerScroll({
  titleComponent,
  children
}: {
  titleComponent: ReactNode;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const rotate = useTransform(scrollYProgress, [0, 1], [16, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], isMobile ? [0.86, 1] : [0.94, 1]);
  const translate = useTransform(scrollYProgress, [0, 1], [0, -90]);

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-[46rem] items-center justify-center px-2 py-12 md:min-h-[60rem] md:px-6 md:py-20"
    >
      <div
        className="relative w-full py-6 md:py-16"
        style={{
          perspective: "1000px"
        }}
      >
        <Header translate={translate} titleComponent={titleComponent} />
        <Card rotate={rotate} scale={scale}>
          {children}
        </Card>
      </div>
    </div>
  );
}

function Header({
  translate,
  titleComponent
}: {
  translate: MotionValue<number>;
  titleComponent: ReactNode;
}) {
  return (
    <motion.div
      style={{ translateY: translate }}
      className="mx-auto max-w-5xl text-center"
    >
      {titleComponent}
    </motion.div>
  );
}

function Card({
  rotate,
  scale,
  children
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  children: ReactNode;
}) {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        boxShadow:
          "0 0 0 rgba(0,0,0,0.3), 0 18px 48px rgba(0,0,0,0.36), 0 48px 120px rgba(0,0,0,0.35)"
      }}
      className="mx-auto -mt-8 h-[24rem] w-full max-w-6xl rounded-[2rem] border border-white/[0.12] bg-[linear-gradient(180deg,rgba(19,27,44,0.95),rgba(8,12,22,0.98))] p-3 md:-mt-12 md:h-[36rem] md:p-5"
    >
      <div className="h-full w-full overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#07111d] md:rounded-[1.6rem]">
        {children}
      </div>
    </motion.div>
  );
}
