import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Quicksand_700Bold } from '@expo-google-fonts/quicksand';

import { AuthProvider } from './src/auth/AuthContext';
import { LoadingScreen } from './src/components/ui';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Quicksand_700Bold,
  });

  if (!fontsLoaded) {
    return <LoadingScreen />;
  }

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </AuthProvider>
  );
}
