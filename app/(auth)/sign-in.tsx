import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Text, TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '@/lib/supabase';
import { useAppSession } from '@/hooks/useAppSession';

const COLORS = {
  primary: '#003D70',
  white: '#F8F9FA',
  textPrimary: '#003D70',
  textSecondary: '#414750',
};

export default function SignInScreen() {
  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async () => {
    if (!cedula.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu cédula y contraseña.');
      return;
    }

    setLoading(true);
    try {
      // Convert cedula to email format for Supabase Auth
      const email = `${cedula.trim()}@pluvio.app`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Alert.alert('Error de autenticación', error.message);
        return;
      }

      if (data.user) {
        router.replace('/(admin)');
      }
    } catch (error) {
      Alert.alert('Error', 'No fue posible iniciar sesión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Ionicons name="water" size={64} color={COLORS.primary} />
        </View>

        {/* Bienvenido */}
        <Text style={styles.title}>Bienvenido de nuevo</Text>
        <Text style={styles.subtitle}>Ingresa tus datos para continuar el seguimiento hídrico</Text>

        {/* Campos */}
        <TextInput
          mode="outlined"
          label="Cédula de ciudadanía"
          value={cedula}
          onChangeText={setCedula}
          keyboardType="numeric"
          autoCapitalize="none"
          outlineColor={COLORS.textSecondary}
          activeOutlineColor={COLORS.primary}
          style={styles.input}
          textColor="#1A1A1A"
        />

        <TextInput
          mode="outlined"
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          outlineColor={COLORS.textSecondary}
          activeOutlineColor={COLORS.primary}
          style={styles.input}
          textColor="#1A1A1A"
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowPassword(!showPassword)}
            />
          }
        />

        {/* Botón */}
        <Button
          mode="contained"
          onPress={onSubmit}
          loading={loading}
          disabled={loading}
          buttonColor={COLORS.primary}
          textColor={COLORS.white}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Iniciar sesión
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    gap: 16,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#003D70',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#414750',
    textAlign: 'center',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    backgroundColor: '#F8F9FA',
  },
  button: {
    width: '100%',
    borderRadius: 8,
    marginTop: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});
