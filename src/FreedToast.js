import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radius } from './theme';

export default function FreedToast({ toast, onHide }) {
  const y = useRef(new Animated.Value(-120)).current;
  useEffect(() => {
    if (!toast) return;
    y.setValue(-120);
    Animated.spring(y, { toValue: 0, useNativeDriver: true, friction: 7, tension: 60 }).start();
    const t = setTimeout(() => {
      Animated.timing(y, { toValue: -120, duration: 260, useNativeDriver: true }).start(() => onHide && onHide());
    }, 2300);
    return () => clearTimeout(t);
  }, [toast ? toast.id : null]);

  if (!toast) return null;
  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateY: y }] }]} pointerEvents="none">
      <LinearGradient colors={[colors.mint, colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.toast}>
        <Text style={styles.text}>{toast.text}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 58, left: 20, right: 20, zIndex: 200, alignItems: 'center' },
  toast: {
    paddingVertical: 12, paddingHorizontal: 24, borderRadius: radius.pill,
    shadowColor: colors.mint, shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  },
  text: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#06140F' },
});
