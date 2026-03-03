import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState, AppDispatch } from '../store';
import { fetchCreditStats } from '../store/creditSlice';
import { Colors, Spacing, BorderRadius } from '../theme/colors';

export const PendingTasksWidget = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();
  const { stats } = useSelector((state: RootState) => state.credit);

  useEffect(() => {
    dispatch(fetchCreditStats());
  }, []);

  // No pending tasks to show (low credits is handled by banner in HomeScreen)
  const tasks = [];

  // Note: Low credit warning removed - it's redundant with the "New jobs are paused" banner

  if (tasks.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{tasks.length} Pending Task{tasks.length > 1 ? 's' : ''}</Text>
      </View>
      {tasks.map((task) => (
        <TouchableOpacity
          key={task.id}
          style={styles.taskRow}
          onPress={task.action}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: task.iconBg }]}>
            <Ionicons name={task.icon as any} size={20} color={task.iconColor} />
          </View>
          <View style={styles.taskContent}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <Text style={styles.taskSubtitle}>{task.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.errorBg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.error,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  taskSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
