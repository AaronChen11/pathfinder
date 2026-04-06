import { useEffect, useState } from "react";

export function useScroll(containerRef, threshold = 10) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const container = containerRef?.current;

    function onScroll() {
      const nextScrollTop = container ? container.scrollTop : window.scrollY;
      setScrolled(nextScrollTop > threshold);
    }

    onScroll();

    if (container) {
      container.addEventListener("scroll", onScroll);
      return () => container.removeEventListener("scroll", onScroll);
    }

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [containerRef, threshold]);

  return scrolled;
}
