type StepIndicatorProps = {
  step: 1 | 2 | 3 | 4;
};

const STEPS = [1, 2, 3, 4] as const;

export function StepIndicator({ step }: StepIndicatorProps) {
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={4}
      aria-valuenow={step}
      aria-label={`Step ${step} of 4`}
      className="flex items-center justify-center gap-2"
    >
      {STEPS.map((n) => {
        const isCurrent = n === step;
        const isCompleted = n < step;
        const size = isCurrent ? 10 : 8;
        let background: string;
        if (isCurrent) {
          background = "#3EE98C"; // accent-hero
        } else if (isCompleted) {
          background = "rgba(62, 233, 140, 0.45)"; // accent-hero-dim
        } else {
          background = "rgba(255, 255, 255, 0.12)"; // border-subtle
        }
        return (
          <span
            key={n}
            aria-hidden="true"
            className="rounded-full"
            style={{
              width: size,
              height: size,
              background,
              transition:
                "background-color 200ms ease, width 200ms ease, height 200ms ease",
            }}
          />
        );
      })}
    </div>
  );
}
