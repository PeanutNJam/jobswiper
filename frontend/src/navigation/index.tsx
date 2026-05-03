import { StyleSheet, Text, View } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import Agreement02Icon from '@hugeicons/core-free-icons/dist/esm/Agreement02Icon';
import JobSearchIcon from '@hugeicons/core-free-icons/dist/esm/JobSearchIcon';
import UserIcon from '@hugeicons/core-free-icons/dist/esm/UserIcon';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import SwipeScreen      from '../screens/SwipeScreen';
import MatchesScreen    from '../screens/MatchesScreen';
import ProfileScreen    from '../screens/ProfileScreen';
import CandidatesScreen from '../screens/CandidatesScreen';
import { useAuthStore } from '../store';
import { Colors } from '../constants/colors';

const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const iconMap = {
    Jobs:       JobSearchIcon,
    Candidates: JobSearchIcon,
    Matches:    Agreement02Icon,
    Profile:    UserIcon,
  };

  return (
    <View style={[styles.iconFrame, focused && styles.iconFrameActive]}>
      <HugeiconsIcon
        icon={iconMap[name as keyof typeof iconMap] ?? JobSearchIcon}
        size={22}
        color={focused ? Colors.selectedTabIcon : Colors.inactiveTabIcon}
        strokeWidth={focused ? 2.2 : 2}
      />
    </View>
  );
}

export default function MainNavigation() {
  const user       = useAuthStore(state => state.user);
  const isEmployer = user?.userType === 'employer';

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon name={route.name} focused={focused} />
          ),
          tabBarLabel: ({ focused, color }) => (
            <Text style={[styles.tabLabel, focused && styles.tabLabelActive, { color }]}>
              {route.name}
            </Text>
          ),
          tabBarActiveTintColor:   Colors.primary,
          tabBarInactiveTintColor: Colors.inactiveTabIcon,
          tabBarItemStyle: styles.tabItem,
          tabBarStyle: {
            backgroundColor: Colors.tabBar,
            borderTopWidth: 0,
            height: 68,
            paddingTop: 7,
            paddingBottom: 10,
            shadowColor: Colors.text1,
            shadowOffset: { width: 0, height: -8 },
            shadowOpacity: 0.08,
            shadowRadius: 18,
            elevation: 16,
          },
        })}
      >
        {isEmployer
          ? <Tab.Screen name="Candidates" component={CandidatesScreen} />
          : <Tab.Screen name="Jobs"       component={SwipeScreen} />
        }
        <Tab.Screen name="Matches" component={MatchesScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    minHeight: 50,
  },
  iconFrame: {
    width: 40,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFrameActive: {},
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
    marginTop: 3,
  },
  tabLabelActive: {
    marginTop: 3,
  },
});
