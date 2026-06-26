import React, { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '../contexts/AuthContext'

import WalkthroughScreen, { WALKTHROUGH_SEEN_KEY } from '../screens/WalkthroughScreen'
import LoginScreen from '../screens/LoginScreen'
import SignupScreen from '../screens/SignupScreen'
import ConfirmScreen from '../screens/ConfirmScreen'
import FeedScreen from '../screens/FeedScreen'
import DiscoverScreen from '../screens/DiscoverScreen'
import HabitsScreen from '../screens/HabitsScreen'
import ProfileScreen from '../screens/ProfileScreen'
import StoryDetailScreen from '../screens/StoryDetailScreen'
import CreateStoryScreen from '../screens/CreateStoryScreen'

const AuthStackNav = createNativeStackNavigator()
const FeedStackNav = createNativeStackNavigator()
const DiscoverStackNav = createNativeStackNavigator()
const HabitsStackNav = createNativeStackNavigator()
const Tabs = createBottomTabNavigator()

const headerOptions = {
  headerStyle: { backgroundColor: '#FDF6EE' },
  headerTitleStyle: { color: '#1A0800', fontWeight: '700' },
  headerTintColor: '#FF6B2B',
};

function AuthStack({ initialRouteName }) {
  return (
    <AuthStackNav.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
      <AuthStackNav.Screen name="Walkthrough" component={WalkthroughScreen} />
      <AuthStackNav.Screen name="Login" component={LoginScreen} />
      <AuthStackNav.Screen name="Signup" component={SignupScreen} />
      <AuthStackNav.Screen name="Confirm" component={ConfirmScreen} />
    </AuthStackNav.Navigator>
  )
}

function FeedStack() {
  return (
    <FeedStackNav.Navigator screenOptions={headerOptions}>
      <FeedStackNav.Screen name="FeedHome" component={FeedScreen} options={{ title: 'My Feed' }} />
      <FeedStackNav.Screen name="StoryDetail" component={StoryDetailScreen} options={{ title: '' }} />
      <FeedStackNav.Screen name="CreateStory" component={CreateStoryScreen} options={{ title: 'Write a Story', presentation: 'modal' }} />
    </FeedStackNav.Navigator>
  )
}

function DiscoverStack() {
  return (
    <DiscoverStackNav.Navigator screenOptions={headerOptions}>
      <DiscoverStackNav.Screen name="DiscoverHome" component={DiscoverScreen} options={{ title: 'Discover' }} />
      <DiscoverStackNav.Screen name="StoryDetail" component={StoryDetailScreen} options={{ title: '' }} />
      <DiscoverStackNav.Screen name="CreateStory" component={CreateStoryScreen} options={{ title: 'Write a Story', presentation: 'modal' }} />
    </DiscoverStackNav.Navigator>
  )
}

function HabitsStack() {
  return (
    <HabitsStackNav.Navigator screenOptions={headerOptions}>
      <HabitsStackNav.Screen name="HabitsHome" component={HabitsScreen} options={{ title: 'Habits' }} />
    </HabitsStackNav.Navigator>
  )
}

// Emoji-as-icon — no vector-icon library needed, keeps the app light.
const TAB_ICON = { Feed: '🏠', Discover: '🔎', Habits: '🔥', Profile: '👤' }

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF6B2B',
        tabBarInactiveTintColor: '#B0A89F',
      }}
    >
      <Tabs.Screen name="Feed" component={FeedStack} options={{ tabBarLabel: 'Feed', tabBarIcon: () => <Text>{TAB_ICON.Feed}</Text> }} />
      <Tabs.Screen name="Discover" component={DiscoverStack} options={{ tabBarLabel: 'Discover', tabBarIcon: () => <Text>{TAB_ICON.Discover}</Text> }} />
      <Tabs.Screen name="Habits" component={HabitsStack} options={{ tabBarLabel: 'Habits', tabBarIcon: () => <Text>{TAB_ICON.Habits}</Text> }} />
      <Tabs.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile', tabBarIcon: () => <Text>{TAB_ICON.Profile}</Text> }} />
    </Tabs.Navigator>
  )
}

export default function RootNavigator() {
  const { profile, loading } = useAuth()
  const [seenWalkthrough, setSeenWalkthrough] = useState(null)

  useEffect(() => {
    AsyncStorage.getItem(WALKTHROUGH_SEEN_KEY).then(v => setSeenWalkthrough(!!v))
  }, [])

  if (loading || seenWalkthrough === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FDF6EE' }}>
        <ActivityIndicator color="#FF6B2B" size="large" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      {profile ? <MainTabs /> : <AuthStack initialRouteName={seenWalkthrough ? 'Login' : 'Walkthrough'} />}
    </NavigationContainer>
  )
}
