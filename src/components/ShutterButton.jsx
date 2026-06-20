import { useRef } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, Animated } from 'react-native';

export default function ShutterButton({ isRecording, onPress, onLongPress, onPressOut }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, { toValue: 0.93, duration: 100, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    if (onPressOut) onPressOut();
  };

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
    >
      <Animated.View style={[styles.outerRing, { transform: [{ scale: scaleAnim }] }]}>
        <View style={[styles.innerCircle, isRecording && styles.innerCircleRecording]} />
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  outerRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
  },
  innerCircleRecording: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#EF4444',
  },
});
