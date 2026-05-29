import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text } from 'react-native';

// Counts up from 0 to `value` and renders format(current) each frame.
export default function AnimatedNumber({ value, format = (n) => String(Math.round(n)), duration = 1000, style }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(() => format(0));

  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setDisplay(format(v)));
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: value || 0,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [value]);

  return <Text style={style}>{display}</Text>;
}
