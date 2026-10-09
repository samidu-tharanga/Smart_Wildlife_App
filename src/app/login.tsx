import { Href, router } from 'expo-router';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { auth, db } from '../services/firebase';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const COLORS = {
  primary: '#1565C0',
  darkBlue: '#0D47A1',
  lightBlue: '#E3F2FD',
  white: '#FFFFFF',
  slate: '#546E7A',
  border: '#D9E5EF',
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);

  // Auto-login check when app opens
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await redirectUserBasedOnRole(user.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  async function redirectUserBasedOnRole(userId: string) {
    try {
      const docRef = doc(db, 'user_roles', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userRole = docSnap.data().role;
        if (userRole === 'ranger') {
          router.replace('/(ranger)');
        } else if (userRole === 'manager') {
          router.replace('/(manager)' as Href);
        } else if (userRole === 'researcher') {
          router.replace('/(researcher)/reports');
        } else {
          Alert.alert('Error', 'Unknown role.');
          setLoading(false);
        }
      } else {
        Alert.alert('Role Error', 'Could not find your role. Contact Admin.');
        setLoading(false);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
      setLoading(false);
    }
  }

  // Manual Sign In
  async function signInWithEmail() {
    if (!email || !password) {
      Alert.alert('Required', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await redirectUserBasedOnRole(userCredential.user.uid);
    } catch (error: any) {
      Alert.alert('Login Failed', 'Incorrect email or password. Please try again.');
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Authenticating...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.headerContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="leaf" size={50} color={COLORS.white} />
          </View>
          <Text style={styles.title}>Smart Wildlife</Text>
          <Text style={styles.subtitle}>Conservation & Tracking System</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.loginHeading}>Sign In to your account</Text>
          
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color={COLORS.slate} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor={COLORS.slate}
              onChangeText={setEmail}
              value={email}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.slate} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={COLORS.slate}
              onChangeText={setPassword}
              value={password}
              secureTextEntry
            />
          </View>

          <TouchableOpacity 
            style={styles.button} 
            onPress={signInWithEmail}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Log In</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} style={{marginLeft: 8}} />
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>Secure Access for Authorized Personnel Only</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.darkBlue },
  container: { flex: 1, justifyContent: 'center' },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },
  loadingText: { textAlign: 'center', marginTop: 15, color: COLORS.slate, fontSize: 16, fontWeight: '600' },
  
  headerContainer: { alignItems: 'center', marginBottom: 40, paddingHorizontal: 20 },
  iconContainer: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 32, fontWeight: '900', color: COLORS.white, marginBottom: 5, letterSpacing: 0.5 },
  subtitle: { fontSize: 14, color: COLORS.lightBlue, fontWeight: '500', letterSpacing: 1 },

  formContainer: { backgroundColor: COLORS.white, marginHorizontal: 20, borderRadius: 16, padding: 25, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
  loginHeading: { fontSize: 18, fontWeight: '700', color: COLORS.darkBlue, marginBottom: 20, textAlign: 'center' },
  
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F8FB', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, marginBottom: 15, paddingHorizontal: 15 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 50, fontSize: 15, color: '#000' },
  
  button: { flexDirection: 'row', backgroundColor: COLORS.primary, padding: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  buttonText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },

  footerText: { textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 12, position: 'absolute', bottom: 25, width: '100%' }
});
