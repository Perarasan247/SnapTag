import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const makeStyles = (theme) => StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipUnselected: {
    backgroundColor: theme.surface,
    borderColor: theme.borderStrong,
  },
  chipSelected: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  chipUnselectedPressed: { backgroundColor: theme.card },
  chipSelectedPressed: { backgroundColor: theme.accentPressed },
  text: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'System',
  },
  textUnselected: { color: theme.textSecondary },
  textSelected: { color: '#FFFFFF' },
});

export default function TagChip({ label, isSelected, onPress }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        isSelected ? styles.chipSelected : styles.chipUnselected,
        pressed && (isSelected ? styles.chipSelectedPressed : styles.chipUnselectedPressed),
      ]}
    >
      <Text style={[styles.text, isSelected ? styles.textSelected : styles.textUnselected]}>
        {label}
      </Text>
    </Pressable>
  );
}
