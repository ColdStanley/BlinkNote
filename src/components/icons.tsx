import type { SVGProps } from 'react';

const baseProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
} as const;

const createIcon = (paths: (props: SVGProps<SVGPathElement>) => JSX.Element | JSX.Element[], viewBox = '0 0 24 24') => {
  const Icon = (props: SVGProps<SVGSVGElement>) => (
    <svg viewBox={viewBox} width={24} height={24} aria-hidden="true" {...props}>
      {paths({ ...baseProps })}
    </svg>
  );
  return Icon;
};

export const IconSearch = createIcon((props) => (
  <>
    <circle cx="11" cy="11" r="6.5" {...props} />
    <line x1="15.5" y1="15.5" x2="21" y2="21" {...props} />
  </>
));

export const IconPlus = createIcon((props) => (
  <>
    <line x1="12" y1="5" x2="12" y2="19" {...props} />
    <line x1="5" y1="12" x2="19" y2="12" {...props} />
  </>
));

export const IconDownload = createIcon((props) => (
  <>
    <path d="M12 5v12" {...props} />
    <path d="M7 12l5 5 5-5" {...props} />
    <path d="M5 19h14" {...props} />
  </>
));

export const IconUpload = createIcon((props) => (
  <>
    <path d="M12 19V7" {...props} />
    <path d="M7 12l5-5 5 5" {...props} />
    <path d="M5 5h14" {...props} />
  </>
));

export const IconCalendar = createIcon((props) => (
  <>
    <rect x="3.5" y="4.5" width="17" height="16" rx="2" {...props} />
    <path d="M3.5 9.5h17" {...props} />
    <line x1="8" y1="2.5" x2="8" y2="6.5" {...props} />
    <line x1="16" y1="2.5" x2="16" y2="6.5" {...props} />
  </>
));

export const IconChevronLeft = createIcon((props) => <path d="M14 5l-6 7 6 7" {...props} />);
export const IconChevronRight = createIcon((props) => <path d="M10 5l6 7-6 7" {...props} />);

export const IconList = createIcon((props) => (
  <>
    <line x1="5" y1="7" x2="19" y2="7" {...props} />
    <line x1="5" y1="12" x2="19" y2="12" {...props} />
    <line x1="5" y1="17" x2="19" y2="17" {...props} />
  </>
));

export const IconColumns = createIcon((props) => (
  <>
    <rect x="4.5" y="5" width="6.5" height="14" rx="1.5" {...props} />
    <rect x="12.75" y="5" width="6.75" height="14" rx="1.5" {...props} />
  </>
));

export const IconLayoutGrid = createIcon((props) => (
  <>
    <rect x="4" y="4" width="7" height="7" rx="1.5" {...props} />
    <rect x="13" y="4" width="7" height="7" rx="1.5" {...props} />
    <rect x="4" y="13" width="7" height="7" rx="1.5" {...props} />
    <rect x="13" y="13" width="7" height="7" rx="1.5" {...props} />
  </>
));

export const IconTrash = createIcon((props) => (
  <>
    <path d="M6 8l1 12h10l1-12" {...props} />
    <path d="M4 8h16" {...props} />
    <path d="M10 4h4l1 2H9l1-2z" {...props} />
  </>
));

export const IconPin = createIcon((props) => (
  <>
    <path d="M12 3l5 5-2 2 4 4-2 2-4-4-2 2-5-5z" {...props} />
    <path d="M12 3v5" {...props} />
  </>
));

export const IconPinOff = createIcon((props) => (
  <>
    <path d="M6 6l12 12" {...props} />
    <path d="M12 3l5 5-1.5 1.5" {...props} />
    <path d="M9 9l-3 3 6 6" {...props} />
  </>
));

export const IconSave = createIcon((props) => (
  <>
    <path d="M5 5h14v14H5z" {...props} />
    <path d="M5 9h14" {...props} />
    <path d="M9 5v4" {...props} />
  </>
));

export const IconClock = createIcon((props) => (
  <>
    <circle cx="12" cy="12" r="8.5" {...props} />
    <path d="M12 7v5l3 2" {...props} />
  </>
));

export const IconCheckSquare = createIcon((props) => (
  <>
    <rect x="4" y="4" width="16" height="16" rx="2" {...props} />
    <path d="M9 12l2 2 4-5" {...props} />
  </>
));

export const IconDots = createIcon((props) => (
  <>
    <circle cx="12" cy="6" r="1.5" {...props} />
    <circle cx="12" cy="12" r="1.5" {...props} />
    <circle cx="12" cy="18" r="1.5" {...props} />
  </>
));

export const IconGear = createIcon((props) => (
  <>
    <circle cx="12" cy="12" r="3" {...props} />
    <path d="M19 12a7 7 0 00-.11-1.27l1.92-1.49-1.5-2.6-2.26.77A7 7 0 0014 5.11L13 3h-2l-1 2.11A7 7 0 007.95 7.4l-2.26-.77-1.5 2.6 1.92 1.49A7 7 0 005 12a7 7 0 00.11 1.27L3.19 14.76l1.5 2.6 2.26-.77A7 7 0 0010 18.89L11 21h2l1-2.11a7 7 0 002.05-2.29l2.26.77 1.5-2.6-1.92-1.49A7 7 0 0019 12z" {...props} />
  </>
));

export const IconNoteText = createIcon((props) => (
  <>
    <rect x="5.5" y="3.5" width="13" height="17" rx="1.5" {...props} />
    <line x1="8.5" y1="9" x2="15.5" y2="9" {...props} />
    <line x1="8.5" y1="13" x2="15.5" y2="13" {...props} />
    <line x1="8.5" y1="17" x2="13.5" y2="17" {...props} />
  </>
));

export const IconNoteImage = createIcon((props) => (
  <>
    <rect x="4.5" y="6.5" width="15" height="11" rx="2" {...props} />
    <path d="M7.5 14l3-3 3.5 3.5L16.5 12l2.5 3.5" {...props} />
    <circle cx="10" cy="10" r="1.2" {...props} />
  </>
));

export const IconNoteLink = createIcon((props) => (
  <>
    <path d="M9 11l-2 2a3.5 3.5 0 105 5l2-2" {...props} />
    <path d="M15 13l2-2a3.5 3.5 0 10-5-5l-2 2" {...props} />
    <path d="M10 14l4-4" {...props} />
  </>
));
