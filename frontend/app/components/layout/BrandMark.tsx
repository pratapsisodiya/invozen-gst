export default function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <img
      src="/favicon.svg"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className="shrink-0"
    />
  );
}