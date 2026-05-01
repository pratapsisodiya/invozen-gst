interface IconProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

const base = (size: number, sw: number, children: React.ReactNode, className = "") => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

export function CheckIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <path d="M20 6L9 17L4 12" />, className);
}

export function CheckCircleIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <circle cx="12" cy="12" r="10" />
    <path d="M9 12l2 2 4-4" />
  </>, className);
}

export function XIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <path d="M18 6L6 18" />
    <path d="M6 6l12 12" />
  </>, className);
}

export function ArrowRightIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <path d="M5 12h14" />
    <path d="M12 5l7 7-7 7" />
  </>, className);
}

export function ChevronDownIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <path d="M6 9l6 6 6-6" />, className);
}

export function ChevronRightIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <path d="M9 18l6-6-6-6" />, className);
}

export function MenuIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </>, className);
}

export function CloseIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <path d="M18 6L6 18" />
    <path d="M6 6l12 12" />
  </>, className);
}

export function FileTextIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14,2 14,8 20,8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10,9 9,9 8,9" />
  </>, className);
}

export function ReceiptIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <polyline points="4 7.5 12 3 20 7.5 20 20 4 20 4 7.5" />
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="8" y1="16" x2="12" y2="16" />
  </>, className);
}

export function CalculatorIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <line x1="8" y1="6" x2="16" y2="6" />
    <line x1="8" y1="10" x2="10" y2="10" />
    <line x1="14" y1="10" x2="16" y2="10" />
    <line x1="8" y1="14" x2="10" y2="14" />
    <line x1="14" y1="14" x2="16" y2="14" />
    <line x1="8" y1="18" x2="10" y2="18" />
    <line x1="14" y1="18" x2="16" y2="18" />
  </>, className);
}

export function ReportIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14,2 14,8 20,8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="12" y2="17" />
  </>, className);
}

export function BarChartIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <rect x="3" y="14" width="4" height="7" />
    <rect x="10" y="9" width="4" height="12" />
    <rect x="17" y="5" width="4" height="16" />
    <line x1="2" y1="21" x2="22" y2="21" />
  </>, className);
}

export function ShieldIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </>, className);
}

export function LockIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </>, className);
}

export function SmartphoneIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </>, className);
}

export function MessageCircleIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </>, className);
}

export function BellIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </>, className);
}

export function ClockIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
  </>, className);
}

export function ZapIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" />, className);
}

export function UsersIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </>, className);
}

export function BuildingIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <rect x="3" y="3" width="18" height="18" rx="1" />
    <path d="M9 22V12h6v10" />
    <path d="M9 7h1" />
    <path d="M14 7h1" />
    <path d="M9 12h1" />
    <path d="M14 12h1" />
  </>, className);
}

export function ShoppingBagIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </>, className);
}

export function WrenchIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </>, className);
}

export function TruckIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16,8 20,8 23,11 23,16 16,16 16,8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </>, className);
}

export function BriefcaseIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </>, className);
}

export function CoffeeIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
    <line x1="6" y1="1" x2="6" y2="4" />
    <line x1="10" y1="1" x2="10" y2="4" />
    <line x1="14" y1="1" x2="14" y2="4" />
  </>, className);
}

export function StarIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2" />, className);
}

export function GlobeIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </>, className);
}

export function CreditCardIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </>, className);
}

export function DownloadIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7,10 12,15 17,10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </>, className);
}

export function RefreshIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <polyline points="23,4 23,10 17,10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </>, className);
}

export function InfoIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </>, className);
}

export function ExternalLinkIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15,3 21,3 21,9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </>, className);
}

export function CloudIcon({ className = "", size = 24, strokeWidth = 2 }: IconProps) {
  return base(size, strokeWidth, <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />, className);
}

export function IndiaFlagIcon({ className = "", size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <rect width="24" height="8" fill="#FF9933" rx="2" ry="2" />
      <rect y="8" width="24" height="8" fill="#FFFFFF" />
      <rect y="16" width="24" height="8" fill="#138808" rx="2" ry="2" />
      <circle cx="12" cy="12" r="2.5" fill="none" stroke="#000080" strokeWidth="0.5" />
    </svg>
  );
}

export function WhatsAppIcon({ className = "", size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.528 5.855L.057 23.94l6.304-1.448A11.932 11.932 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 0 1-5.047-1.394l-.361-.215-3.742.98.998-3.645-.235-.375A9.798 9.798 0 0 1 2.182 12c0-5.418 4.4-9.818 9.818-9.818 5.418 0 9.818 4.4 9.818 9.818 0 5.418-4.4 9.818-9.818 9.818z" />
    </svg>
  );
}

export function RazorpayIcon({ className = "", size = 24 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6.5 3L4 21h3l1.5-10.5 4 10.5h3L13 3H6.5z" opacity="0.8"/>
      <path d="M13 3l2.5 18H19l-2.5-18H13z" opacity="0.6"/>
    </svg>
  );
}
