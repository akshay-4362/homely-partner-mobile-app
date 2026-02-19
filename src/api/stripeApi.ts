import client from './client';

export const stripeApi = {
  createAccount: async (email: string) => {
    const { data } = await client.post('/professionals/stripe/account', { email });
    return data;
  },

  getOnboardingLink: async (refreshUrl: string, returnUrl: string) => {
    const { data } = await client.post('/professionals/stripe/onboarding-link', {
      refreshUrl,
      returnUrl,
    });
    return data;
  },

  getAccountStatus: async () => {
    const { data } = await client.get('/professionals/stripe/account-status');
    return data;
  },
};
