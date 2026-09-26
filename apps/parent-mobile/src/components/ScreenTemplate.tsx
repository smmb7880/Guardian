import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ScreenTemplateProps {
  title: string;
}

export const ScreenTemplate: React.FC<ScreenTemplateProps> = ({ title }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e1e2d', // dark premium background
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#e0e0ff', // soft highlight color
  },
});
