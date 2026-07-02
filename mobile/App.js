import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import Login from './src/screens/Login';
import Signup from './src/screens/Signup';
import StudentDashboard from './src/screens/StudentDashboard';
import VendorDashboard from './src/screens/VendorDashboard';
import AdminDashboard from './src/screens/AdminDashboard';

const Stack = createStackNavigator();

function NavigationWrapper() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Securing Connection...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Signup" component={Signup} />
          </>
        ) : user.role === 'student' ? (
          <Stack.Screen name="StudentDashboard" component={StudentDashboard} />
        ) : user.role === 'vendor' ? (
          <Stack.Screen name="VendorDashboard" component={VendorDashboard} />
        ) : (
          <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <View style={styles.container}>
        <StatusBar style="light" />
        <NavigationWrapper />
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050811',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050811',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
  },
});
