interface WordmarkProps {
  className?: string;
}

export const Wordmark = ({ className }: WordmarkProps) => (
  <span className={className}>
    <span className="font-bold">flow</span>
    <span className="font-normal text-[#7F77DD]">ly</span>
  </span>
);
