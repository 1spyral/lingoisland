"use client";

import { useEffect, useState, type RefObject } from "react";

export function useElementWidth(
  ref: RefObject<HTMLElement>,
  initial = 700,
) {
  const [width, setWidth] = useState(initial);

  useEffect(() => {
    let observer: ResizeObserver | null = null;
    let raf = 0;
    let attempts = 0;

    const attach = () => {
      const element = ref.current;
      if (!element) {
        if (attempts < 90) {
          attempts += 1;
          raf = requestAnimationFrame(attach);
        }
        return;
      }

      const update = () => {
        if (ref.current) {
          setWidth(ref.current.getBoundingClientRect().width);
        }
      };

      update();
      observer = new ResizeObserver(update);
      observer.observe(element);
    };

    attach();

    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, [ref]);

  return width;
}
