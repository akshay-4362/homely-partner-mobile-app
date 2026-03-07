import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, BorderRadius } from '../theme/colors';
import { Card } from '../components/common/Card';
import { proApi } from '../api/proApi';

interface Review {
  _id: string;
  rating: number;
  comment?: string;
  customer: {
    firstName: string;
    lastName: string;
    profilePicture?: string;
  };
  booking: {
    bookingNumber: string;
    scheduledAt: string;
  };
  createdAt: string;
  // Category ratings
  punctuality?: number;
  professionalism?: number;
  quality?: number;
  friendliness?: number;
}

interface RatingStats {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  categoryAverages?: {
    punctuality?: number;
    professionalism?: number;
    quality?: number;
    friendliness?: number;
  };
}

// Bad rating reason categories
const BAD_RATING_REASONS = [
  { id: 'behaviour', label: 'Partner Behaviour', icon: 'person-outline' as const },
  { id: 'punctuality', label: 'Punctuality', icon: 'time-outline' as const },
  { id: 'quality', label: 'Quality of Work', icon: 'star-outline' as const },
  { id: 'professionalism', label: 'Professionalism', icon: 'briefcase-outline' as const },
];

export const RatingsDetailScreen = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showAllRatings, setShowAllRatings] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [expandedReasonId, setExpandedReasonId] = useState<string | null>(null);
  const [showHowRatingWorks, setShowHowRatingWorks] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, reviewsData] = await Promise.all([
        proApi.fetchMyRatingStats(),
        proApi.fetchMyReviews(),
      ]);

      console.log('Rating Stats:', statsData);
      console.log('Reviews Data:', reviewsData);

      setStats(statsData);
      // Sort reviews by most recent first
      setReviews(Array.isArray(reviewsData) ? reviewsData.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ) : []);
    } catch (error) {
      console.error('Failed to load ratings data:', error);
      // Set default empty data on error
      setStats({
        averageRating: 5,
        totalReviews: 0,
        ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        categoryAverages: {},
      });
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const getRankDetails = (rating: number) => {
    if (rating >= 4.75) {
      return { rank: 'Gold', threshold: 4.75, icon: '🏅', color: '#FFD700' };
    } else if (rating >= 4.65) {
      return { rank: 'Silver', threshold: 4.65, icon: '🥈', color: '#C0C0C0' };
    } else {
      return { rank: 'Bronze', threshold: 4.55, icon: '🥉', color: '#CD7F32' };
    }
  };

  const getFilteredReviews = () => {
    if (selectedFilter === 'all') return reviews;
    const rating = parseFloat(selectedFilter);

    // Handle different rating ranges
    if (rating === 1) {
      return reviews.filter((r) => r.rating >= 1 && r.rating < 2);
    } else if (rating === 1.5) {
      return reviews.filter((r) => r.rating >= 1.5 && r.rating < 2);
    } else if (rating === 2) {
      return reviews.filter((r) => r.rating >= 2 && r.rating < 3);
    } else if (rating === 3) {
      return reviews.filter((r) => r.rating >= 3 && r.rating < 4);
    } else if (rating === 4) {
      return reviews.filter((r) => r.rating >= 4 && r.rating < 5);
    } else if (rating === 5) {
      return reviews.filter((r) => r.rating === 5);
    }

    return reviews;
  };

  // Calculate filter counts
  const getFilterCount = (filterRating: string): number => {
    if (filterRating === 'all') return reviews.length;
    const rating = parseFloat(filterRating);

    if (rating === 1) {
      return reviews.filter((r) => r.rating >= 1 && r.rating < 2).length;
    } else if (rating === 1.5) {
      return reviews.filter((r) => r.rating >= 1.5 && r.rating < 2).length;
    } else if (rating === 2) {
      return reviews.filter((r) => r.rating >= 2 && r.rating < 3).length;
    } else if (rating === 3) {
      return reviews.filter((r) => r.rating >= 3 && r.rating < 4).length;
    } else if (rating === 4) {
      return reviews.filter((r) => r.rating >= 4 && r.rating < 5).length;
    } else if (rating === 5) {
      return reviews.filter((r) => r.rating === 5).length;
    }

    return 0;
  };

  const getReasonComplaints = (reasonId: string): { issue: string; count: number }[] => {
    // Analyze reviews to find issues related to this reason
    const complaints: { issue: string; count: number }[] = [];

    if (reasonId === 'behaviour') {
      // Count reviews with comments mentioning pricing issues
      const pricingIssues = reviews.filter((r) =>
        r.rating < 4 && r.comment?.toLowerCase().includes('price')
      ).length;

      const rudeIssues = reviews.filter((r) =>
        r.rating < 4 && (r.comment?.toLowerCase().includes('rude') ||
        r.comment?.toLowerCase().includes('behavior') ||
        r.comment?.toLowerCase().includes('behaviour'))
      ).length;

      const forcedRating = reviews.filter((r) =>
        r.rating < 4 && (r.comment?.toLowerCase().includes('forced') ||
        r.comment?.toLowerCase().includes('pressure'))
      ).length;

      if (pricingIssues > 0) complaints.push({ issue: 'Quoted higher price than app', count: pricingIssues });
      if (forcedRating > 0) complaints.push({ issue: 'Forced for 5 stars', count: forcedRating });
      if (rudeIssues > 0) complaints.push({ issue: 'Rude behavior', count: rudeIssues });

      // Add generic count if no specific complaints found but has low behaviour ratings
      if (complaints.length === 0) {
        const lowBehaviourCount = reviews.filter((r) => r.rating < 4 && r.friendliness && r.friendliness < 4).length;
        if (lowBehaviourCount > 0) {
          complaints.push({ issue: 'Customer concerns about behavior', count: lowBehaviourCount });
        }
      }
    } else if (reasonId === 'punctuality') {
      const punctualityIssues = reviews.filter((r) =>
        r.rating < 4 && r.punctuality && r.punctuality < 4
      ).length;

      const lateArrival = reviews.filter((r) =>
        r.rating < 4 && r.comment?.toLowerCase().includes('late')
      ).length;

      if (lateArrival > 0) complaints.push({ issue: 'Arrived late', count: lateArrival });
      if (punctualityIssues > lateArrival) {
        complaints.push({ issue: 'Did not arrive on time', count: punctualityIssues - lateArrival });
      }
    } else if (reasonId === 'quality') {
      const qualityIssues = reviews.filter((r) =>
        r.rating < 4 && r.quality && r.quality < 4
      ).length;

      const poorWork = reviews.filter((r) =>
        r.rating < 4 && (r.comment?.toLowerCase().includes('poor') ||
        r.comment?.toLowerCase().includes('bad quality'))
      ).length;

      const incomplete = reviews.filter((r) =>
        r.rating < 4 && r.comment?.toLowerCase().includes('incomplete')
      ).length;

      if (poorWork > 0) complaints.push({ issue: 'Poor quality work', count: poorWork });
      if (incomplete > 0) complaints.push({ issue: 'Incomplete work', count: incomplete });
      if (complaints.length === 0 && qualityIssues > 0) {
        complaints.push({ issue: 'Quality concerns', count: qualityIssues });
      }
    } else if (reasonId === 'professionalism') {
      const professionalismIssues = reviews.filter((r) =>
        r.rating < 4 && r.professionalism && r.professionalism < 4
      ).length;

      const unprofessional = reviews.filter((r) =>
        r.rating < 4 && r.comment?.toLowerCase().includes('unprofessional')
      ).length;

      const communication = reviews.filter((r) =>
        r.rating < 4 && r.comment?.toLowerCase().includes('communication')
      ).length;

      if (unprofessional > 0) complaints.push({ issue: 'Unprofessional attitude', count: unprofessional });
      if (communication > 0) complaints.push({ issue: 'Poor communication', count: communication });
      if (complaints.length === 0 && professionalismIssues > 0) {
        complaints.push({ issue: 'Professionalism concerns', count: professionalismIssues });
      }
    }

    return complaints;
  };

  const renderReview = ({ item }: { item: Review }) => (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <View style={styles.customerInfo}>
          {item.customer.profilePicture ? (
            <Image source={{ uri: item.customer.profilePicture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={24} color={Colors.textSecondary} />
            </View>
          )}
          <View>
            <Text style={styles.customerName}>Verified customer</Text>
            <Text style={styles.reviewDate}>
              {new Date(item.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={14} color="#FFD700" />
          <Text style={styles.ratingText}>{item.rating}</Text>
        </View>
      </View>
      {item.comment && <Text style={styles.reviewComment}>{item.comment}</Text>}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!stats) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loader}>
          <Text style={styles.errorText}>Failed to load rating data</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentRank = getRankDetails(stats.averageRating);
  const lowRatings = reviews.filter((r) => r.rating < 4);
  const last10Ratings = reviews.slice(0, 10).map((r) => r.rating);
  const ratingTrend = last10Ratings.length > 1 ? last10Ratings[0] - last10Ratings[last10Ratings.length - 1] : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ratings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Overall Rating */}
        <View style={styles.overallSection}>
          {stats.totalReviews === 0 ? (
            <>
              <Text style={styles.overallRating}>No ratings yet</Text>
              <Text style={styles.overallSubtitle}>Complete jobs to receive ratings from customers</Text>
              <Card style={styles.infoCard}>
                <Ionicons name="information-circle" size={24} color={Colors.primary} />
                <Text style={styles.infoText}>
                  Your rating will appear here once customers review your completed jobs
                </Text>
              </Card>
            </>
          ) : (
            <>
              <Text style={styles.overallRating}>{stats.averageRating.toFixed(2)} rating</Text>
              <Text style={styles.overallSubtitle}>In last {stats.totalReviews} jobs</Text>

              {stats.averageRating < 4.55 && (
                <Card style={styles.warningCard}>
                  <Ionicons name="alert-circle" size={24} color="#FFA500" />
                  <Text style={styles.warningText}>
                    Rating will not be considered for your review in this cycle
                  </Text>
                </Card>
              )}
            </>
          )}
        </View>

        {/* Rank Targets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rank targets</Text>
          <View style={styles.rankList}>
            <View style={styles.rankItem}>
              <Text style={styles.rankIcon}>🏅</Text>
              <Text style={styles.rankText}>Keep 4.75 or above for Gold</Text>
            </View>
            <View style={styles.rankItem}>
              <Text style={styles.rankIcon}>🥈</Text>
              <Text style={styles.rankText}>Keep 4.65 or above for Silver</Text>
            </View>
            <View style={styles.rankItem}>
              <Text style={styles.rankIcon}>🥉</Text>
              <Text style={styles.rankText}>Keep 4.55 or above for Bronze</Text>
            </View>
          </View>
        </View>

        {/* Last 10 Ratings */}
        {stats.totalReviews > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Last 10 ratings</Text>
            {last10Ratings.length > 1 && (
              <View style={styles.trendRow}>
                <Ionicons
                  name={ratingTrend >= 0 ? 'arrow-down' : 'arrow-up'}
                  size={16}
                  color={ratingTrend >= 0 ? Colors.error : Colors.success}
                />
                <Text style={[styles.trendText, { color: ratingTrend >= 0 ? Colors.error : Colors.success }]}>
                  {Math.abs(ratingTrend).toFixed(2)} {ratingTrend >= 0 ? 'TO' : 'FROM'} {last10Ratings[0]?.toFixed(2)}
                </Text>
              </View>
            )}

            <View style={styles.ratingsRow}>
              {last10Ratings.map((rating, index) => (
                <View
                  key={index}
                  style={[
                    styles.ratingChip,
                    rating >= 4.5 ? styles.goodChip : rating >= 4 ? styles.warningChip : styles.badChip,
                  ]}
                >
                  <Text style={styles.ratingChipText}>{rating}</Text>
                </View>
              ))}
            </View>

            {reviews.length > 10 && (
              <View>
                <Text style={styles.comingSoonText}>{reviews.length - 10} ratings coming soon</Text>
                <TouchableOpacity onPress={() => setShowAllRatings(true)}>
                  <Text style={styles.viewAllLink}>View all ratings →</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Bad Rating Reasons */}
        {stats.totalReviews > 0 && lowRatings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bad rating reasons</Text>
            {BAD_RATING_REASONS.map((reason) => {
              const complaints = getReasonComplaints(reason.id);
              const totalComplaints = complaints.reduce((sum, c) => sum + c.count, 0);

              if (totalComplaints === 0) return null;

              return (
                <View key={reason.id}>
                  <TouchableOpacity
                    style={styles.reasonItem}
                    onPress={() =>
                      setExpandedReasonId(expandedReasonId === reason.id ? null : reason.id)
                    }
                    activeOpacity={0.7}
                  >
                    <View style={styles.reasonLeft}>
                      <View style={styles.reasonIcon}>
                        <Ionicons name={reason.icon} size={24} color={Colors.error} />
                      </View>
                      <View>
                        <Text style={styles.reasonTitle}>{reason.label}</Text>
                        <Text style={styles.reasonCount}>{totalComplaints} complaints</Text>
                      </View>
                    </View>
                    <Ionicons
                      name={expandedReasonId === reason.id ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={Colors.textSecondary}
                    />
                  </TouchableOpacity>

                  {expandedReasonId === reason.id && (
                    <View style={styles.reasonDetails}>
                      <View style={styles.reasonHeader}>
                        <View style={styles.reasonIconLarge}>
                          <Ionicons name={reason.icon} size={40} color={Colors.error} />
                        </View>
                        <Text style={styles.reasonDetailTitle}>{reason.label}</Text>
                        <Text style={styles.reasonDetailCount}>{totalComplaints} complaints</Text>
                      </View>
                      {complaints.map((complaint, idx) => (
                        <View key={idx} style={styles.complaintItem}>
                          <Text style={styles.complaintText}>{complaint.issue}</Text>
                          <View style={styles.complaintBadge}>
                            <Text style={styles.complaintBadgeText}>{complaint.count}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Learn More Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learn more</Text>
          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => setShowHowRatingWorks(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>How ratings work</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* How Rating Works Modal */}
      <Modal visible={showHowRatingWorks} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>How ratings work</Text>
            <TouchableOpacity onPress={() => setShowHowRatingWorks(false)}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.howItWorksContent} showsVerticalScrollIndicator={false}>
            {/* Rating Overview */}
            <View style={styles.howItWorksSection}>
              <View style={styles.howItWorksIconContainer}>
                <Ionicons name="star" size={32} color="#FFD700" />
              </View>
              <Text style={styles.howItWorksTitle}>Your Rating Score</Text>
              <Text style={styles.howItWorksText}>
                Your rating is calculated based on feedback from customers after each completed job.
                It's the average of all ratings you've received from customers.
              </Text>
            </View>

            <View style={styles.divider} />

            {/* Rating Criteria */}
            <View style={styles.howItWorksSection}>
              <View style={styles.howItWorksIconContainer}>
                <Ionicons name="checkmark-circle" size={32} color={Colors.success} />
              </View>
              <Text style={styles.howItWorksTitle}>What Customers Rate</Text>
              <Text style={styles.howItWorksText}>
                Customers can rate you on multiple aspects of your service:
              </Text>
              <View style={styles.criteriaList}>
                <View style={styles.criteriaItem}>
                  <Ionicons name="time-outline" size={20} color={Colors.primary} />
                  <Text style={styles.criteriaText}>
                    <Text style={styles.criteriaBold}>Punctuality:</Text> Did you arrive on time?
                  </Text>
                </View>
                <View style={styles.criteriaItem}>
                  <Ionicons name="briefcase-outline" size={20} color={Colors.primary} />
                  <Text style={styles.criteriaText}>
                    <Text style={styles.criteriaBold}>Professionalism:</Text> Was your conduct professional?
                  </Text>
                </View>
                <View style={styles.criteriaItem}>
                  <Ionicons name="star-outline" size={20} color={Colors.primary} />
                  <Text style={styles.criteriaText}>
                    <Text style={styles.criteriaBold}>Quality:</Text> Was the work done well?
                  </Text>
                </View>
                <View style={styles.criteriaItem}>
                  <Ionicons name="happy-outline" size={20} color={Colors.primary} />
                  <Text style={styles.criteriaText}>
                    <Text style={styles.criteriaBold}>Friendliness:</Text> Were you polite and friendly?
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Rank System */}
            <View style={styles.howItWorksSection}>
              <View style={styles.howItWorksIconContainer}>
                <Text style={{ fontSize: 32 }}>🏅</Text>
              </View>
              <Text style={styles.howItWorksTitle}>Performance Ranks</Text>
              <Text style={styles.howItWorksText}>
                Your rating determines your performance rank, which affects job priority and rewards:
              </Text>
              <View style={styles.rankDetailsList}>
                <View style={styles.rankDetailItem}>
                  <Text style={styles.rankDetailIcon}>🏅</Text>
                  <View style={styles.rankDetailContent}>
                    <Text style={styles.rankDetailTitle}>Gold (4.75+)</Text>
                    <Text style={styles.rankDetailDesc}>Highest priority for new jobs, premium rewards</Text>
                  </View>
                </View>
                <View style={styles.rankDetailItem}>
                  <Text style={styles.rankDetailIcon}>🥈</Text>
                  <View style={styles.rankDetailContent}>
                    <Text style={styles.rankDetailTitle}>Silver (4.65+)</Text>
                    <Text style={styles.rankDetailDesc}>High priority for jobs, good rewards</Text>
                  </View>
                </View>
                <View style={styles.rankDetailItem}>
                  <Text style={styles.rankDetailIcon}>🥉</Text>
                  <View style={styles.rankDetailContent}>
                    <Text style={styles.rankDetailTitle}>Bronze (4.55+)</Text>
                    <Text style={styles.rankDetailDesc}>Standard job allocation</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Impact on Performance */}
            <View style={styles.howItWorksSection}>
              <View style={styles.howItWorksIconContainer}>
                <Ionicons name="trending-up" size={32} color={Colors.success} />
              </View>
              <Text style={styles.howItWorksTitle}>Impact on Your Performance</Text>
              <Text style={styles.howItWorksText}>
                Your rating directly affects:
              </Text>
              <View style={styles.impactList}>
                <View style={styles.impactItem}>
                  <Ionicons name="briefcase" size={16} color={Colors.success} />
                  <Text style={styles.impactText}>Number of jobs you receive</Text>
                </View>
                <View style={styles.impactItem}>
                  <Ionicons name="trophy" size={16} color={Colors.success} />
                  <Text style={styles.impactText}>Your rank and rewards eligibility</Text>
                </View>
                <View style={styles.impactItem}>
                  <Ionicons name="trending-up" size={16} color={Colors.success} />
                  <Text style={styles.impactText}>Priority in job assignment</Text>
                </View>
                <View style={styles.impactItem}>
                  <Ionicons name="star" size={16} color={Colors.success} />
                  <Text style={styles.impactText}>Visibility to premium customers</Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Tips to Improve */}
            <View style={styles.howItWorksSection}>
              <View style={styles.howItWorksIconContainer}>
                <Ionicons name="bulb" size={32} color="#FFA500" />
              </View>
              <Text style={styles.howItWorksTitle}>Tips to Maintain High Ratings</Text>
              <View style={styles.tipsList}>
                <View style={styles.tipItem}>
                  <View style={styles.tipNumber}>
                    <Text style={styles.tipNumberText}>1</Text>
                  </View>
                  <Text style={styles.tipText}>
                    Always arrive on time or inform the customer in advance if delayed
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <View style={styles.tipNumber}>
                    <Text style={styles.tipNumberText}>2</Text>
                  </View>
                  <Text style={styles.tipText}>
                    Be professional and courteous throughout the service
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <View style={styles.tipNumber}>
                    <Text style={styles.tipNumberText}>3</Text>
                  </View>
                  <Text style={styles.tipText}>
                    Complete all work thoroughly and check for quality
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <View style={styles.tipNumber}>
                    <Text style={styles.tipNumberText}>4</Text>
                  </View>
                  <Text style={styles.tipText}>
                    Communicate clearly about pricing and any additional charges before starting
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <View style={styles.tipNumber}>
                    <Text style={styles.tipNumberText}>5</Text>
                  </View>
                  <Text style={styles.tipText}>
                    Address customer concerns promptly and professionally
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <View style={styles.tipNumber}>
                    <Text style={styles.tipNumberText}>6</Text>
                  </View>
                  <Text style={styles.tipText}>
                    Never ask or pressure customers for 5-star ratings
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Warning Section */}
            <View style={[styles.howItWorksSection, styles.warningSection]}>
              <View style={styles.howItWorksIconContainer}>
                <Ionicons name="alert-circle" size={32} color={Colors.error} />
              </View>
              <Text style={styles.howItWorksTitle}>Important Note</Text>
              <Text style={styles.howItWorksText}>
                If your rating drops below 4.55, you may:
              </Text>
              <View style={styles.warningList}>
                <Text style={styles.warningText}>• Receive fewer job assignments</Text>
                <Text style={styles.warningText}>• Not be eligible for performance rewards</Text>
                <Text style={styles.warningText}>• Be excluded from performance reviews</Text>
                <Text style={styles.warningText}>• Risk account suspension if ratings continue to drop</Text>
              </View>
              <Text style={[styles.howItWorksText, { marginTop: Spacing.md, fontWeight: '600' }]}>
                Maintain a rating of 4.55 or above to ensure continuous job flow and eligibility for rewards.
              </Text>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* View All Ratings Modal */}
      <Modal visible={showAllRatings} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAllRatings(false)}>
              <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAllRatings(false)}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterTabs}
            contentContainerStyle={styles.filterTabsContent}
          >
            <TouchableOpacity
              style={[styles.filterTab, selectedFilter === 'all' && styles.filterTabActive]}
              onPress={() => setSelectedFilter('all')}
            >
              <Text style={[styles.filterTabText, selectedFilter === 'all' && styles.filterTabTextActive]}>
                All ratings ({getFilterCount('all')})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, selectedFilter === '1' && styles.filterTabActive]}
              onPress={() => setSelectedFilter('1')}
            >
              <Text style={[styles.filterTabText, selectedFilter === '1' && styles.filterTabTextActive]}>
                ★1 ({getFilterCount('1')})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, selectedFilter === '1.5' && styles.filterTabActive]}
              onPress={() => setSelectedFilter('1.5')}
            >
              <Text style={[styles.filterTabText, selectedFilter === '1.5' && styles.filterTabTextActive]}>
                ★1.5 ({getFilterCount('1.5')})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, selectedFilter === '2' && styles.filterTabActive]}
              onPress={() => setSelectedFilter('2')}
            >
              <Text style={[styles.filterTabText, selectedFilter === '2' && styles.filterTabTextActive]}>
                ★2 ({getFilterCount('2')})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, selectedFilter === '3' && styles.filterTabActive]}
              onPress={() => setSelectedFilter('3')}
            >
              <Text style={[styles.filterTabText, selectedFilter === '3' && styles.filterTabTextActive]}>
                ★3 ({getFilterCount('3')})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, selectedFilter === '4' && styles.filterTabActive]}
              onPress={() => setSelectedFilter('4')}
            >
              <Text style={[styles.filterTabText, selectedFilter === '4' && styles.filterTabTextActive]}>
                ★4 ({getFilterCount('4')})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, selectedFilter === '5' && styles.filterTabActive]}
              onPress={() => setSelectedFilter('5')}
            >
              <Text style={[styles.filterTabText, selectedFilter === '5' && styles.filterTabTextActive]}>
                ★5 ({getFilterCount('5')})
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <FlatList
            data={getFilteredReviews()}
            renderItem={renderReview}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.reviewsList}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No ratings in this category</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
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
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
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
  overallSection: {
    marginBottom: Spacing.xl,
  },
  overallRating: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  overallSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: '#FFF3CD',
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  rankList: {
    gap: Spacing.md,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  rankIcon: {
    fontSize: 24,
  },
  rankText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  trendText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ratingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  ratingChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    minWidth: 50,
    alignItems: 'center',
  },
  goodChip: {
    backgroundColor: '#E8F5E9',
  },
  warningChip: {
    backgroundColor: '#FFF3CD',
  },
  badChip: {
    backgroundColor: '#FFEBEE',
  },
  ratingChipText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  comingSoonText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  viewAllLink: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  reasonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  reasonIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  reasonCount: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  reasonDetails: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  reasonHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  reasonIconLarge: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  reasonDetailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  reasonDetailCount: {
    fontSize: 16,
    color: Colors.error,
    fontWeight: '600',
  },
  complaintItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  complaintText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  complaintBadge: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    minWidth: 30,
    alignItems: 'center',
  },
  complaintBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  filterTabs: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  filterTabsContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.background,
  },
  filterTabActive: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: '#fff',
  },
  reviewsList: {
    padding: Spacing.lg,
  },
  reviewItem: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  reviewDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  reviewComment: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  // How Rating Works Modal Styles
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  howItWorksContent: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  howItWorksSection: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  howItWorksIconContainer: {
    marginBottom: Spacing.md,
  },
  howItWorksTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  howItWorksText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.md,
  },
  // Rating Criteria Styles
  criteriaList: {
    width: '100%',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  criteriaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  criteriaText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  criteriaBold: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  // Rank Details Styles
  rankDetailsList: {
    width: '100%',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  rankDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  rankDetailIcon: {
    fontSize: 32,
  },
  rankDetailContent: {
    flex: 1,
  },
  rankDetailTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  rankDetailDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  // Impact List Styles
  impactList: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  impactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  impactText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  // Tips List Styles
  tipsList: {
    width: '100%',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  tipNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  // Warning Section Styles
  warningSection: {
    backgroundColor: '#FFF3CD',
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.lg,
  },
  warningList: {
    width: '100%',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  warningText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primaryBg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
});
