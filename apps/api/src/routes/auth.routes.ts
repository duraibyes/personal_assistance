import { Router } from 'express';
import { prisma } from '@repo/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHmac } from 'crypto';
import { getJwtSecret, requireAuth } from '../middleware/auth.middleware';
import {
  ChangePasswordSchema,
  DeviceContinueSchema,
  DeviceInfoSchema,
  LoginSchema,
  SignupSchema,
} from '@repo/validation';

export const authRouter: Router = Router();

/** Quick-continue stops being offered for a device that hasn't been used in this long. */
const DEVICE_TRUST_DAYS = 90;

/** Keyed hash so a database leak doesn't expose raw device ids. */
function hashDevice(deviceId: string) {
  return createHmac('sha256', getJwtSecret()).update(deviceId).digest('hex');
}

function maskEmail(email: string) {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  const visible = name.length <= 2 ? name[0] : `${name[0]}${'•'.repeat(Math.min(5, name.length - 2))}${name[name.length - 1]}`;
  return `${visible}@${domain}`;
}

/** Login/signup bodies from the mobile app carry deviceId; remember that phone for this user. */
async function rememberDevice(userId: string, body: unknown) {
  const parsed = DeviceInfoSchema.safeParse(body);
  if (!parsed.success) return;
  const deviceHash = hashDevice(parsed.data.deviceId);
  await prisma.trustedDevice.upsert({
    where: { userId_deviceHash: { userId, deviceHash } },
    create: { userId, deviceHash, deviceName: parsed.data.deviceName ?? null },
    update: { lastUsedAt: new Date(), deviceName: parsed.data.deviceName ?? undefined },
  });
}

const trustCutoff = () => new Date(Date.now() - DEVICE_TRUST_DAYS * 24 * 60 * 60 * 1000);

function signToken(user: { id: string; email: string; isAdmin: boolean }) {
  return jwt.sign(
    { userId: user.id, email: user.email, isAdmin: user.isAdmin },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}

/**
 * @openapi
 * /api/auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: Create a new user account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created
 */
authRouter.post('/signup', async (req, res) => {
  try {
    const parsed = SignupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { email, password, name } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
      },
    });

    const token = signToken(user);
    await rememberDevice(user.id, req.body);

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
authRouter.post('/login', async (req, res) => {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user);
    await rememberDevice(user.id, req.body);

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

/**
 * @openapi
 * /api/auth/device/accounts:
 *   post:
 *     tags: [Auth]
 *     summary: Accounts that have signed in on this device (for "Continue as …" after a reinstall)
 *     responses:
 *       200:
 *         description: "[{ userId, name, email (masked), lastUsedAt }]"
 */
authRouter.post('/device/accounts', async (req, res) => {
  const parsed = DeviceInfoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid device id' });
  try {
    const devices = await prisma.trustedDevice.findMany({
      where: { deviceHash: hashDevice(parsed.data.deviceId), lastUsedAt: { gte: trustCutoff() } },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { lastUsedAt: 'desc' },
    });
    res.json(
      devices.map((d) => ({
        userId: d.user.id,
        name: d.user.name,
        email: maskEmail(d.user.email),
        lastUsedAt: d.lastUsedAt,
      }))
    );
  } catch (error) {
    console.error('Device accounts error:', error);
    res.status(500).json({ error: 'Failed to look up this device' });
  }
});

/**
 * @openapi
 * /api/auth/device/continue:
 *   post:
 *     tags: [Auth]
 *     summary: Sign in as an account already trusted on this device
 *     responses:
 *       200:
 *         description: "{ token, user }"
 */
authRouter.post('/device/continue', async (req, res) => {
  const parsed = DeviceContinueSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request' });
  try {
    const deviceHash = hashDevice(parsed.data.deviceId);
    const device = await prisma.trustedDevice.findUnique({
      where: { userId_deviceHash: { userId: parsed.data.userId, deviceHash } },
      include: { user: true },
    });
    if (!device || device.lastUsedAt < trustCutoff()) {
      return res.status(401).json({ error: 'Please sign in with your password.' });
    }
    await prisma.trustedDevice.update({ where: { id: device.id }, data: { lastUsedAt: new Date() } });
    const { user } = device;
    res.json({
      token: signToken(user),
      user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin },
    });
  } catch (error) {
    console.error('Device continue error:', error);
    res.status(500).json({ error: 'Failed to sign in' });
  }
});

/**
 * @openapi
 * /api/auth/device/forget:
 *   post:
 *     tags: [Auth]
 *     summary: Stop offering quick-continue for the signed-in user on this device
 *     security:
 *       - bearerAuth: []
 */
authRouter.post('/device/forget', requireAuth, async (req, res) => {
  const parsed = DeviceInfoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid device id' });
  try {
    await prisma.trustedDevice.deleteMany({
      where: { userId: req.user!.id, deviceHash: hashDevice(parsed.data.deviceId) },
    });
    res.status(204).end();
  } catch (error) {
    console.error('Forget device error:', error);
    res.status(500).json({ error: 'Failed to forget this device' });
  }
});

/**
 * @openapi
 * /api/auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change the signed-in user's password (other devices lose quick-continue)
 *     security:
 *       - bearerAuth: []
 */
authRouter.post('/change-password', requireAuth, async (req, res) => {
  const parsed = ChangePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(parsed.data.currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect', details: { currentPassword: ['Current password is incorrect'] } });
    }

    const keep = parsed.data.deviceId ? hashDevice(parsed.data.deviceId) : null;
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(parsed.data.newPassword, 10) } }),
      // A password change should also cut off any other phone that could quick-continue.
      prisma.trustedDevice.deleteMany({ where: { userId: user.id, ...(keep ? { deviceHash: { not: keep } } : {}) } }),
    ]);
    res.json({ ok: true });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});
