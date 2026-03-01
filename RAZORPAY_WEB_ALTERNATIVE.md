# Alternative: Razorpay Web Checkout (No Native Module)

If you don't want to rebuild the app, use this web-based approach that works with just JavaScript:

## Option 1: Expo WebBrowser (Recommended)

### Install Package
```bash
npm install expo-web-browser
```

### Update PurchaseCreditsModal.tsx

Replace the import and handlePurchase function:

```typescript
// Replace this:
// import RazorpayCheckout from 'react-native-razorpay';

// With this:
import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

// Replace handlePurchase with:
const handlePurchase = async () => {
  try {
    setProcessing(true);

    // Step 1: Create Razorpay order on backend
    console.log('🟡 Creating Razorpay order...');
    const { data } = await creditApi.createPurchaseIntent(selectedAmount);
    console.log('🟡 Razorpay order created:', data);
    const { orderId, keyId } = data;

    // Step 2: Build Razorpay checkout URL
    const callbackUrl = encodeURIComponent('https://homely-backend.vercel.app/api/v1/credits/payment-callback');
    const checkoutUrl = `https://api.razorpay.com/v1/checkout/embedded?key_id=${keyId}&order_id=${orderId}&name=Homelyo&description=Credit Purchase&callback_url=${callbackUrl}`;

    console.log('🟡 Opening Razorpay checkout:', checkoutUrl);

    // Step 3: Open in in-app browser
    const result = await WebBrowser.openBrowserAsync(checkoutUrl, {
      dismissButtonStyle: 'close',
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
    });

    console.log('🟡 Browser result:', result);

    if (result.type === 'cancel') {
      // User closed browser
      Alert.alert('Payment Cancelled', 'You cancelled the payment');
    } else {
      // Browser closed - check payment status
      Alert.alert(
        'Payment Initiated',
        'Please wait while we verify your payment...',
        [
          {
            text: 'OK',
            onPress: () => {
              onSuccess();
              onClose();
            },
          },
        ]
      );
    }
  } catch (error: any) {
    console.error('Purchase error:', error);
    Alert.alert(
      'Purchase failed',
      error.message || 'Failed to process payment. Please try again.'
    );
  } finally {
    setProcessing(false);
  }
};
```

### Backend: Add Payment Callback Endpoint

Create a new endpoint to handle payment completion:

```typescript
// urban-backend/src/controllers/credit.controller.ts

async paymentCallback(req: Request, res: Response) {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.query;

    // Verify signature
    const isValid = verifyRazorpayWebhook(
      razorpay_order_id + '|' + razorpay_payment_id,
      razorpay_signature as string
    );

    if (!isValid) {
      return res.redirect('myapp://payment?status=failed&reason=invalid_signature');
    }

    // Payment successful - redirect to app
    res.redirect(`myapp://payment?status=success&payment_id=${razorpay_payment_id}&order_id=${razorpay_order_id}`);
  } catch (error) {
    res.redirect('myapp://payment?status=failed&reason=error');
  }
}
```

Add route:
```typescript
// urban-backend/src/routes/credit.routes.ts
router.get('/payment-callback', creditController.paymentCallback);
```

## Option 2: Simple Linking (Even Simpler)

Just open Razorpay in external browser and poll for status:

```typescript
import { Linking } from 'react-native';

const handlePurchase = async () => {
  try {
    setProcessing(true);

    // Create order
    const { data } = await creditApi.createPurchaseIntent(selectedAmount);
    const { orderId, keyId } = data;

    // Build URL
    const checkoutUrl = `https://api.razorpay.com/v1/checkout/embedded?key_id=${keyId}&order_id=${orderId}`;

    // Open in browser
    await Linking.openURL(checkoutUrl);

    // Show message
    Alert.alert(
      'Complete Payment',
      'Complete the payment in your browser. Your credits will be added automatically.',
      [
        {
          text: 'Done',
          onPress: () => {
            onSuccess(); // Refresh credits
            onClose();
          },
        },
      ]
    );
  } catch (error) {
    console.error(error);
    Alert.alert('Error', 'Failed to open payment page');
  } finally {
    setProcessing(false);
  }
};
```

## Comparison:

| Approach | Rebuild Needed | UX | Complexity |
|----------|----------------|-----|------------|
| Native Module | ✅ Yes | Best (in-app) | Medium |
| Expo WebBrowser | ❌ No | Good (in-app browser) | Low |
| Simple Linking | ❌ No | OK (external browser) | Very Low |

## Recommendation:

1. **Best UX**: Rebuild with native module (10-15 min one-time setup)
2. **Quick Fix**: Use Expo WebBrowser (5 min, works immediately)
3. **Simplest**: Use Linking (2 min, slightly worse UX)
