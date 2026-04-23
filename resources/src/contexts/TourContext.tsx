import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TourOverlay, type TourHighlightRect } from "@/components/tour/TourOverlay";
import { getTourSteps, getTourStorageKey } from "@/lib/tour";
import { useAuth } from "@/contexts/AuthContext";

interface TourContextValue {
  isTourOpen: boolean;
  startTour: () => void;
  restartTour: () => void;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

function getTargetRect(targetSelector: string): TourHighlightRect | null {
  const target = document.querySelector<HTMLElement>(targetSelector);

  if (!target) {
    return null;
  }

  const rect = target.getBoundingClientRect();

  if (rect.width === 0 && rect.height === 0) {
    return null;
  }

  if (
    rect.bottom <= 0
    || rect.right <= 0
    || rect.top >= window.innerHeight
    || rect.left >= window.innerWidth
  ) {
    return null;
  }

  const padding = 8;

  return {
    top: Math.max(rect.top - padding, 8),
    left: Math.max(rect.left - padding, 8),
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

function ensureTargetInView(targetSelector: string) {
  const target = document.querySelector<HTMLElement>(targetSelector);

  if (!target) {
    return;
  }

  const rect = target.getBoundingClientRect();
  const outsideViewport =
    rect.top < 80
    || rect.bottom > window.innerHeight - 80
    || rect.left < 16
    || rect.right > window.innerWidth - 16;

  if (outsideViewport) {
    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }
}

export function TourProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isTourOpen, setIsTourOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<TourHighlightRect | null>(null);

  const steps = useMemo(() => getTourSteps(user), [user]);
  const storageKey = useMemo(() => getTourStorageKey(user), [user]);
  const currentStep = steps[currentStepIndex] ?? null;

  const markTourComplete = useCallback(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, "true");
    }
  }, [storageKey]);

  const closeTour = useCallback((markComplete: boolean) => {
    if (markComplete) {
      markTourComplete();
    }

    setIsTourOpen(false);
    setCurrentStepIndex(0);
    setHighlightRect(null);
  }, [markTourComplete]);

  const startTour = useCallback(() => {
    if (steps.length === 0) {
      return;
    }

    setCurrentStepIndex(0);
    setIsTourOpen(true);
  }, [steps.length]);

  const restartTour = useCallback(() => {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }

    setCurrentStepIndex(0);
    setHighlightRect(null);
    setIsTourOpen(true);
  }, [storageKey]);

  const goToNextStep = useCallback(() => {
    if (currentStepIndex >= steps.length - 1) {
      closeTour(true);
      return;
    }

    setCurrentStepIndex((currentIndex) => currentIndex + 1);
  }, [closeTour, currentStepIndex, steps.length]);

  const goToPreviousStep = useCallback(() => {
    setCurrentStepIndex((currentIndex) => Math.max(currentIndex - 1, 0));
  }, []);

  useEffect(() => {
    if (!user) {
      setIsTourOpen(false);
      setCurrentStepIndex(0);
      setHighlightRect(null);
    }
  }, [user]);

  useEffect(() => {
    if (isLoading || !user || location.pathname === "/auth" || steps.length === 0 || isTourOpen) {
      return;
    }

    if (storageKey && localStorage.getItem(storageKey) === "true") {
      return;
    }

    const timer = window.setTimeout(() => {
      setCurrentStepIndex(0);
      setIsTourOpen(true);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [isLoading, isTourOpen, location.pathname, steps.length, storageKey, user]);

  useEffect(() => {
    if (!isTourOpen || !currentStep) {
      return;
    }

    if (location.pathname !== currentStep.path) {
      navigate(currentStep.path);
    }
  }, [currentStep, isTourOpen, location.pathname, navigate]);

  useEffect(() => {
    if (!isTourOpen || !currentStep || location.pathname !== currentStep.path) {
      setHighlightRect(null);
      return;
    }

    let cancelled = false;
    let retryCount = 0;
    let retryTimer: number | null = null;

    const syncHighlight = () => {
      if (cancelled) {
        return;
      }

      const nextRect = getTargetRect(currentStep.targetSelector);
      setHighlightRect(nextRect);
    };

    const syncWithRetry = () => {
      if (cancelled) {
        return;
      }

      const targetExists = document.querySelector(currentStep.targetSelector);

      if (!targetExists && retryCount < 12) {
        retryCount += 1;
        retryTimer = window.setTimeout(syncWithRetry, 150);
        return;
      }

      ensureTargetInView(currentStep.targetSelector);
      window.requestAnimationFrame(syncHighlight);
    };

    const handleViewportChange = () => {
      syncHighlight();
    };

    syncWithRetry();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      cancelled = true;
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
      }
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [currentStep, isTourOpen, location.pathname]);

  return (
    <TourContext.Provider value={{ isTourOpen, startTour, restartTour }}>
      {children}
      {isTourOpen && currentStep && (
        <TourOverlay
          currentStep={currentStep}
          currentIndex={currentStepIndex}
          totalSteps={steps.length}
          highlightRect={highlightRect}
          onNext={goToNextStep}
          onPrevious={goToPreviousStep}
          onSkip={() => closeTour(true)}
        />
      )}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);

  if (context === undefined) {
    throw new Error("useTour must be used within a TourProvider");
  }

  return context;
}
