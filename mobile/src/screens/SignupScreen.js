import React, { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { signUp } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import Logo from '../components/Logo'

export default function SignupScreen({ navigation }) {
  const { refreshProfile } = useAuth()
  const [form, setForm] = useState({ email: '', username: '', fullName: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    if (!form.email || !form.username || !form.password) return setError('Email, username, and password are required')
    if (form.password.length < 8) return setError('Password must be at least 8 characters')
    setError('')
    setLoading(true)
    const { data, error: err } = await signUp(form.email.trim(), form.password, form.username.trim(), form.fullName.trim())
    setLoading(false)
    if (err) return setError(err.message || 'Could not create account')

    if (data?.autoConfirmed) {
      await refreshProfile()
      return // RootNavigator swaps to the main app
    }
    // Email verification required — go to the code-entry screen
    navigation.navigate('Confirm', {
      email: form.email.trim(),
      password: form.password,
      username: form.username.trim(),
      fullName: form.fullName.trim(),
    })
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={styles.logoWrap}><Logo size="sm" /></View>
        <Text style={styles.subtitle}>Create your account</Text>

        <View style={styles.card}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.label}>Full name</Text>
          <TextInput style={styles.input} placeholderTextColor="#B0A89F" placeholder="Jane Doe" value={form.fullName} onChangeText={set('fullName')} />
          <Text style={styles.label}>Username</Text>
          <TextInput style={styles.input} placeholderTextColor="#B0A89F" placeholder="janedoe" autoCapitalize="none" value={form.username} onChangeText={set('username')} />
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} placeholderTextColor="#B0A89F" placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={set('email')} />
          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} placeholderTextColor="#B0A89F" placeholder="Min 8 characters" secureTextEntry value={form.password} onChangeText={set('password')} />

          <Pressable style={styles.button} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
          </Pressable>
        </View>

        <Pressable onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Sign in</Text></Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FDF6EE' },
  logoWrap: { marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#8C7B6E', textAlign: 'center', marginBottom: 24, fontStyle: 'italic' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 22, borderWidth: 1, borderColor: '#F0EAE4', shadowColor: '#1A0800', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  error: { color: '#D14343', textAlign: 'center', marginBottom: 12, fontSize: 13 },
  label: { fontSize: 11, fontWeight: '700', color: '#8C7B6E', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  input: { backgroundColor: '#FDF6EE', borderRadius: 12, borderWidth: 1, borderColor: '#E8DFD5', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16, fontSize: 14, color: '#1A0800' },
  button: { backgroundColor: '#FF6B2B', borderRadius: 100, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  link: { textAlign: 'center', marginTop: 22, color: '#5C5147', fontSize: 13 },
  linkBold: { color: '#FF6B2B', fontWeight: '700' },
})
