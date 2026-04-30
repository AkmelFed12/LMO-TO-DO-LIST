import { Request, Response } from 'express';
import prisma from '../utils/db';

interface AuthRequest extends Request {
  user?: { id: number };
}

const defaultSettings = {
  focusTime: 25,
  breakTime: 5,
  sessionsPerCycle: 4,
  theme: 'light',
  notifications: true,
  emailNotifications: false,
  defaultWorkspace: 'Personal',
  timeFormat: '24h',
  language: 'en',
  weekStartDay: 'monday',
  autoArchiveCompleted: false,
  autoArchiveDays: 30,
  soundEnabled: true,
};

export const getUserSettings = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: { settings: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const parsed = user.settings ? JSON.parse(user.settings) : {};
    res.json({ ...defaultSettings, ...parsed });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateUserSettings = async (req: AuthRequest, res: Response) => {
  try {
    const mergedSettings = { ...defaultSettings, ...(req.body || {}) };
    const user = await prisma.user.update({
      where: { id: req.user?.id },
      data: { settings: JSON.stringify(mergedSettings) },
      select: { settings: true },
    });

    res.json(JSON.parse(user.settings));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

