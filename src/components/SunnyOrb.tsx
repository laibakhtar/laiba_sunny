import type { OrbMode } from '../conversation/useSunny';

interface Props {
  mode?: OrbMode;
  size?: number;
  /** Decorative by default; pass a label when the orb conveys status on its own. */
  label?: string;
}

/** Sunny's illustrated guide portrait, with a light status animation. */
export function SunnyOrb({ mode = 'idle', size = 40, label }: Props) {
  return (
    <span
      className="orb"
      data-mode={mode}
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <img src="/sunny.svg" width={size} height={size} alt="" />
      {mode === 'thinking' && <span className="orb-ring" aria-hidden="true" />}
    </span>
  );
}
