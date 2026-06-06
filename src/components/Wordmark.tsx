interface WordmarkProps {
  className?: string;
}

export const Wordmark = ({ className }: WordmarkProps) => (
  <span className={className}>
    <span className="font-semibold text-foreground">Nevvoh</span>
  </span>
);
