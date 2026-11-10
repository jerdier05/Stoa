// Iconos de trazo fino, sin librerías externas.
const Icon = ({ children, size = 18, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
)

export const IconToday = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
)
export const IconWeek = (p) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Icon>
)
export const IconGym = (p) => (
  <Icon {...p}>
    <path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" />
  </Icon>
)
export const IconFood = (p) => (
  <Icon {...p}>
    <path d="M12 21c-4 0-7-3.2-7-7.6C5 9.2 7.8 6.6 12 7.6c4.2-1 7 1.6 7 5.8 0 4.4-3 7.6-7 7.6z" />
    <path d="M12 7.6c0-2 .8-3.8 2.8-4.6" />
  </Icon>
)
export const IconMoney = (p) => (
  <Icon {...p}>
    <rect x="3" y="6" width="18" height="14" rx="3" />
    <path d="M3 10.5h18M16 15h2" />
  </Icon>
)
export const IconUser = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </Icon>
)
export const IconPlus = (p) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)
export const IconX = (p) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
)
export const IconTrash = (p) => (
  <Icon {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Icon>
)
export const IconCopy = (p) => (
  <Icon {...p}>
    <rect x="8" y="8" width="12" height="12" rx="2.5" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </Icon>
)
export const IconLeft = (p) => (
  <Icon {...p}>
    <path d="M15 6l-6 6 6 6" />
  </Icon>
)
export const IconRight = (p) => (
  <Icon {...p}>
    <path d="M9 6l6 6-6 6" />
  </Icon>
)
export const IconCheck = (p) => (
  <Icon {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
)
export const IconFlame = (p) => (
  <Icon {...p}>
    <path d="M12 3c.8 3.6 6 5.6 6 11a6 6 0 0 1-12 0c0-2.8 1.6-4.2 2.2-6.4 1.6 1 2.6 2.6 2.6 4.4 1.4-1.4 1.6-5.4 1.2-9z" />
  </Icon>
)
export const IconEye = (p) => (
  <Icon {...p}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
)
