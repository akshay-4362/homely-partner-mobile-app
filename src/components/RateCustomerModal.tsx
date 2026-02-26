import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { Button } from './common/Button';
import { reviewApi } from '../api/reviewApi';

interface RateCustomerModalProps {
  visible: boolean;
  bookingId: string;
  customerName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RateCustomerModal: React.FC<RateCustomerModalProps> = ({
  visible,
  bookingId,
  customerName,
  onClose,
  onSuccess,
}) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [punctuality, setPunctuality] = useState(0);
  const [professionalism, setProfessionalism] = useState(0);
  const [friendliness, setFriendliness] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Required', 'Please select an overall rating');
      return;
    }

    setLoading(true);
    try {
      await reviewApi.createReviewForCustomer({
        bookingId,
        rating,
        comment: comment.trim() || undefined,
        punctuality: punctuality > 0 ? punctuality : undefined,
        professionalism: professionalism > 0 ? professionalism : undefined,
        friendliness: friendliness > 0 ? friendliness : undefined,
      });

      Alert.alert('Success', 'Thank you for your feedback!');
      onSuccess?.();
      onClose();

      // Reset form
      setRating(5);
      setComment('');
      setPunctuality(0);
      setProfessionalism(0);
      setFriendliness(0);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (value: number, onChange: (val: number) => void) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => onChange(star)} activeOpacity={0.7}>
            <Ionicons
              name={star <= value ? 'star' : 'star-outline'}
              size={32}
              color={star <= value ? '#FFB800' : Colors.gray300}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.handle} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <Text style={styles.title}>Rate {customerName}</Text>
            <Text style={styles.subtitle}>Share your experience with this customer</Text>

            {/* Overall Rating */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                Overall Rating <Text style={{ color: Colors.error }}>*</Text>
              </Text>
              {renderStars(rating, setRating)}
            </View>

            {/* Optional Category Ratings */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Punctuality (Optional)</Text>
              <Text style={styles.sectionHint}>Was the customer on time?</Text>
              {renderStars(punctuality, setPunctuality)}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Professionalism (Optional)</Text>
              <Text style={styles.sectionHint}>How professional was the customer?</Text>
              {renderStars(professionalism, setProfessionalism)}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Friendliness (Optional)</Text>
              <Text style={styles.sectionHint}>How friendly was the customer?</Text>
              {renderStars(friendliness, setFriendliness)}
            </View>

            {/* Comment */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Your Comments (Optional)</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Share more details about your experience..."
                placeholderTextColor={Colors.textTertiary}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <Button
                label="Cancel"
                onPress={onClose}
                variant="outline"
                style={{ flex: 1 }}
              />
              <Button
                label="Submit Review"
                onPress={handleSubmit}
                loading={loading}
                style={{ flex: 1 }}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.gray300,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  scroll: {
    padding: Spacing.xl,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  sectionHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  starsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 15,
    color: Colors.textPrimary,
    minHeight: 100,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
});
