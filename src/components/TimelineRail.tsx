import { useCallback, useEffect, useRef } from "react";
import { useDragScroll } from "../hooks/useDragScroll";

export interface TimelineRailItem {
  id: string;
  topLabel: string;
  temperatureLabel: string;
  dimmed: boolean;
  icon: React.ReactNode;
}

interface TimelineRailProps {
  title: string;
  items: TimelineRailItem[];
  selectedId: string;
  indicatorId?: string;
  onSelectionChange: (id: string) => void;
  onUserSelect?: (id: string) => void;
  visibleCount: number;
  anchorIndex: number;
  widthClassName: string;
  recenterToken: number;
  textSize: "hour" | "day";
}

export function TimelineRail({
  title,
  items,
  selectedId,
  indicatorId,
  onSelectionChange,
  onUserSelect,
  visibleCount,
  anchorIndex,
  widthClassName,
  recenterToken,
  textSize,
}: TimelineRailProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const hasInitialAlignedRef = useRef(false);

  useDragScroll(containerRef);

  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.id === selectedId),
  );

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior) => {
      const container = containerRef.current;
      if (!container) return;

      const itemWidth = container.clientWidth / visibleCount;
      const target = index * itemWidth - anchorIndex * itemWidth;
      const clamped = Math.max(0, Math.min(target, container.scrollWidth - container.clientWidth));

      if (Math.abs(container.scrollLeft - clamped) < 1) return;

      container.scrollTo({
        left: clamped,
        behavior,
      });
    },
    [anchorIndex, visibleCount],
  );

  useEffect(() => {
    if (hasInitialAlignedRef.current) return;
    scrollToIndex(selectedIndex, "auto");
    hasInitialAlignedRef.current = true;
  }, [scrollToIndex, selectedIndex]);

  useEffect(() => {
    if (!hasInitialAlignedRef.current) return;
    scrollToIndex(selectedIndex, "auto");
  }, [recenterToken, scrollToIndex, selectedIndex]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onResize = () => {
      scrollToIndex(selectedIndex, "auto");
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [scrollToIndex, selectedIndex]);

  const syncSelectionFromScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || items.length === 0) return;

    const itemWidth = container.clientWidth / visibleCount;
    const raw = (container.scrollLeft + anchorIndex * itemWidth) / itemWidth;
    const nextIndex = Math.min(items.length - 1, Math.max(0, Math.round(raw)));
    const nextId = items[nextIndex]?.id;

    if (nextId && nextId !== selectedId) {
      onSelectionChange(nextId);
    }
  }, [anchorIndex, items, onSelectionChange, selectedId, visibleCount]);

  const onScroll = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = window.requestAnimationFrame(() => {
      syncSelectionFromScroll();
      frameRef.current = null;
    });
  }, [syncSelectionFromScroll]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    },
    [],
  );

  return (
    <div className={`timeline-group ${widthClassName}`} aria-label={title}>
      <div className="timeline-viewport" ref={containerRef} onScroll={onScroll}>
        {items.map((item, index) => {
          const selected = item.id === selectedId;

          return (
            <button
              key={item.id}
              className={`timeline-item ${item.dimmed ? "is-dimmed" : ""} ${selected ? "is-selected" : ""}`}
              style={{ ["--visible-count" as string]: visibleCount }}
              onClick={() => {
                onSelectionChange(item.id);
                onUserSelect?.(item.id);
                scrollToIndex(index, "smooth");
              }}
              type="button"
            >
              <span className="timeline-indicator-slot" aria-hidden="true">
                <span className={`timeline-current-dot ${item.id === indicatorId ? "is-visible" : ""}`} />
              </span>
              <span className={`timeline-top ${textSize === "hour" ? "hour" : "day"}`}>{item.topLabel}</span>
              <span className={`timeline-icon ${textSize}`}>{item.icon}</span>
              <span className={`timeline-temp ${textSize === "hour" ? "hour" : "day"}`}>{item.temperatureLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
