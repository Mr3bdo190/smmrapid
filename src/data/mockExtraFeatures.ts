import { PaymentGatewayConfig, DiscountCoupon, AffiliateReferral, AffiliatePayoutRequest } from '../types';

export const INITIAL_PAYMENT_GATEWAYS: PaymentGatewayConfig[] = [
  {
    id: 'stripe',
    nameAr: 'بطاقات الائتمان والخصم (Stripe Visa / Mastercard)',
    nameEn: 'Credit & Debit Cards (Stripe)',
    type: 'card',
    enabled: true,
    minDeposit: 5.0,
    maxDeposit: 5000.0,
    feePercent: 2.9,
    fixedFee: 0.30,
    bonusPercent: 0,
    credentials: {
      publishableKey: 'pk_live_51Mv9K2RapidSmm82190abc',
      secretKey: 'sk_live_99812903abc8192301982',
      webhookSecret: 'whsec_89123847981274981'
    },
    instructionsAr: 'دفع فوري وآمن 100% يدعم جميع البطاقات البنكية العالمية مع حماية 3D Secure.',
    instructionsEn: 'Instant and secure payment supporting all worldwide cards with 3D Secure.'
  },
  {
    id: 'paypal',
    nameAr: 'باي بال (PayPal International)',
    nameEn: 'PayPal Gateway',
    type: 'other',
    enabled: true,
    minDeposit: 10.0,
    maxDeposit: 2000.0,
    feePercent: 4.5,
    fixedFee: 0.50,
    bonusPercent: 0,
    credentials: {
      clientId: 'Aef901928_paypal_client_id_smmrapid',
      clientSecret: 'ELK89123_paypal_secret_live_key',
      mode: 'live'
    },
    instructionsAr: 'إيداع عبر حسابك في PayPal مباشرة مع تأكيد فوري للحسابات الموثقة.',
    instructionsEn: 'Direct instant deposit from your PayPal account balance.'
  },
  {
    id: 'cryptomus',
    nameAr: 'العملات الرقمية المشفرة (Cryptomus USDT TRC20 / BEP20)',
    nameEn: 'Crypto Payments (Cryptomus USDT)',
    type: 'crypto',
    enabled: true,
    minDeposit: 10.0,
    maxDeposit: 50000.0,
    feePercent: 0.0,
    fixedFee: 0.0,
    bonusPercent: 5.0, // 5% bonus for crypto!
    credentials: {
      merchantId: 'cpm_merch_89127498124',
      paymentApiKey: 'cpm_api_719283749821387498213',
      defaultNetwork: 'TRC20',
      walletAddress: 'TX9rZk7SMMRapidGlobalNetworkTRC20Wallet890'
    },
    instructionsAr: 'ادفع عبر USDT أو BTC أو ETH بدون أي رسوم إضافية واحصل على بونص إضافي 5% فوراً!',
    instructionsEn: 'Pay with USDT, BTC or ETH with zero fees and enjoy an instant 5% bonus.'
  },
  {
    id: 'vodafone_cash',
    nameAr: 'فودافون كاش ومحافظ المحمول المصرية (E-Wallets Egypt)',
    nameEn: 'Vodafone Cash & Egyptian Wallets',
    type: 'ewallet',
    enabled: true,
    minDeposit: 2.0,
    maxDeposit: 1500.0,
    feePercent: 0.0,
    fixedFee: 0.0,
    bonusPercent: 3.0,
    credentials: {
      vodafoneNumber: '01019283746',
      orangeNumber: '01288371920',
      etisalatNumber: '01198765432',
      exchangeRate: '50.0'
    },
    instructionsAr: 'حول من أي محفظة إلكترونية بمصر (فودافون، أورنج، اتصالات، وي) بسعر 50 جنيه للدولار مع إشعار تحويل فوري.',
    instructionsEn: 'Transfer from any Egyptian mobile wallet at official exchange rate with instant approval.'
  },
  {
    id: 'instapay',
    nameAr: 'إنستاباي مصر (InstaPay IPN Egypt)',
    nameEn: 'InstaPay Egypt Instant Network',
    type: 'ewallet',
    enabled: true,
    minDeposit: 3.0,
    maxDeposit: 3000.0,
    feePercent: 0.0,
    fixedFee: 0.0,
    bonusPercent: 2.0,
    credentials: {
      ipaUsername: 'smmrapid@instapay',
      accountName: 'SMM Rapid Technology Hub'
    },
    instructionsAr: 'تحويل لحظي مباشر عبر تطبيق إنستاباي لعنوان الدفع اللحظي بدون أي عمولة.',
    instructionsEn: 'Instant direct transfer via InstaPay IPN app to username with zero fees.'
  },
  {
    id: 'bank_transfer',
    nameAr: 'التحويل البنكي المباشر (Bank Wire & IBAN)',
    nameEn: 'Direct Bank Wire Transfer',
    type: 'bank',
    enabled: true,
    minDeposit: 100.0,
    maxDeposit: 100000.0,
    feePercent: 0.0,
    fixedFee: 0.0,
    bonusPercent: 10.0,
    credentials: {
      bankName: 'National Bank / Al Rajhi Bank',
      accountName: 'SMM Rapid Global Co.',
      iban: 'SA4480000192837465019283',
      swift: 'RJHIXXXX'
    },
    instructionsAr: 'مخصص للشركات والمبالغ الكبيرة $100 فما فوق، مع بونص ضخم +10% على كل حوالة بنكية.',
    instructionsEn: 'For corporate and bulk clients ($100+), includes massive +10% bonus credit.'
  },
  {
    id: 'perfect_money',
    nameAr: 'بيرفكت موني (Perfect Money USD)',
    nameEn: 'Perfect Money USD',
    type: 'other',
    enabled: false,
    minDeposit: 5.0,
    maxDeposit: 10000.0,
    feePercent: 1.5,
    fixedFee: 0.0,
    bonusPercent: 0.0,
    credentials: {
      accountU: 'U38192019',
      passphrase: '••••••••••••'
    },
    instructionsAr: 'دفع مباشر عبر رصيد حساب Perfect Money بالدولار.',
    instructionsEn: 'Direct automated payment with Perfect Money USD wallet.'
  }
];

export const INITIAL_COUPONS: DiscountCoupon[] = [
  {
    id: 'coup-1',
    code: 'RAPID20',
    discountPercent: 20,
    minOrderAmount: 2.0,
    maxDiscountUSD: 15.0,
    usageLimit: 500,
    usedCount: 0,
    expiresAt: '2026-12-31',
    isActive: true,
    descriptionAr: 'خصم 20% ترحيبي لجميع الطلبات التي تتجاوز قيمتها $2.00',
    descriptionEn: '20% welcome discount for all orders above $2.00'
  }
];

export const INITIAL_AFFILIATE_REFERRALS: AffiliateReferral[] = [];

export const INITIAL_AFFILIATE_PAYOUTS: AffiliatePayoutRequest[] = [];
