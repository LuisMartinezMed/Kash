import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { colors } from '../../src/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: 'rgba(255,255,255,0.05)',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
        },
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
          tabBarTestID: 'tab-dashboard',
        }}
      />
      <Tabs.Screen
        name="tarjetas"
        options={{
          title: 'Tarjetas',
          tabBarIcon: ({ color, size }) => <Ionicons name="card-outline" size={size} color={color} />,
          tabBarTestID: 'tab-tarjetas',
        }}
      />
      <Tabs.Screen
        name="msi"
        options={{
          title: 'MSI',
          tabBarIcon: ({ color, size }) => <Ionicons name="layers-outline" size={size} color={color} />,
          tabBarTestID: 'tab-msi',
        }}
      />
      <Tabs.Screen
        name="movimientos"
        options={{
          title: 'Movimientos',
          tabBarIcon: ({ color, size }) => <Ionicons name="swap-vertical-outline" size={size} color={color} />,
          tabBarTestID: 'tab-movimientos',
        }}
      />
      <Tabs.Screen
        name="alertas"
        options={{
          title: 'Alertas',
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
          tabBarTestID: 'tab-alertas',
        }}
      />
    </Tabs>
  );
}
