import type { CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TourPlacement, TourStep } from "@/lib/tour";

export interface TourHighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TourOverlayProps {
  currentStep: TourStep;
  currentIndex: number;
  totalSteps: number;
  highlightRect: TourHighlightRect | null;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}

const PANEL_WIDTH = 360;
const PANEL_HEIGHT_ESTIMATE = 260;
const VIEWPORT_MARGIN = 16;
const PANEL_GAP = 18;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function getPanelPosition(
  highlightRect: TourHighlightRect | null,
  placement: TourPlacement,
): CSSProperties {
  if (typeof window === "undefined") {
    return {};
  }

  const width = Math.min(PANEL_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);

  if (!highlightRect || placement === "center" || window.innerWidth < 768) {
    return {
      width,
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  let left = highlightRect.left;
  let top = highlightRect.top + highlightRect.height + PANEL_GAP;

  if (placement === "top") {
    top = highlightRect.top - PANEL_HEIGHT_ESTIMATE - PANEL_GAP;
  }

  if (placement === "left") {
    left = highlightRect.left - width - PANEL_GAP;
    top = highlightRect.top + highlightRect.height / 2 - PANEL_HEIGHT_ESTIMATE / 2;
  }

  if (placement === "right") {
    left = highlightRect.left + highlightRect.width + PANEL_GAP;
    top = highlightRect.top + highlightRect.height / 2 - PANEL_HEIGHT_ESTIMATE / 2;
  }

  left = clamp(left, VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN);
  top = clamp(top, VIEWPORT_MARGIN, viewportHeight - PANEL_HEIGHT_ESTIMATE - VIEWPORT_MARGIN);

  return {
    width,
    left,
    top,
  };
}

export function TourOverlay({
  currentStep,
  currentIndex,
  totalSteps,
  highlightRect,
  onNext,
  onPrevious,
  onSkip,
}: TourOverlayProps) {
  const isLastStep = currentIndex === totalSteps - 1;
  const panelStyle = getPanelPosition(highlightRect, currentStep.placement ?? "bottom");

  return (
    <>
      <div className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-[1px]" />

      {highlightRect && (
        <div
          className="pointer-events-none fixed z-[91] rounded-2xl border-2 border-primary bg-white/5 shadow-[0_0_0_9999px_rgba(15,23,42,0.58)] transition-all duration-300"
          style={highlightRect}
        />
      )}

      <div
        className={cn(
          "fixed z-[92] rounded-2xl border bg-background p-5 shadow-2xl",
          "w-[calc(100vw-2rem)] max-w-[360px]",
        )}
        style={panelStyle}
        role="dialog"
        aria-modal="true"
        aria-label={`Tour step ${currentIndex + 1} of ${totalSteps}`}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Step {currentIndex + 1} of {totalSteps}
          </span>
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip tour
          </button>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold">{currentStep.title}</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {currentStep.description}
          </p>
          {!highlightRect && (
            <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
              The tour is waiting for this section to finish rendering. You can still continue if the page already makes sense.
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
            disabled={currentIndex === 0}
          >
            Previous
          </Button>
          <Button type="button" onClick={onNext}>
            {isLastStep ? "Finish Tour" : "Next"}
          </Button>
        </div>
      </div>
    </>
  );
}
