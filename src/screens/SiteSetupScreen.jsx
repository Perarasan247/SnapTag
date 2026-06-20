import { useState } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  ScrollView, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { CHECKLIST_TEMPLATES } from '../constants/checklists';
import { assignTemplates } from '../services/checklistService';
import { updateFileChecklists } from '../services/fileService';

const TEMPLATE_COLORS = {
  retraining: { color: '#6366F1', bg: '#1E1B4B' },
  electrical:  { color: '#F59E0B', bg: '#2D1F00' },
  plumbing:    { color: '#06B6D4', bg: '#0A2030' },
  structural:  { color: '#EC4899', bg: '#2D0A1E' },
  safety:      { color: '#10B981', bg: '#052E1C' },
};

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6,
  },
  headerIcon: {
    width: 46, height: 46, borderRadius: theme.borderRadius.md,
    backgroundColor: theme.accentSubtle, justifyContent: 'center', alignItems: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: '700' },
  headerSub: { color: theme.textSecondary, fontSize: 13, marginTop: 2 },

  hint: {
    color: theme.textMuted, fontSize: 13, lineHeight: 19,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },

  scroll: { padding: 20, paddingBottom: 24 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  card: {
    width: '47%', backgroundColor: theme.surface,
    borderRadius: theme.borderRadius.lg, borderWidth: 2,
    padding: 18, gap: 10, position: 'relative',
  },
  cardIcon: {
    width: 52, height: 52, borderRadius: theme.borderRadius.md,
    justifyContent: 'center', alignItems: 'center',
  },
  cardName: { fontSize: 15, fontWeight: '700' },
  cardCount: { color: theme.textMuted, fontSize: 12 },
  checkBadge: {
    position: 'absolute', top: 10, right: 10,
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
  },

  selectedSummary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 20, padding: 14,
    backgroundColor: theme.accentSubtle, borderRadius: theme.borderRadius.md,
    borderWidth: 1, borderColor: theme.accent + '44',
  },
  selectedSummaryText: { color: theme.accent, fontSize: 14, fontWeight: '600' },

  footer: {
    flexDirection: 'row', gap: 10, padding: 20,
    borderTopWidth: 1, borderTopColor: theme.border,
  },
  skipBtn: {
    flex: 1, height: 50, borderRadius: theme.borderRadius.sm,
    borderWidth: 1, borderColor: theme.border,
    justifyContent: 'center', alignItems: 'center',
  },
  skipText: { color: theme.textSecondary, fontSize: 14, fontWeight: '600' },
  continueBtn: {
    flex: 2, height: 50, borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.accent,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  continueBtnFaded: { opacity: 0.7 },
  continueText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default function SiteSetupScreen({ navigation, route }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { file } = route.params;
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  const toggle = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      if (selected.length > 0) {
        await assignTemplates(file.id, selected);
        await updateFileChecklists(file.id, selected); // persist to files table
        file.checklistTemplateIds = selected;
      }
    } catch (e) {
      console.error('Failed to assign templates:', e);
    }
    setSaving(false);
    navigation.replace('InspectionHub', { file });
  };

  const handleSkip = () => {
    navigation.replace('InspectionHub', { file });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.background} />

      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <MaterialCommunityIcons name="folder-plus-outline" size={22} color={theme.accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{file.name}</Text>
          <Text style={styles.headerSub}>Select inspection checklists</Text>
        </View>
      </View>

      <Text style={styles.hint}>
        Choose one or more checklists for this site. You can add more later.
      </Text>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {CHECKLIST_TEMPLATES.map((t) => {
            const c = TEMPLATE_COLORS[t.id] || { color: theme.accent, bg: theme.accentSubtle };
            const isSelected = selected.includes(t.id);
            return (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.card,
                  { borderColor: isSelected ? c.color : c.color + '30' },
                  isSelected && { backgroundColor: c.bg },
                ]}
                onPress={() => toggle(t.id)}
                activeOpacity={0.75}
              >
                <View style={[styles.cardIcon, { backgroundColor: isSelected ? c.color + '30' : c.bg }]}>
                  <MaterialCommunityIcons name={t.icon} size={26} color={c.color} />
                </View>
                <Text style={[styles.cardName, { color: c.color }]}>{t.name}</Text>
                <Text style={styles.cardCount}>{t.items.length} items</Text>
                {isSelected && (
                  <View style={[styles.checkBadge, { backgroundColor: c.color }]}>
                    <MaterialCommunityIcons name="check" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {selected.length > 0 && (
          <View style={styles.selectedSummary}>
            <MaterialCommunityIcons name="format-list-checks" size={16} color={theme.accent} />
            <Text style={styles.selectedSummaryText}>
              {selected.length} checklist{selected.length !== 1 ? 's' : ''} selected
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} disabled={saving}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.continueBtn, selected.length === 0 && styles.continueBtnFaded]}
          onPress={handleContinue}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.continueText}>
                {selected.length > 0 ? 'Add & Continue' : 'Continue'}
              </Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
