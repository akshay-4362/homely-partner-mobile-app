import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import client from '../api/client';

interface Category {
  _id: string;
  name: string;
  description: string;
  icon?: string;
}

interface CategorySelectionScreenProps {
  route?: {
    params?: {
      isOnboarding?: boolean; // If true, called during registration
    };
  };
}

export const CategorySelectionScreen: React.FC<CategorySelectionScreenProps> = ({ route }) => {
  const navigation = useNavigation<any>();
  const isOnboarding = route?.params?.isOnboarding || false;

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load all categories
      const categoriesRes = await client.get('/categories');
      // API returns: { data: [...categories...], meta: {...} }
      // Axios wraps it, so categoriesRes.data.data is the categories array
      const categoriesList = categoriesRes.data?.data;
      if (Array.isArray(categoriesList)) {
        setCategories(categoriesList);
      } else {
        console.warn('Categories response not in expected format:', categoriesRes.data);
        setCategories([]);
      }

      // Load current professional's categories (if not onboarding)
      if (!isOnboarding) {
        const profileRes = await client.get('/professionals/me');
        const profileData = profileRes.data?.data || profileRes.data;
        const currentCategories = profileData?.categories || [];
        setSelectedCategories(new Set(currentCategories.map((c: any) => c._id || c)));
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId);
    } else {
      newSelected.add(categoryId);
    }
    setSelectedCategories(newSelected);
  };

  const handleSave = async () => {
    if (selectedCategories.size === 0) {
      Alert.alert('Error', 'Please select at least one category');
      return;
    }

    try {
      setSaving(true);

      await client.put('/professionals/categories', {
        categories: Array.from(selectedCategories)
      });

      Alert.alert(
        'Success',
        'Your expertise categories have been updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              if (isOnboarding) {
                // Navigate to next onboarding step
                navigation.navigate('Home');
              } else {
                navigation.goBack();
              }
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Failed to update categories:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update categories');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        {!isOnboarding && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>
          {isOnboarding ? 'Select Your Expertise' : 'My Categories'}
        </Text>
        {!isOnboarding && <View style={{ width: 40 }} />}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Ionicons name="information-circle" size={24} color={Colors.primary} />
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Text style={styles.instructionsTitle}>Choose Your Categories</Text>
            <Text style={styles.instructionsText}>
              Select all the categories you have expertise in. You'll receive jobs from these categories.
            </Text>
          </View>
        </View>

        {/* Selected Count */}
        <View style={styles.countCard}>
          <Text style={styles.countText}>
            {selectedCategories.size} {selectedCategories.size === 1 ? 'category' : 'categories'} selected
          </Text>
          {selectedCategories.size === 0 && (
            <Text style={styles.warningText}>Select at least one category</Text>
          )}
        </View>

        {/* Categories Grid */}
        <View style={styles.grid}>
          {categories.map((category) => {
            const isSelected = selectedCategories.has(category._id);
            return (
              <TouchableOpacity
                key={category._id}
                style={[
                  styles.categoryCard,
                  isSelected && styles.categoryCardSelected
                ]}
                onPress={() => toggleCategory(category._id)}
                activeOpacity={0.7}
              >
                {/* Selection Indicator */}
                <View style={styles.categoryHeader}>
                  <View
                    style={[
                      styles.checkbox,
                      isSelected && styles.checkboxSelected
                    ]}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                </View>

                {/* Icon */}
                <View style={styles.iconContainer}>
                  <Text style={styles.iconText}>
                    {category.icon || '🔨'}
                  </Text>
                </View>

                {/* Name */}
                <Text style={styles.categoryName}>{category.name}</Text>

                {/* Description */}
                {category.description && (
                  <Text style={styles.categoryDescription} numberOfLines={2}>
                    {category.description}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (selectedCategories.size === 0 || saving) && styles.saveButtonDisabled
          ]}
          onPress={handleSave}
          disabled={selectedCategories.size === 0 || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isOnboarding ? 'Continue' : 'Save Changes'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  instructionsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.primaryLight,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  countCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  countText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  warningText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.divider,
  },
  categoryCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  iconText: {
    fontSize: 32,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
