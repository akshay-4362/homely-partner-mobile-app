import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { logout } from '../store/authSlice';
import { proApi } from '../api/proApi';
import { documentApi } from '../api/documentApi';
import { stripeApi } from '../api/stripeApi';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Loader } from '../components/common/Loader';
import { ProfessionalDocument, StripeAccountStatus } from '../types';

export const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);

  const [profile, setProfile] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [documents, setDocuments] = useState<ProfessionalDocument[]>([]);
  const [stripeStatus, setStripeStatus] = useState<StripeAccountStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit modals
  const [editBio, setEditBio] = useState(false);
  const [bio, setBio] = useState('');
  const [editBank, setEditBank] = useState(false);
  const [bankDetails, setBankDetails] = useState({ accountHolderName: '', accountNumber: '', ifscCode: '' });
  const [docModal, setDocModal] = useState(false);
  const [docForm, setDocForm] = useState({ type: 'id_proof', url: '' });
  const [saving, setSaving] = useState(false);

  const DOC_TYPES = ['id_proof', 'address_proof', 'pan_card', 'bank_statement', 'experience_cert'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileData, servicesData, docsData] = await Promise.all([
        proApi.fetchProfile(),
        proApi.listServices(),
        documentApi.list(),
      ]);
      const p = profileData?.data || profileData;
      setProfile(p);
      setBio(p?.bio || '');
      setBankDetails({
        accountHolderName: p?.bankDetails?.accountHolderName || '',
        accountNumber: p?.bankDetails?.accountNumber || '',
        ifscCode: p?.bankDetails?.ifscCode || '',
      });
      const svcList = servicesData?.data || servicesData?.services || servicesData || [];
      setServices(Array.isArray(svcList) ? svcList : []);
      const docList = docsData?.data || docsData?.documents || docsData || [];
      setDocuments(Array.isArray(docList) ? docList : []);

      // Load stripe status
      try {
        const s = await stripeApi.getAccountStatus();
        setStripeStatus(s?.data || s);
      } catch {}
    } catch {}
    setLoading(false);
  };

  const saveBio = async () => {
    setSaving(true);
    try {
      await proApi.updateAvailability({ bio });
      setEditBio(false);
      Alert.alert('Saved', 'Bio updated');
    } catch { Alert.alert('Error', 'Failed to save'); }
    setSaving(false);
  };

  const saveBank = async () => {
    setSaving(true);
    try {
      await proApi.updateAvailability({ bankDetails });
      setEditBank(false);
      Alert.alert('Saved', 'Bank details updated');
    } catch { Alert.alert('Error', 'Failed to save'); }
    setSaving(false);
  };

  const submitDoc = async () => {
    if (!docForm.url) { Alert.alert('Enter document URL'); return; }
    setSaving(true);
    try {
      await documentApi.submit(docForm);
      setDocModal(false);
      setDocForm({ type: 'id_proof', url: '' });
      loadData();
      Alert.alert('Submitted', 'Document submitted for review');
    } catch { Alert.alert('Error', 'Failed to submit document'); }
    setSaving(false);
  };

  const handleStripeSetup = async () => {
    try {
      if (!stripeStatus?.accountId) {
        await stripeApi.createAccount(user!.email);
      }
      const refreshUrl = Linking.createURL('/profile');
      const returnUrl = Linking.createURL('/profile');
      const { url } = await stripeApi.getOnboardingLink(refreshUrl, returnUrl);
      await WebBrowser.openBrowserAsync(url);
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to setup Stripe account');
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => dispatch(logout()) },
    ]);
  };

  if (loading) return <Loader text="Loading profile..." />;

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.role}>Professional Partner</Text>
        </View>

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

        {/* Stripe Section */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Stripe Payouts</Text>
            {stripeStatus?.detailsSubmitted && <Badge label="Connected" variant="completed" />}
          </View>
          {stripeStatus?.detailsSubmitted ? (
            <View style={styles.stripeStatus}>
              <StripeRow label="Charges" enabled={!!stripeStatus.chargesEnabled} />
              <StripeRow label="Payouts" enabled={!!stripeStatus.payoutsEnabled} />
              <StripeRow label="Details" enabled={!!stripeStatus.detailsSubmitted} />
            </View>
          ) : (
            <View>
              <Text style={styles.stripeHint}>Connect Stripe to receive payouts directly to your bank account.</Text>
              <Button label="Setup Stripe Account" onPress={handleStripeSetup} style={{ marginTop: Spacing.md }} />
            </View>
          )}
        </Card>

        {/* Bio */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>About Me</Text>
            <TouchableOpacity onPress={() => setEditBio(true)}>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.bioText}>{profile?.bio || 'Add a bio to let customers know more about you.'}</Text>
        </Card>

        {/* Bank Details */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bank Account</Text>
            <TouchableOpacity onPress={() => setEditBank(true)}>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>
          <InfoRow label="Account Holder" value={bankDetails.accountHolderName || '—'} />
          <InfoRow label="Account Number" value={bankDetails.accountNumber ? `****${bankDetails.accountNumber.slice(-4)}` : '—'} />
          <InfoRow label="IFSC Code" value={bankDetails.ifscCode || '—'} />
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
            { icon: 'notifications-outline', label: 'Notifications', onPress: () => navigation.navigate('Notifications') },
            { icon: 'wallet-outline', label: 'Credits', onPress: () => navigation.navigate('Credits') },
            { icon: 'school-outline', label: 'Training', onPress: () => navigation.navigate('Training') },
            { icon: 'help-circle-outline', label: 'Help Center', onPress: () => navigation.navigate('Help') },
            { icon: 'shield-outline', label: 'Privacy Policy', onPress: () => {} },
            { icon: 'document-text-outline', label: 'Terms of Service', onPress: () => {} },
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

      {/* Bio Edit Modal */}
      <Modal visible={editBio} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Edit Bio</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={4}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell customers about yourself..."
              placeholderTextColor={Colors.textTertiary}
            />
            <View style={styles.modalActions}>
              <Button label="Cancel" onPress={() => setEditBio(false)} variant="ghost" />
              <Button label="Save" onPress={saveBio} loading={saving} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Bank Details Modal */}
      <Modal visible={editBank} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Bank Details</Text>
            {[
              { label: 'Account Holder Name', key: 'accountHolderName', placeholder: 'Full name' },
              { label: 'Account Number', key: 'accountNumber', placeholder: 'Account number', numeric: true },
              { label: 'IFSC Code', key: 'ifscCode', placeholder: 'e.g. HDFC0001234' },
            ].map((f) => (
              <View key={f.key} style={styles.formField}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={bankDetails[f.key as keyof typeof bankDetails]}
                  onChangeText={(v) => setBankDetails((prev) => ({ ...prev, [f.key]: v }))}
                  placeholder={f.placeholder}
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType={f.numeric ? 'numeric' : 'default'}
                />
              </View>
            ))}
            <View style={styles.modalActions}>
              <Button label="Cancel" onPress={() => setEditBank(false)} variant="ghost" />
              <Button label="Save" onPress={saveBank} loading={saving} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Document Upload Modal */}
      <Modal visible={docModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Upload Document</Text>
            <Text style={styles.fieldLabel}>Document Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {DOC_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, docForm.type === t && styles.typeChipActive]}
                    onPress={() => setDocForm((prev) => ({ ...prev, type: t }))}
                  >
                    <Text style={[styles.typeText, docForm.type === t && styles.typeTextActive]}>
                      {t.replace(/_/g, ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={styles.fieldLabel}>Document URL</Text>
            <TextInput
              style={styles.fieldInput}
              value={docForm.url}
              onChangeText={(v) => setDocForm((prev) => ({ ...prev, url: v }))}
              placeholder="https://..."
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <Button label="Cancel" onPress={() => setDocModal(false)} variant="ghost" />
              <Button label="Submit" onPress={submitDoc} loading={saving} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const StripeRow = ({ label, enabled }: { label: string; enabled: boolean }) => (
  <View style={styles.stripeRow}>
    <Text style={styles.stripeRowLabel}>{label}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name={enabled ? 'checkmark-circle' : 'close-circle'} size={16} color={enabled ? Colors.success : Colors.error} />
      <Text style={{ fontSize: 13, color: enabled ? Colors.success : Colors.error }}>
        {enabled ? 'Enabled' : 'Pending'}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
  profileHeader: {
    alignItems: 'center', paddingVertical: Spacing.xxxl,
    paddingTop: 60,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  name: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
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
  stripeStatus: { gap: 8 },
  stripeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  stripeRowLabel: { fontSize: 14, color: Colors.textSecondary },
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
    backgroundColor: Colors.errorBg, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginVertical: Spacing.lg,
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: Colors.error },
  version: { textAlign: 'center', fontSize: 12, color: Colors.textTertiary, marginBottom: Spacing.xl },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.xl, paddingBottom: 40,
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
});
