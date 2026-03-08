interface ScrollFadeProps {
  className?: string;
}

export function ScrollFade({ className = "" }: ScrollFadeProps) {
  return (
    <div
      className={`absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-card to-transparent
                  pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}
