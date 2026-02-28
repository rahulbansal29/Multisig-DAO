import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { HomeScreen } from './src/screens/HomeScreen';
import { ProposalListScreen } from './src/screens/ProposalListScreen';
import { ProposalDetailScreen } from './src/screens/ProposalDetailScreen';
import { CreateProposalScreen } from './src/screens/CreateProposalScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#6366f1',
            },
            headerTintColor: '#ffffff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'DAO Treasury' }}
          />
          <Stack.Screen
            name="Proposals"
            component={ProposalListScreen}
            options={{ title: 'All Proposals' }}
          />
          <Stack.Screen
            name="ProposalDetail"
            component={ProposalDetailScreen}
            options={{ title: 'Proposal Details' }}
          />
          <Stack.Screen
            name="CreateProposal"
            component={CreateProposalScreen}
            options={{ title: 'New Proposal' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
