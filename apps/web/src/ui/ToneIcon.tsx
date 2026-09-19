import type { Tone } from './tone';
import {
  AlertIcon,
  CheckIcon,
  CrossIcon,
  DotIcon,
  InfoIcon,
  StarIcon,
} from './icons';

/** One glyph per tone, so a tone is readable without colour. */
export function ToneIcon({ tone, size = 12 }: { tone: Tone; size?: number }) {
  switch (tone) {
    case 'ok':
      return <CheckIcon size={size} />;
    case 'warn':
      return <AlertIcon size={size} />;
    case 'danger':
      return <CrossIcon size={size} />;
    case 'info':
      return <InfoIcon size={size} />;
    case 'accent':
      return <StarIcon size={size} />;
    case 'neutral':
      return <DotIcon size={size} />;
  }
}
