interface WordmarkProps {
  className?: string;
}

export const Wordmark = ({ className }: WordmarkProps) => (
  <span className={className}>
    <span className="font-semibold text-foreground">flow</span>
    <span className="font-normal text-primary dark:text-flowly-soft">ly</span>
  </span>
);
