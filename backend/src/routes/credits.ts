import express from 'express';
import { prisma } from '../server';
import { authenticateToken } from './auth';
import { z } from 'zod';

const router = express.Router();

const purchaseSchema = z.object({
  amount: z.number().min(100).max(10000),
  paymentMethodId: z.string()
});

router.get('/balance', authenticateToken, async (req: any, res) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: req.user.id },
      select: { creditBalance: true, subscriptionTier: true }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const recentTransactions = await prisma.creditTransaction.findMany({
      where: { profileId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        amount: true,
        type: true,
        description: true,
        createdAt: true
      }
    });

    res.json({
      balance: profile.creditBalance,
      tier: profile.subscriptionTier,
      recentTransactions
    });
  } catch (error) {
    console.error('Balance fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

router.post('/purchase', authenticateToken, async (req: any, res) => {
  try {
    const { amount, paymentMethodId } = purchaseSchema.parse(req.body);
    
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100,
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true,
      return_url: `${process.env.FRONTEND_URL}/credits/success`
    });

    if (paymentIntent.status === 'succeeded') {
      await prisma.profile.update({
        where: { id: req.user.id },
        data: { creditBalance: { increment: amount } }
      });

      await prisma.creditTransaction.create({
        data: {
          profileId: req.user.id,
          amount: amount,
          type: 'Purchase',
          description: `Credit purchase: ${amount} credits`,
          metadata: { paymentIntentId: paymentIntent.id }
        }
      });

      res.json({
        success: true,
        message: 'Credits purchased successfully',
        creditsPurchased: amount
      });
    } else {
      res.status(400).json({ 
        error: 'Payment failed',
        status: paymentIntent.status 
      });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Credit purchase error:', error);
    res.status(500).json({ error: 'Credit purchase failed' });
  }
});

router.get('/tiers', (req, res) => {
  const tiers = {
    Starter: {
      monthlyCredits: 100,
      maxBooks: 1,
      maxUniverses: 1,
      features: ['Basic AI generation', 'Story Bible', 'Export to PDF']
    },
    Author: {
      monthlyCredits: 500,
      maxBooks: 5,
      maxUniverses: 3,
      features: ['Advanced AI generation', 'Style training', 'Audiobook export', 'Priority support']
    },
    Publisher: {
      monthlyCredits: 2000,
      maxBooks: 20,
      maxUniverses: 10,
      features: ['Premium AI models', 'Unlimited styles', 'Storefront access', 'Analytics']
    },
    Studio: {
      monthlyCredits: 10000,
      maxBooks: -1,
      maxUniverses: -1,
      features: ['All features', 'Custom AI models', 'API access', 'White-label']
    }
  };

  res.json({ tiers });
});

router.post('/upgrade', authenticateToken, async (req: any, res) => {
  try {
    const { tier } = req.body;
    const validTiers = ['Starter', 'Author', 'Publisher', 'Studio'];
    
    if (!validTiers.includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    await prisma.profile.update({
      where: { id: req.user.id },
      data: { subscriptionTier: tier }
    });

    res.json({ 
      success: true, 
      message: `Subscription upgraded to ${tier}`,
      tier 
    });

  } catch (error) {
    console.error('Tier upgrade error:', error);
    res.status(500).json({ error: 'Tier upgrade failed' });
  }
});

export default router;