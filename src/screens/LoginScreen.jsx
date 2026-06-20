import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { login as authLogin, register as authRegister } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';

const makeStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  brand: { alignItems: 'center', marginBottom: 32 },
  brandIcon: {
    width: 60, height: 60,
    borderRadius: 18,
    backgroundColor: theme.accentSubtle,
    borderWidth: 1,
    borderColor: theme.accent + '40',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  brandName: {
    color: theme.textPrimary,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  brandSub: {
    color: theme.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  // Tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.borderRadius.sm,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm - 2,
  },
  tabActive: { backgroundColor: theme.accent },
  tabText: { color: theme.textSecondary, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  // Form
  form: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.borderRadius.lg,
    padding: 20,
  },
  fieldGroup: { marginBottom: 18 },
  fieldLabel: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingVertical: 10,
    paddingHorizontal: 2,
    fontSize: 15,
    color: theme.textPrimary,
  },
  inputError: { borderBottomColor: theme.error },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 36 },
  eyeBtn: { position: 'absolute', right: 2, top: 8 },
  matchHint: { color: theme.error, fontSize: 11, marginTop: 5 },
  matchOkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  matchOk: { color: theme.success, fontSize: 11 },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.errorSubtle,
    padding: 10,
    borderRadius: theme.borderRadius.sm,
    marginBottom: 14,
  },
  errorText: { color: theme.error, fontSize: 13, flex: 1 },
  submitBtn: {
    height: 48,
    backgroundColor: theme.accent,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  footer: {
    textAlign: 'center',
    color: theme.textMuted,
    fontSize: 12,
    marginTop: 28,
  },
});

export default function LoginScreen() {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { login } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  // Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Refs for next-field focus
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const isRegister = mode === 'register';

  const switchMode = (next) => {
    setError('');
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setMode(next);
  };

  const validate = () => {
    if (!email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email';
    if (!password) return 'Password is required';
    if (isRegister) {
      if (!name.trim()) return 'Name is required';
      if (password.length < 8) return 'Password must be at least 8 characters';
      if (password !== confirmPassword) return 'Passwords do not match';
    }
    return null;
  };

  const handleSubmit = async () => {
    if (loading) return;
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError('');
    setLoading(true);
    try {
      const session = isRegister
        ? await authRegister(email, password, name)
        : await authLogin(email, password);
      login(session);
    } catch (e) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={styles.brand}>
            <View style={styles.brandIcon}>
              <MaterialCommunityIcons name="camera-burst" size={28} color={theme.accent} />
            </View>
            <Text style={styles.brandName}>SnapTag</Text>
            <Text style={styles.brandSub}>Field capture & inspection</Text>
          </View>

          {/* Tab switcher */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, !isRegister && styles.tabActive]}
              onPress={() => switchMode('login')}
            >
              <Text style={[styles.tabText, !isRegister && styles.tabTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, isRegister && styles.tabActive]}
              onPress={() => switchMode('register')}
            >
              <Text style={[styles.tabText, isRegister && styles.tabTextActive]}>Create Account</Text>
            </TouchableOpacity>
          </View>

          {/* Form card */}
          <View style={styles.form}>

            {/* Name — register only */}
            {isRegister && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={(t) => { setName(t); setError(''); }}
                  placeholder="Your full name"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>
            )}

            {/* Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                ref={emailRef}
                style={styles.input}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(''); }}
                placeholder="you@company.com"
                placeholderTextColor={theme.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(''); }}
                  placeholder={isRegister ? 'Min. 8 characters' : '••••••••'}
                  placeholderTextColor={theme.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType={isRegister ? 'next' : 'go'}
                  onSubmitEditing={() => isRegister ? confirmRef.current?.focus() : handleSubmit()}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={theme.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password — register only */}
            {isRegister && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Confirm Password</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    ref={confirmRef}
                    style={[
                      styles.input,
                      styles.passwordInput,
                      confirmPassword && password !== confirmPassword && styles.inputError,
                    ]}
                    value={confirmPassword}
                    onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
                    placeholder="Re-enter password"
                    placeholderTextColor={theme.textMuted}
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={handleSubmit}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowConfirm((v) => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialCommunityIcons
                      name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={theme.textMuted}
                    />
                  </TouchableOpacity>
                </View>
                {confirmPassword.length > 0 && password !== confirmPassword ? (
                  <Text style={styles.matchHint}>Passwords do not match</Text>
                ) : null}
                {confirmPassword.length > 0 && password === confirmPassword ? (
                  <View style={styles.matchOkRow}>
                    <MaterialCommunityIcons name="check-circle" size={13} color={theme.success} />
                    <Text style={styles.matchOk}>Passwords match</Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Error */}
            {error !== '' && (
              <View style={styles.errorRow}>
                <MaterialCommunityIcons name="alert-circle-outline" size={14} color={theme.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {isRegister ? 'Create Account' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>SnapTag · Field Inspection</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
