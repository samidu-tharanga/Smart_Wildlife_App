import { Href, router } from 'expo-router';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../services/firebase';

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
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await redirectUserBasedOnRole(userCredential.user.uid);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#f57c00" />
        <Text style={{ textAlign: 'center', marginTop: 10 }}>Checking login status...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Smart Wildlife App</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email Address"
        onChangeText={setEmail}
        value={email}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        onChangeText={setPassword}
        value={password}
        secureTextEntry
      />

      <TouchableOpacity 
        style={styles.button} 
        onPress={signInWithEmail} 
      >
        <Text style={styles.buttonText}>Log In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#f5f5f5' },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 40, textAlign: 'center', color: '#f57c00' }, // Firebase orange
  input: { backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#ddd', fontSize: 16 },
  button: { backgroundColor: '#f57c00', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 18 }
});
