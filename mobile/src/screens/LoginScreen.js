import React, { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useAuth } from '../contexts/AuthContext'
import Logo from '../components/Logo'

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!email || !password) return setError('Enter your email and password')
    setError('')
    setLoading(true)
    const { error: err } = await signIn(email.trim(), password)
    setLoading(false)
    if (err) {
      if (err.code === 'UNCONFIRMED') {
        navigation.navigate('Confirm', { email: email.trim(), password })
        return
      }
      setError(err.message || 'Could not sign in')
    }
    // success — RootNavigator swaps to the main app automatically once profile loads
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.logoWrap}><Logo size="md" /></View>
      <Text style={styles.subtitle}>Welcome back</Text>

      <View style={styles.card}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#B0A89F"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#B0A89F"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Pressable style={styles.button} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
        </Pressable>
      </View>

      <Pressable onPress={() => navigation.navigate('Signup')}>
        <Text style={styles.link}>Don't have an account? <Text style={styles.linkBold}>Sign up</Text></Text>
      </Pressable>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FDF6EE', padding: 24, justifyContent: 'center' },
  logoWrap: { marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#8C7B6E', textAlign: 'center', marginBottom: 28, fontStyle: 'italic' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 22, borderWidth: 1, borderColor: '#F0EAE4', shadowColor: '#1A0800', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  error: { color: '#D14343', textAlign: 'center', marginBottom: 12, fontSize: 13 },
  label: { fontSize: 11, fontWeight: '700', color: '#8C7B6E', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  input: { backgroundColor: '#FDF6EE', borderRadius: 12, borderWidth: 1, borderColor: '#E8DFD5', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16, fontSize: 14, color: '#1A0800' },
  button: { backgroundColor: '#FF6B2B', borderRadius: 100, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  link: { textAlign: 'center', marginTop: 22, color: '#5C5147', fontSize: 13 },
  linkBold: { color: '#FF6B2B', fontWeight: '700' },
})
