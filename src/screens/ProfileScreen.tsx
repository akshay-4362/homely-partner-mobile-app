import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal,
  Platform, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { logout, updateUser } from '../store/authSlice';
import { proApi } from '../api/proApi';
import { documentApi } from '../api/documentApi';
import client from '../api/client';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Loader } from '../components/common/Loader';
import { ProfilePictureUpload } from '../components/ProfilePictureUpload';
import { ProfessionalDocument } from '../types';

export const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { user } = useAppSelector((s) => s.auth);

  const [profile, setProfile] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [documents, setDocuments] = useState<ProfessionalDocument[]>([]);
  const [hasLinkedAccount, setHasLinkedAccount] = useState(false);
  const [loading, setLoading] = useState(true);

  // Edit modals
  const [editPhone, setEditPhone] = useState(false);
  const [phone, setPhone] = useState('');
  const [docModal, setDocModal] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('aadhaar_card');
  const [pickedFileUri, setPickedFileUri] = useState<string | null>(null);
  const [pickedFileName, setPickedFileName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const DOC_TYPES = [
    { key: 'aadhaar_card', label: 'Aadhaar Card', icon: 'id-card-outline' },
    { key: 'pan_card', label: 'PAN Card', icon: 'card-outline' },
    { key: 'driving_licence', label: 'Driving Licence', icon: 'car-outline' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  // Reload data when screen comes into focus (e.g., after returning from CategorySelection)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const [profileData, servicesData, docsData] = await Promise.all([
        proApi.fetchProfile(),
        proApi.listServices(),
        documentApi.list(),
      ]);
      const p = profileData?.data || profileData;
      setProfile(p);
      const svcList = servicesData?.data || servicesData?.services || servicesData || [];
      setServices(Array.isArray(svcList) ? svcList : []);
      const docList = docsData?.data || docsData?.documents || docsData || [];
      setDocuments(Array.isArray(docList) ? docList : []);

      // Load categories (populated from profile)
      const categoriesList = p?.categories || [];
      setCategories(Array.isArray(categoriesList) ? categoriesList : []);

      // Check RazorpayX payout account
      try {
        const response = await client.get('/payout-accounts');
        const accs = response.data?.data?.accounts || [];
        setHasLinkedAccount(accs.some((a: any) => a.status === 'active'));
      } catch { setHasLinkedAccount(false); }
    } catch {}
    setLoading(false);
  };


  const savePhone = async () => {
    const trimmed = phone.trim();
    if (!trimmed) { Alert.alert('Invalid', 'Please enter a phone number'); return; }
    if (!/^[6-9]\d{9}$/.test(trimmed)) {
      Alert.alert('Invalid', 'Enter a valid 10-digit Indian mobile number'); return;
    }
    setSaving(true);
    try {
      await client.put('/users/me', { phone: trimmed });
      dispatch(updateUser({ phone: trimmed }));
      setEditPhone(false);
      Alert.alert('Saved', 'Phone number updated');
    } catch { Alert.alert('Error', 'Failed to update phone number'); }
    setSaving(false);
  };

  const pickDocument = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPickedFileUri(result.assets[0].uri);
      setPickedFileName(result.assets[0].uri.split('/').pop() || 'document.jpg');
    }
  };

  const submitDoc = async () => {
    if (!pickedFileUri) { Alert.alert('Select File', 'Please select a document file to upload'); return; }
    setSaving(true);
    try {
      const url = await documentApi.uploadFile(selectedDocType, pickedFileUri);
      await documentApi.submit({ type: selectedDocType, url });
      setDocModal(false);
      setPickedFileUri(null);
      setPickedFileName(null);
      setSelectedDocType('aadhaar_card');
      loadData();
      Alert.alert('Submitted', 'Document submitted for review');
    } catch { Alert.alert('Error', 'Failed to upload document'); }
    setSaving(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => dispatch(logout()) },
    ]);
  };

  if (loading) return <Loader text="Loading profile..." />;

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`;

  const handleProfilePictureUpdate = (imageUrl: string, thumbnailUrl: string) => {
    // Optionally update local user state or refresh profile
    loadData();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <ProfilePictureUpload
            currentImageUrl={user?.profilePicture}
            onUploadSuccess={handleProfilePictureUpdate}
            size={120}
          />
          <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <TouchableOpacity
            style={styles.phoneRow}
            onPress={() => { setPhone(user?.phone || ''); setEditPhone(true); }}
            activeOpacity={0.7}
          >
            <Ionicons name="call-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.phoneText}>
              {user?.phone ? user.phone : 'Add phone number'}
            </Text>
            <Ionicons name="pencil-outline" size={12} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.role}>Professional Partner</Text>
        </View>

        {/* My Expertise Categories */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Expertise</Text>
            <TouchableOpacity onPress={() => navigation.navigate('CategorySelection')}>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>
          {categories.length > 0 ? (
            <View style={styles.categoriesContainer}>
              {categories.map((category) => (
                <View key={category._id} style={styles.categoryChip}>
                  <Text style={styles.categoryIcon}>{category.icon || '🔨'}</Text>
                  <Text style={styles.categoryChipText}>{category.name}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyCategories}>
              <Ionicons name="grid-outline" size={40} color={Colors.textTertiary} />
              <Text style={styles.emptyCategoriesText}>No categories selected yet</Text>
              <TouchableOpacity
                style={styles.addCategoriesBtn}
                onPress={() => navigation.navigate('CategorySelection')}
              >
                <Ionicons name="add-circle" size={20} color={Colors.primary} />
                <Text style={styles.addCategoriesText}>Add Categories</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>

        {/* Quick Nav */}
        <View style={styles.quickNav}>
          {[
            { icon: 'calendar-outline', label: 'Calendar', onPress: () => navigation.navigate('Calendar') },
            { icon: 'time-outline', label: 'Availability', onPress: () => navigation.navigate('Availability') },
            { icon: 'card-outline', label: 'Payouts', onPress: () => navigation.navigate('Payouts') },
            { icon: 'stats-chart-outline', label: 'My Hub', onPress: () => navigation.navigate('MyHub') },
          ].map((item) => (
            <TouchableOpacity key={item.label} style={styles.quickNavItem} onPress={item.onPress}>
              <View style={styles.quickNavIcon}>
                <Ionicons name={item.icon as any} size={22} color={Colors.primary} />
              </View>
              <Text style={styles.quickNavLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* RazorpayX Payout Account */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payout Account</Text>
            {hasLinkedAccount && <Badge label="Connected" variant="completed" />}
          </View>
          {hasLinkedAccount ? (
            <View>
              <Text style={styles.stripeHint}>
                Your payout account is active. Earnings are transferred daily via RazorpayX.
              </Text>
              <Button
                label="Manage Account"
                onPress={() => navigation.navigate('PayoutAccounts')}
                style={{ marginTop: Spacing.md }}
                variant="outline"
              />
            </View>
          ) : (
            <View>
              <Text style={styles.stripeHint}>
                Add your bank account or UPI to receive daily payouts via RazorpayX.
              </Text>
              <Button
                label="Add Payout Account"
                onPress={() => navigation.navigate('BankAccountSetup')}
                style={{ marginTop: Spacing.md }}
              />
            </View>
          )}
        </Card>


        {/* Documents */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Documents</Text>
            <TouchableOpacity onPress={() => setDocModal(true)}>
              <Text style={styles.editLink}>+ Upload</Text>
            </TouchableOpacity>
          </View>
          {documents.length === 0 ? (
            <Text style={styles.emptyText}>No documents uploaded yet</Text>
          ) : (
            documents.map((doc) => (
              <View key={doc._id} style={styles.docRow}>
                <View style={styles.docLeft}>
                  <Ionicons name="document-outline" size={18} color={Colors.textSecondary} />
                  <Text style={styles.docType}>{doc.type.replace('_', ' ')}</Text>
                </View>
                <Badge
                  label={doc.status}
                  variant={doc.status === 'approved' ? 'completed' : doc.status === 'rejected' ? 'cancelled' : 'info'}
                />
              </View>
            ))
          )}
        </Card>

        {/* Menu Items */}
        <Card style={styles.section}>
          {[
            { icon: 'grid-outline', label: 'My Categories', onPress: () => navigation.navigate('CategorySelection') },
            { icon: 'notifications-outline', label: 'Notifications', onPress: () => navigation.navigate('Notifications') },
            { icon: 'wallet-outline', label: 'Credits', onPress: () => navigation.navigate('Credits') },
            { icon: 'school-outline', label: 'Training', onPress: () => navigation.navigate('Training') },
            { icon: 'help-circle-outline', label: 'Help Center', onPress: () => navigation.navigate('HelpCenter') },
            { icon: 'document-lock-outline', label: 'Partner Agreement', onPress: () => navigation.navigate('Legal') },
            { icon: 'shield-outline', label: 'Privacy Policy', onPress: () => navigation.navigate('PrivacyPolicy') },
            { icon: 'document-text-outline', label: 'Terms of Service', onPress: () => navigation.navigate('TermsOfService') },
          ].map((item, i, arr) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, i < arr.length - 1 && styles.menuItemBorder]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <Ionicons name={item.icon as any} size={20} color={Colors.textSecondary} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </Card>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Homelyo Pro v1.0.0</Text>
      </ScrollView>


      {/* Document Upload Modal */}
      <Modal visible={docModal} animationType="slide" transparent onRequestClose={() => setDocModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Upload Document</Text>

            <Text style={styles.fieldLabel}>Document Type</Text>
            <View style={styles.docTypeList}>
              {DOC_TYPES.map((dt) => (
                <TouchableOpacity
                  key={dt.key}
                  style={[styles.docTypeRow, selectedDocType === dt.key && styles.docTypeRowActive]}
                  onPress={() => { setSelectedDocType(dt.key); setPickedFileUri(null); setPickedFileName(null); }}
                >
                  <Ionicons
                    name={dt.icon as any}
                    size={22}
                    color={selectedDocType === dt.key ? Colors.primary : Colors.textSecondary}
                  />
                  <Text style={[styles.docTypeLabel, selectedDocType === dt.key && styles.docTypeLabelActive]}>
                    {dt.label}
                  </Text>
                  {selectedDocType === dt.key && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: Spacing.lg }]}>Select File</Text>
            <TouchableOpacity style={styles.filePickerBtn} onPress={pickDocument} disabled={saving}>
              {pickedFileName ? (
                <View style={styles.filePickedRow}>
                  <Ionicons name="document" size={22} color={Colors.primary} />
                  <Text style={styles.filePickedName} numberOfLines={1}>{pickedFileName}</Text>
                  <TouchableOpacity onPress={() => { setPickedFileUri(null); setPickedFileName(null); }}>
                    <Ionicons name="close-circle" size={18} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.filePickerEmpty}>
                  <Ionicons name="cloud-upload-outline" size={28} color={Colors.textTertiary} />
                  <Text style={styles.filePickerText}>Tap to select image</Text>
                  <Text style={styles.filePickerHint}>JPG, PNG supported</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <Button label="Cancel" onPress={() => { setDocModal(false); setPickedFileUri(null); setPickedFileName(null); }} variant="ghost" />
              <Button label={saving ? 'Uploading...' : 'Submit'} onPress={submitDoc} loading={saving} disabled={!pickedFileUri} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Phone Edit Modal */}
      <Modal visible={editPhone} animationType="slide" transparent onRequestClose={() => setEditPhone(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior="padding"
        >
          <View style={[styles.modalSheet, { paddingBottom: Math.max(Spacing.xl, insets.bottom + Spacing.md) }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {user?.phone ? 'Edit Phone Number' : 'Add Phone Number'}
            </Text>
            <Text style={styles.fieldLabel}>Mobile Number (10 digits)</Text>
            <View style={styles.phoneInputRow}>
              <View style={styles.phonePrefix}>
                <Text style={styles.phonePrefixText}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneFieldInput}
                value={phone}
                onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
            <View style={styles.modalActions}>
              <Button label="Cancel" onPress={() => setEditPhone(false)} variant="ghost" />
              <Button label="Save" onPress={savePhone} loading={saving} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Platform.OS === 'ios' ? 100 : 80 },
  profileHeader: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  name: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  phoneRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 2, marginBottom: 2,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
  },
  phoneText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  phoneInputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    overflow: 'hidden', marginBottom: Spacing.sm,
  },
  phonePrefix: {
    paddingHorizontal: Spacing.md, paddingVertical: 11,
    backgroundColor: Colors.gray100, borderRightWidth: 1.5, borderRightColor: Colors.border,
  },
  phonePrefixText: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },
  phoneFieldInput: {
    flex: 1, paddingHorizontal: Spacing.md, paddingVertical: 10,
    fontSize: 14, color: Colors.textPrimary,
  },
  email: { fontSize: 14, color: Colors.textSecondary, marginBottom: 4 },
  role: { fontSize: 12, color: Colors.primary, fontWeight: '600', backgroundColor: Colors.primaryBg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: BorderRadius.full },
  quickNav: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  quickNavItem: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  quickNavIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  quickNavLabel: { fontSize: 11, fontWeight: '600', color: Colors.textPrimary },
  section: { marginBottom: Spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  editLink: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  bioText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
  stripeHint: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  infoLabel: { fontSize: 13, color: Colors.textSecondary },
  infoValue: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  docRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  docLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  docType: { fontSize: 14, color: Colors.textPrimary, textTransform: 'capitalize' },
  emptyText: { fontSize: 13, color: Colors.textTertiary, fontStyle: 'italic' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 14 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  menuLabel: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.errorBg, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: Colors.error },
  version: { textAlign: 'center', fontSize: 12, color: Colors.textTertiary, marginBottom: Spacing.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.gray300, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.lg },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md, marginTop: Spacing.lg },
  textArea: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    padding: Spacing.md, fontSize: 14, color: Colors.textPrimary, minHeight: 100,
    textAlignVertical: 'top',
  },
  formField: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  fieldInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary,
  },
  typeChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100, borderWidth: 1, borderColor: Colors.border,
  },
  typeChipActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  typeText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500', textTransform: 'capitalize' },
  typeTextActive: { color: Colors.primary, fontWeight: '700' },

  docTypeList: { gap: 8, marginBottom: Spacing.sm },
  docTypeRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  docTypeRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  docTypeLabel: { flex: 1, fontSize: 15, color: Colors.textPrimary, fontWeight: '500' },
  docTypeLabelActive: { color: Colors.primary, fontWeight: '700' },
  filePickerBtn: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    borderStyle: 'dashed', backgroundColor: Colors.surfaceAlt, overflow: 'hidden',
  },
  filePickerEmpty: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 6 },
  filePickerText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  filePickerHint: { fontSize: 12, color: Colors.textTertiary },
  filePickedRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md,
  },
  filePickedName: { flex: 1, fontSize: 13, color: Colors.primary, fontWeight: '500' },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.warningBg || '#fef3c7',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning || '#f59e0b',
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.warning || '#f59e0b',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.successBg || '#d4edda',
    borderRadius: BorderRadius.full,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyCategories: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyCategoriesText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  addCategoriesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  addCategoriesText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
});
