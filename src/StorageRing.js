import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from './theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Gradient gauge arc. Pass `animate` to sweep the fill in from empty.
export default function StorageRing({ size = 240, stroke = 18, progress = 0.75, animate = false, children }) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const center = size / 2;
  const target = Math.max(0, Math.min(1, progress));
  const fill = useRef(new Animated.Value(animate ? 0 : target)).current;

  useEffect(() => {
    if (animate) {
      fill.setValue(0);
      Animated.timing(fill, {
        toValue: target,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    } else {
      fill.setValue(target);
    }
  }, [target, animate]);

  const strokeDashoffset = fill.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.mint} />
            <Stop offset="1" stopColor={colors.violet} />
          </LinearGradient>
        </Defs>
        <Circle cx={center} cy={center} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={r}
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {children}
    </View>
  );
}
