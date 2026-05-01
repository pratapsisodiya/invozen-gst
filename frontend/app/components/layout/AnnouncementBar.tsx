export default function AnnouncementBar() {
  return (
    <div
      className="w-full py-2.5 px-4 text-center text-xs font-semibold"
      style={{
        background: "linear-gradient(90deg, #0c7a71 0%, #0d9488 50%, #059669 100%)",
        color: "white",
      }}
    >
      <div className="container-page flex items-center justify-center gap-3 flex-wrap">
        <span className="opacity-90">
          🇮🇳 Built for GST-registered Indian businesses — GSTN-compliant invoicing with zero setup
        </span>
        <a
          href="#pricing"
          className="inline-flex items-center gap-1 font-extrabold underline-offset-2 hover:underline opacity-100 shrink-0"
        >
          Start free trial →
        </a>
      </div>
    </div>
  );
}
