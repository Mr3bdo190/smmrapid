import type { SVGProps } from 'react';

/**
 * Inline icons — no icon dependency, no font, no network request.
 *
 * All of them draw with `currentColor`, are `aria-hidden` by default (the surrounding text is the
 * accessible name) and are 16px unless told otherwise. Nothing here hard-codes left or right:
 * directional icons are mirrored by the caller with an `rtl:` rotation, which keeps the component
 * tree direction-agnostic.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 16, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const CheckIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M2.75 8.5 6 11.75 13.25 4.5" />
  </Icon>
);

export const AlertIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M8 2.5v6.5" />
    <circle cx="8" cy="12.6" r="0.9" fill="currentColor" stroke="none" />
  </Icon>
);

export const CrossIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
  </Icon>
);

export const InfoIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="8" cy="8" r="6.25" />
    <path d="M8 7.4v4" />
    <circle cx="8" cy="5" r="0.9" fill="currentColor" stroke="none" />
  </Icon>
);

export const DotIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="8" cy="8" r="3" fill="currentColor" stroke="none" />
  </Icon>
);

export const StarIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M8 2.5l1.7 3.55 3.8.5-2.8 2.65.7 3.8L8 11.2l-3.4 1.8.7-3.8L2.5 6.55l3.8-.5z" />
  </Icon>
);

export const ArrowUpIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M8 12.75V3.5" />
    <path d="M4.25 7.25 8 3.5l3.75 3.75" />
  </Icon>
);

export const ArrowDownIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M8 3.25v9.25" />
    <path d="M4.25 8.75 8 12.5l3.75-3.75" />
  </Icon>
);

export const ChevronIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 3.5 10.5 8 6 12.5" />
  </Icon>
);

export const InboxIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M2.5 9.5h3l1 1.75h3l1-1.75h3" />
    <path d="M2.5 9.5 4.25 3h7.5L13.5 9.5v3h-11z" />
  </Icon>
);

export const CopyIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="5.75" y="5.75" width="7.5" height="7.5" rx="1.5" />
    <path d="M10.25 3.5H3.5a1.25 1.25 0 0 0-1.25 1.25v6.75" />
  </Icon>
);
