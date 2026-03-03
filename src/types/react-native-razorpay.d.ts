declare module 'react-native-razorpay' {
  interface RazorpayOptions {
    description?: string;
    image?: string;
    currency: string;
    key: string;
    amount: number;
    name: string;
    order_id: string;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    theme?: {
      color?: string;
    };
    [key: string]: unknown;
  }

  interface RazorpayPaymentData {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature?: string;
    [key: string]: unknown;
  }

  interface RazorpayCheckoutType {
    open(options: RazorpayOptions): Promise<RazorpayPaymentData>;
    PAYMENT_CANCELLED?: string | number;
  }

  const RazorpayCheckout: RazorpayCheckoutType;
  export default RazorpayCheckout;
}
