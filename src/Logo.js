import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors } from './theme';

// Xe Cleaner mark: a gauge ring with a sparkle at its core.
export default function Logo({ size = 34 }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.mint} />
          <Stop offset="1" stopColor={colors.violet} />
        </LinearGradient>
      </Defs>
      <Circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="url(#logoGrad)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${c * 0.75} ${c}`}
        transform="rotate(-90 50 50)"
      />
      <Path
        d="M50 18 C55 42 58 45 82 50 C58 55 55 58 50 82 C45 58 42 55 18 50 C42 45 45 42 50 18 Z"
        fill="url(#logoGrad)"
      />
    </Svg>
  );
}
