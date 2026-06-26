import React, { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { confirmSignUp, resendConfirmationCode } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

// Reached after signup when Cognito requires an emailed verification code
// before the account can sign in (see /auth/signup's `autoConfirmed` flag).
export default function ConfirmScreen({ route }) {
  const { email, password, username, fullName } = route.params
  const { refreshProfile } = useAuth()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resent, setResent] = useState(false)

  const handleConfirm = async () => {
    if (!code.trim()) return setError('Enter the code from your email')
    setError('')
    setLoading(true)
    const { error: err } = await confirmSignUp(email, code.trim(), password, username, fullName)
    setLoading(false)
    if (err) return setError(err.message || 'Invalid or expired code')
    await refreshProfile() // RootNavigator swaps to the main app
  }

  const handleResend = async () => {
    setResent(false)
    await resendConfirmationCode(email)
    setResent(true)
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.icon}>📩</Text>
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.subtitle}>We sent a code to {email}</Text>

      <View style={styles.card}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {resent ? <Text style={styles.success}>Code resent — check your inbox</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="······"
          placeholderTextColor="#DDD3CA"
          keyboardType="number-pad"
          value={code}
          onChangeText={setCode}
        />

        <Pressable style={styles.button} onPress={handleConfirm} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify</Text>}
        </Pressable>
      </View>

      <Pressable onPress={handleResend}>
        <Text style={styles.link}>Didn't get a code? <Text style={styles.linkBold}>Resend</Text></Text>
      </Pressable>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FDF6EE', padding: 24, justifyContent: 'center' },
  icon: { fontSize: 36, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', fontFamily: 'serif', color: '#1A0800', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#8C7B6E', textAlign: 'center', marginBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 22, borderWidth: 1, borderColor: '#F0EAE4', shadowColor: '#1A0800', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  error: { color: '#D14343', textAlign: 'center', marginBottom: 12, fontSize: 13 },
  success: { color: '#2E8B57', textAlign: 'center', marginBottom: 12, fontSize: 13 },
  input: { backgroundColor: '#FDF6EE', borderRadius: 12, borderWidth: 1, borderColor: '#E8DFD5', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16, fontSize: 18, textAlign: 'center', letterSpacing: 6, color: '#1A0800' },
  button: { backgroundColor: '#FF6B2B', borderRadius: 100, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  link: { textAlign: 'center', marginTop: 22, color: '#5C5147', fontSize: 13 },
  linkBold: { color: '#FF6B2B', fontWeight: '700' },
})
