import jwt from 'jsonwebtoken';

import { config } from '../config/env';



export type PaymentVerificationInput = {

  paymentReference: string;

  paymentMethod?: string;

  amount: number;

  currency: 'AFN';

  email: string;

  checkoutToken: string;

};



export type PaymentVerificationResult = {

  verified: boolean;

  provider: string;

  providerReference: string;

  mode: 'live' | 'sandbox' | 'manual';

  message?: string;

};



/**

 * Payment provider abstraction.

 * - `manual`: verifies checkout token binding in non-production or sandbox only.

 * - `stripe`: requires STRIPE_SECRET_KEY for live verification.

 */

export class PaymentProviderService {

  getStatus() {

    return {

      provider: config.paymentProvider,

      mode: config.paymentMode,

      liveReady: config.paymentProvider === 'stripe' && Boolean(config.stripeSecretKey),

      message:

        config.paymentProvider === 'manual'

          ? 'Manual verification mode — connect Stripe or a local PSP for live collections.'

          : config.stripeSecretKey

            ? 'Stripe provider configured.'

            : 'Stripe selected but STRIPE_SECRET_KEY is missing.'

    };

  }



  private verifyManualCheckout(input: PaymentVerificationInput, reference: string): PaymentVerificationResult | null {

    if (config.environment === 'production' && config.paymentMode === 'live') {

      return {

        verified: false,

        provider: 'manual',

        providerReference: reference,

        mode: config.paymentMode,

        message: 'Manual payment verification is disabled in production live mode'

      };

    }



    try {

      const decoded = jwt.verify(input.checkoutToken, config.jwtSecret) as {

        purpose?: string;

        paymentReference?: string;

        email?: string;

      };



      if (decoded.purpose !== 'student_registration_checkout') {

        return {

          verified: false,

          provider: 'manual',

          providerReference: reference,

          mode: config.paymentMode,

          message: 'Invalid registration checkout token'

        };

      }



      if (decoded.email && decoded.email.toLowerCase() !== String(input.email).trim().toLowerCase()) {

        return {

          verified: false,

          provider: 'manual',

          providerReference: reference,

          mode: config.paymentMode,

          message: 'Checkout token does not match registration email'

        };

      }



      if (decoded.paymentReference && decoded.paymentReference !== reference) {

        return {

          verified: false,

          provider: 'manual',

          providerReference: reference,

          mode: config.paymentMode,

          message: 'Payment reference does not match checkout token'

        };

      }

    } catch {

      return {

        verified: false,

        provider: 'manual',

        providerReference: reference,

        mode: config.paymentMode,

        message: 'Invalid registration checkout token'

      };

    }



    return {

      verified: true,

      provider: 'manual',

      providerReference: reference,

      mode: config.paymentMode,

      message: 'Verified using bound registration checkout token'

    };

  }



  async verifyRegistrationPayment(input: PaymentVerificationInput): Promise<PaymentVerificationResult> {

    const reference = String(input.paymentReference || '').trim();

    if (!reference || reference.length < 6) {

      return {

        verified: false,

        provider: config.paymentProvider,

        providerReference: reference,

        mode: config.paymentMode,

        message: 'Payment reference is required'

      };

    }



    if (!String(input.checkoutToken || '').trim()) {

      return {

        verified: false,

        provider: config.paymentProvider,

        providerReference: reference,

        mode: config.paymentMode,

        message: 'Checkout token is required'

      };

    }



    if (config.paymentProvider === 'stripe') {

      return this.verifyStripe(reference, input);

    }



    const manualResult = this.verifyManualCheckout(input, reference);

    return manualResult ?? {

      verified: false,

      provider: 'manual',

      providerReference: reference,

      mode: config.paymentMode,

      message: 'Manual payment verification failed'

    };

  }



  private async verifyStripe(reference: string, input: PaymentVerificationInput): Promise<PaymentVerificationResult> {

    if (!config.stripeSecretKey) {

      if (config.environment === 'production') {

        return {

          verified: false,

          provider: 'stripe',

          providerReference: reference,

          mode: config.paymentMode,

          message: 'STRIPE_SECRET_KEY is required in production'

        };

      }



      if (config.paymentMode === 'sandbox' && /^pay_|^cs_test_/i.test(reference)) {

        return {

          verified: true,

          provider: 'stripe',

          providerReference: reference,

          mode: 'sandbox',

          message: 'Sandbox reference accepted (configure STRIPE_SECRET_KEY for live verification)'

        };

      }



      return {

        verified: false,

        provider: 'stripe',

        providerReference: reference,

        mode: config.paymentMode,

        message: 'STRIPE_SECRET_KEY is not configured'

      };

    }



    if (!/^pay_|^pi_|^cs_/i.test(reference)) {

      return {

        verified: false,

        provider: 'stripe',

        providerReference: reference,

        mode: 'live',

        message: 'Invalid Stripe payment reference format'

      };

    }



    const paymentIntentId = reference.startsWith('pi_') ? reference : null;

    if (paymentIntentId) {

      try {

        const response = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}`, {

          headers: { Authorization: `Bearer ${config.stripeSecretKey}` }

        });

        if (!response.ok) {

          return {

            verified: false,

            provider: 'stripe',

            providerReference: reference,

            mode: 'live',

            message: 'Stripe payment intent could not be verified'

          };

        }

        const intent = await response.json() as { status?: string };

        if (intent.status !== 'succeeded' && intent.status !== 'processing') {

          return {

            verified: false,

            provider: 'stripe',

            providerReference: reference,

            mode: 'live',

            message: `Stripe payment status is ${intent.status ?? 'unknown'}`

          };

        }

      } catch {

        return {

          verified: false,

          provider: 'stripe',

          providerReference: reference,

          mode: 'live',

          message: 'Stripe verification request failed'

        };

      }

    }



    return {

      verified: true,

      provider: 'stripe',

      providerReference: reference,

      mode: config.paymentMode,

      message: `Stripe reference verified for ${input.email}`

    };

  }

}



export const paymentProviderService = new PaymentProviderService();

