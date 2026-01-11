import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../server';
import { z } from 'zod';

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2)
});

export const authenticateToken = (req: any, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);
    
    const existingProfile = await prisma.profile.findFirst({
      where: { id: email }
    });

    if (existingProfile) {
      return res.status(400).json({ error: 'Profile already exists' });
    }

    const profile = await prisma.profile.create({
      data: {
        id: email,
        subscriptionTier: 'Starter',
        creditBalance: 100
      }
    });

    const token = jwt.sign(
      { id: profile.id, email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      profile: {
        id: profile.id,
        subscriptionTier: profile.subscriptionTier,
        creditBalance: profile.creditBalance
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    const profile = await prisma.profile.findUnique({
      where: { id: email }
    });

    if (!profile) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: profile.id, email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      profile: {
        id: profile.id,
        subscriptionTier: profile.subscriptionTier,
        creditBalance: profile.creditBalance
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/profile', authenticateToken, async (req: any, res) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: req.user.id },
      include: {
        universes: {
          select: { id: true, title: true, createdAt: true }
        },
        styles: {
          select: { id: true, name: true, createdAt: true }
        }
      }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      profile: {
        id: profile.id,
        subscriptionTier: profile.subscriptionTier,
        creditBalance: profile.creditBalance,
        universes: profile.universes,
        styles: profile.styles,
        createdAt: profile.createdAt
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;