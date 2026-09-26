import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity } from 'react-native';
import { theme } from '../theme/theme';
import { Button, Card, Badge, Input, LoadingSpinner, ErrorState } from '../components';
import { useAuth } from '../context/AuthProvider';
import { useNavigation } from '../navigation/NavigationContext';
import { ApiClient } from '../services/apiClient';
import { ScheduleRule, RestrictionAction } from '@guardian/shared-types';
import { loadSchedules, createScheduleRule, deleteScheduleRule } from './SchedulesScreenLogic';

export const SchedulesScreen: React.FC = () => {
  const { state: authState } = useAuth();
  const { navigate } = useNavigation();

  const [schedules, setSchedules] = useState<ScheduleRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New schedule modal state
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('20:00');
  const [endTime, setEndTime] = useState('07:00');
  const [action, setAction] = useState<RestrictionAction>(RestrictionAction.BLOCK);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [isSaving, setIsSaving] = useState(false);

  const policyId = 'default-policy-id';

  const fetchSchedules = async () => {
    setLoading(true);
    setError(null);
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      const data = await loadSchedules(client, policyId);
      setSchedules(data);
    } catch (err) {
      setError('Failed to load schedule rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleApplyPreset = (presetName: string, start: string, end: string, act: RestrictionAction) => {
    setName(presetName);
    setStartTime(start);
    setEndTime(end);
    setAction(act);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      await createScheduleRule(client, policyId, {
        name,
        startTime,
        endTime,
        daysOfWeek: selectedDays,
        action,
      });
      setShowModal(false);
      setName('');
      fetchSchedules();
    } catch (err) {
      setError('Failed to create schedule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    try {
      const client = new ApiClient(authState.accessToken || undefined);
      await deleteScheduleRule(client, policyId, scheduleId);
      fetchSchedules();
    } catch (err) {
      setError('Failed to delete schedule');
    }
  };

  const toggleDay = (dayIndex: number) => {
    if (selectedDays.includes(dayIndex)) {
      setSelectedDays(selectedDays.filter((d) => d !== dayIndex));
    } else {
      setSelectedDays([...selectedDays, dayIndex].sort());
    }
  };

  if (loading) return <LoadingSpinner message="Loading schedules..." fullScreen />;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.topBar}>
        <Button title="← Dashboard" onPress={() => navigate('Dashboard')} variant="ghost" size="sm" />
        <Text style={styles.screenTitle}>Schedule Modes</Text>
        <Button title="+ Add Schedule" onPress={() => setShowModal(true)} size="sm" />
      </View>

      {error && <ErrorState message={error} onRetry={fetchSchedules} />}

      {/* Quick Presets */}
      <Card variant="glass" title="Preset Templates">
        <View style={styles.presetRow}>
          <Button
            title="🏫 School (08-14)"
            onPress={() => {
              setShowModal(true);
              handleApplyPreset('School Mode', '08:00', '14:00', RestrictionAction.BLOCK);
            }}
            variant="secondary"
            size="sm"
          />
          <Button
            title="📚 Homework (16-18)"
            onPress={() => {
              setShowModal(true);
              handleApplyPreset('Homework Time', '16:00', '18:00', RestrictionAction.LIMIT);
            }}
            variant="secondary"
            size="sm"
          />
          <Button
            title="🌙 Bedtime (22-07)"
            onPress={() => {
              setShowModal(true);
              handleApplyPreset('Bedtime', '22:00', '07:00', RestrictionAction.BLOCK);
            }}
            variant="secondary"
            size="sm"
          />
        </View>
      </Card>

      <Text style={styles.sectionHeading}>Active Schedules</Text>

      {schedules.map((schedule) => (
        <Card key={schedule.id} variant="glass" style={styles.scheduleCard}>
          <View style={styles.scheduleHeader}>
            <View>
              <Text style={styles.scheduleName}>{schedule.name}</Text>
              <Text style={styles.scheduleTime}>
                ⏰ {schedule.startTime} — {schedule.endTime}
              </Text>
            </View>
            <Badge
              label={schedule.action}
              status={schedule.action === 'BLOCK' ? 'blocked' : schedule.action === 'LIMIT' ? 'warning' : 'active'}
            />
          </View>

          <View style={styles.daysRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => {
              const active = schedule.daysOfWeek.includes(idx);
              return (
                <View key={idx} style={[styles.dayPill, active && styles.dayPillActive]}>
                  <Text style={[styles.dayText, active && styles.dayTextActive]}>{day}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.cardFooter}>
            <Button title="Delete Schedule" onPress={() => handleDelete(schedule.id)} variant="ghost" size="sm" />
          </View>
        </Card>
      ))}

      {/* Add Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card variant="highlight" title="Configure Schedule Mode" style={{ width: '100%' }}>
            <Input label="Schedule Name" placeholder="e.g. School Hours" value={name} onChangeText={setName} />
            
            <View style={styles.timeRow}>
              <View style={{ flex: 1 }}>
                <Input label="Start Time (HH:MM)" placeholder="08:00" value={startTime} onChangeText={setStartTime} />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="End Time (HH:MM)" placeholder="14:00" value={endTime} onChangeText={setEndTime} />
              </View>
            </View>

            <Text style={styles.selectLabel}>Enforcement Action:</Text>
            <View style={styles.actionRow}>
              <Button
                title="BLOCK"
                onPress={() => setAction(RestrictionAction.BLOCK)}
                variant={action === RestrictionAction.BLOCK ? 'danger' : 'secondary'}
                size="sm"
              />
              <Button
                title="LIMIT"
                onPress={() => setAction(RestrictionAction.LIMIT)}
                variant={action === RestrictionAction.LIMIT ? 'outline' : 'secondary'}
                size="sm"
              />
              <Button
                title="ALLOW"
                onPress={() => setAction(RestrictionAction.ALLOW)}
                variant={action === RestrictionAction.ALLOW ? 'primary' : 'secondary'}
                size="sm"
              />
            </View>

            <Text style={styles.selectLabel}>Active Days:</Text>
            <View style={styles.daysSelectorRow}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
                const selected = selectedDays.includes(idx);
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => toggleDay(idx)}
                    style={[styles.dayToggle, selected && styles.dayToggleSelected]}
                  >
                    <Text style={[styles.dayToggleText, selected && styles.dayToggleTextSelected]}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <Button title="Cancel" onPress={() => setShowModal(false)} variant="ghost" />
              <Button title="Save Schedule" onPress={handleCreate} isLoading={isSaving} />
            </View>
          </Card>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    minHeight: '100%',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  screenTitle: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  sectionHeading: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    marginVertical: theme.spacing.md,
  },
  scheduleCard: {
    marginBottom: theme.spacing.md,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  scheduleName: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
  },
  scheduleTime: {
    color: theme.colors.primaryLight,
    fontSize: theme.typography.sizes.sm,
    marginTop: 2,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: theme.spacing.xs,
  },
  dayPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillActive: {
    backgroundColor: theme.colors.primary,
  },
  dayText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
  },
  dayTextActive: {
    color: '#FFFFFF',
  },
  cardFooter: {
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  timeRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  selectLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.xs,
    marginTop: theme.spacing.sm,
    marginBottom: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  daysSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: theme.spacing.md,
  },
  dayToggle: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dayToggleSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dayToggleText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  dayToggleTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
});
