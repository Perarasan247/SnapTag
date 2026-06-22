import { StyleSheet, View, Text, TouchableOpacity, Switch, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: theme.navBg,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1 },

  section: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 },
  sectionLabel: {
    color: theme.textSecondary, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 8,
  },

  // User info card
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: theme.surface, borderRadius: theme.borderRadius.md,
    padding: 16, borderWidth: 1, borderColor: theme.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  userAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: theme.navBg, justifyContent: 'center', alignItems: 'center',
  },
  userAvatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  userName: { color: theme.textPrimary, fontSize: 15, fontWeight: '700' },
  userEmail: { color: theme.textSecondary, fontSize: 13, marginTop: 2 },
  userRole: {
    alignSelf: 'flex-start', marginTop: 4,
    backgroundColor: theme.accentSubtle, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  userRoleText: { color: theme.accent, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  // Setting rows
  settingCard: {
    backgroundColor: theme.surface, borderRadius: theme.borderRadius.md,
    borderWidth: 1, borderColor: theme.border,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 15,
  },
  settingRowBorder: { borderTopWidth: 1, borderTopColor: theme.border },
  settingIconWrap: {
    width: 34, height: 34, borderRadius: theme.borderRadius.sm,
    justifyContent: 'center', alignItems: 'center',
  },
  settingLabel: { flex: 1, color: theme.textPrimary, fontSize: 15, fontWeight: '600' },
  settingSub: { color: theme.textSecondary, fontSize: 12, marginTop: 1 },

  // Logout
  logoutSection: { paddingHorizontal: 16, paddingTop: 16 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.errorSubtle, borderRadius: theme.borderRadius.md,
    paddingVertical: 14, borderWidth: 1, borderColor: theme.error + '30',
  },
  logoutText: { color: theme.error, fontSize: 15, fontWeight: '700' },

  version: { textAlign: 'center', color: theme.textMuted, fontSize: 12, marginTop: 24 },
});

export default function SettingsScreen({ navigation }) {
  const { theme, isDark, toggleDark } = useTheme();
  const { session, logout } = useAuth();
  const styles = makeStyles(theme);

  const initials = session?.name
    ? session.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : session?.email?.[0]?.toUpperCase() || '?';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={theme.navBg} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      {/* User info */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{session?.name || 'User'}</Text>
            <Text style={styles.userEmail}>{session?.email || ''}</Text>
            {session?.role && (
              <View style={styles.userRole}>
                <Text style={styles.userRoleText}>{session.role}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIconWrap, { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF' }]}>
              <MaterialCommunityIcons
                name={isDark ? 'weather-night' : 'weather-sunny'}
                size={18}
                color={theme.accent}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Text style={styles.settingSub}>{isDark ? 'Dark corporate theme' : 'Light corporate theme'}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleDark}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </View>

      {/* Sign out */}
      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <MaterialCommunityIcons name="logout" size={18} color={theme.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>SnapTag v1.0</Text>
    </SafeAreaView>
  );
}
