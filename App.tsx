import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Book, BookOpen, Home, Layers, MoreHorizontal, Search, Sparkles } from 'lucide-react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useFonts, Quicksand_400Regular, Quicksand_500Medium, Quicksand_600SemiBold, Quicksand_700Bold } from '@expo-google-fonts/quicksand';
import { AuthProvider } from './src/auth-context';

// Screen Imports
import { HomeScreen } from './src/screens/HomeScreen';
import { DictionaryScreen } from './src/screens/DictionaryScreen';
import { VocabularyDetailScreen } from './src/screens/VocabularyDetailScreen';
import { ReadingsScreen } from './src/screens/ReadingsScreen';
import { ReadingDetailScreen } from './src/screens/ReadingDetailScreen';
import { FlashcardsScreen } from './src/screens/FlashcardsScreen';
import { DeckDetailScreen } from './src/screens/DeckDetailScreen';
import { ReviewScreen } from './src/screens/ReviewScreen';
import { AccountScreen } from './src/screens/AccountScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { ContributionScreen } from './src/screens/ContributionScreen';
import { LookupScreen } from './src/screens/LookupScreen';

import { colors, fonts } from './src/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.white,
    text: colors.ink,
    border: '#F1F5F9',
    primary: colors.pink,
  },
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        header: () => <Header />,
        tabBarActiveTintColor: colors.pinkDark,
        tabBarInactiveTintColor: colors.secondary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        tabBarIcon: ({ color, size }) => {
          const icons: any = {
            Home,
            Readings: BookOpen,
            Dictionary: Book,
            Flashcards: Layers,
            More: MoreHorizontal,
          };
          const Icon = icons[route.name];
          return <Icon color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Readings" component={ReadingsScreen} />
      <Tab.Screen name="Dictionary" component={DictionaryScreen} />
      <Tab.Screen name="Flashcards" component={FlashcardsScreen} />
      <Tab.Screen name="More" component={AccountScreen} />
    </Tab.Navigator>
  );
}

function Header() {
  const navigation = useNavigation<any>();
  return (
    <View style={styles.header}>
      <View style={[styles.logo, { backgroundColor: colors.pinkSoft }]}>
        <Image
          source={require('./assets/bunny_reading.png')}
          style={{ width: 28, height: 28, resizeMode: 'contain' }}
        />
      </View>
      <View>
        <Text style={styles.brand}>
          Aura<Text style={{ color: colors.pink }}>English</Text>
        </Text>
        <Text style={styles.tag}>SRS & READINGS</Text>
      </View>
      <Pressable style={styles.lookup} onPress={() => navigation.navigate('Lookup')}>
        <Search size={16} color={colors.muted} />
        <Text numberOfLines={1} style={styles.lookupText}>
          Search a word...
        </Text>
      </Pressable>
    </View>
  );
}

export default function App() {
  const [loaded] = useFonts({
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
  });

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NavigationContainer theme={navTheme}>
            <StatusBar style="dark" />
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Screen name="Main" component={Tabs} />
              <Stack.Screen name="Lookup" component={LookupScreen} />
              <Stack.Screen name="VocabularyDetail" component={VocabularyDetailScreen} />
              <Stack.Screen name="ReadingDetail" component={ReadingDetailScreen} />
              <Stack.Screen name="DeckDetail" component={DeckDetailScreen} />
              <Stack.Screen name="Review" component={ReviewScreen} />
              <Stack.Screen name="Contribution" component={ContributionScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 48,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.ink,
  },
  tag: {
    fontFamily: fonts.bold,
    fontSize: 7,
    color: colors.secondary,
    letterSpacing: 1,
  },
  lookup: {
    marginLeft: 'auto',
    minWidth: 120,
    maxWidth: 160,
    flex: 1,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
  },
  lookupText: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    color: colors.muted,
    flex: 1,
  },
  tabLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    marginTop: 2,
  },
  tabBar: {
    height: 72,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopColor: '#EEF2F6',
    backgroundColor: colors.white,
  },
});
