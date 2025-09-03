import type { SVGProps } from 'react';

export const Logo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M12 2L4 5V11C4 16.5 7.58 21.74 12 23C16.42 21.74 20 16.5 20 11V5L12 2Z"
      fill="currentColor"
    />
    <path
      d="M12 15.5L9.61 17.65L10.5 14.8L8 12.85L10.88 12.7L12 10L13.12 12.7L16 12.85L13.5 14.8L14.39 17.65L12 15.5Z"
      fill="hsl(var(--background))"
    />
  </svg>
);
