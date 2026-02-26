import client from './client';

export interface CreateReviewPayload {
  bookingId: string;
  rating: number;
  comment?: string;
  punctuality?: number;
  professionalism?: number;
  quality?: number;
  friendliness?: number;
}

export interface Review {
  _id: string;
  booking: any;
  reviewType: 'customer_to_professional' | 'professional_to_customer';
  reviewer: string;
  reviewee: string;
  rating: number;
  comment?: string;
  punctuality?: number;
  professionalism?: number;
  quality?: number;
  friendliness?: number;
  createdAt: string;
  customer?: {
    _id: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
    rating?: number;
    reviewCount?: number;
  };
}

export interface RatingStats {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  categoryAverages: {
    punctuality?: number;
    professionalism?: number;
    quality?: number;
    friendliness?: number;
  };
}

export const reviewApi = {
  // Professional creates review for customer
  createReviewForCustomer: async (payload: CreateReviewPayload) => {
    const { data } = await client.post('/reviews/professional-to-customer', payload);
    return data.data || data;
  },

  // Get my reviews (reviews received from customers)
  getMyReviews: async () => {
    const { data } = await client.get('/reviews/me');
    return data.data || data;
  },

  // Get my rating statistics
  getMyStats: async () => {
    const { data } = await client.get<{ data: RatingStats }>('/reviews/me/stats');
    return data.data || data;
  },

  // Get reviews I gave to customers
  getReviewsIGave: async () => {
    const { data } = await client.get('/reviews/my-reviews-given');
    return data.data || data;
  },

  // Get review status for a booking
  getBookingReviewStatus: async (bookingId: string) => {
    const { data } = await client.get(`/reviews/booking/${bookingId}/status`);
    return data.data || data;
  },
};
