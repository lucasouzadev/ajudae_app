import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Image } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { FormField } from '@/components/FormField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SegmentedControl } from '@/components/SegmentedControl';

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login, signup } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [roleIndex, setRoleIndex] = useState(0); // 0 = cliente, 1 = prestador
  
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (isLogin) {
        await login(email || 'teste@fretex.com', senha || '123456');
      } else {
        await signup(
          nome || 'Novo Usuário', 
          email || 'novo@fretex.com', 
          telefone || '11999999999', 
          senha || '123456', 
          roleIndex === 0 ? 'cliente' : 'prestador'
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 40,
        paddingBottom: insets.bottom + 20,
        paddingHorizontal: 24,
      }}
      bottomOffset={40}
    >
      <View style={styles.header}>
        <View style={[styles.logoPlaceholder, { backgroundColor: colors.primary }]}>
          <Text style={styles.logoText}>F</Text>
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Fretex</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Frete, mudança e entrega na palma da mão.
        </Text>
      </View>

      <View style={styles.form}>
        <SegmentedControl
          tabs={['Entrar', 'Cadastrar']}
          selectedIndex={isLogin ? 0 : 1}
          onChange={(i) => setIsLogin(i === 0)}
        />
        
        <View style={{ height: 24 }} />

        {!isLogin && (
          <>
            <SegmentedControl
              tabs={['Sou Cliente', 'Sou Prestador']}
              selectedIndex={roleIndex}
              onChange={setRoleIndex}
            />
            <View style={{ height: 16 }} />
            <FormField label="Nome completo">
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground }]}
                placeholder="Ex: João da Silva"
                placeholderTextColor={colors.mutedForeground}
                value={nome}
                onChangeText={setNome}
              />
            </FormField>
            <FormField label="Telefone">
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground }]}
                placeholder="(11) 99999-9999"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
                value={telefone}
                onChangeText={setTelefone}
              />
            </FormField>
          </>
        )}

        <FormField label="E-mail">
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.foreground }]}
            placeholder="seu@email.com"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </FormField>
        
        <FormField label="Senha">
          <TextInput
            style={[styles.input, { backgroundColor: colors.input, color: colors.foreground }]}
            placeholder="••••••••"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            value={senha}
            onChangeText={setSenha}
          />
        </FormField>

        {isLogin && (
          <Text style={[styles.forgotPassword, { color: colors.primary }]}>Esqueci minha senha</Text>
        )}

        <View style={{ height: 32 }} />

        <PrimaryButton
          title={isLogin ? 'Entrar' : 'Criar conta'}
          onPress={handleSubmit}
          loading={loading}
        />
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  form: {
    flex: 1,
  },
  input: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  forgotPassword: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    alignSelf: 'flex-end',
    marginTop: 8,
  },
});
