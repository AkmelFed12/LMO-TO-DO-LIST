import { Request, Response } from 'express';
import prisma from '../utils/db';

interface AuthRequest extends Request {
  user?: any;
}

const validWorkspaces = ['Personal', 'Work', 'Learning'];
const validPriorities = ['Low', 'Medium', 'High'];
const validRecurrence = ['None', 'Daily', 'Weekly', 'Monthly'];

const parseMinutes = (value: unknown, fallback = 0) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.floor(value));
};

export const getTasks = async (req: AuthRequest, res: Response) => {
  const { status, workspace, search, archived } = req.query;
  const filters: any = { userId: req.user.id };

  if (status === 'completed') filters.completed = true;
  if (status === 'active') filters.completed = false;
  if (typeof workspace === 'string' && validWorkspaces.includes(workspace)) {
    filters.workspace = workspace;
  }
  if (archived === 'true') {
    filters.archived = true;
  } else if (archived === 'false' || archived === undefined) {
    filters.archived = false;
  }

  if (typeof search === 'string' && search.trim()) {
    filters.OR = [
      { title: { contains: search.trim(), mode: 'insensitive' } },
      { description: { contains: search.trim(), mode: 'insensitive' } },
    ];
  }

  try {
    const tasks = await prisma.task.findMany({
      where: filters,
      orderBy: { updatedAt: 'desc' },
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createTask = async (req: AuthRequest, res: Response) => {
  const { title, description, workspace, priority, dueDate, tags, recurrence, estimatedMinutes, actualMinutes, focusMinutes } = req.body;

  try {
    const task = await prisma.task.create({
      data: {
        title,
        description,
        workspace: validWorkspaces.includes(workspace) ? workspace : 'Personal',
        priority: validPriorities.includes(priority) ? priority : 'Medium',
        tags: typeof tags === 'string' ? tags : undefined,
        recurrence: validRecurrence.includes(recurrence) ? recurrence : 'None',
        dueDate: dueDate ? new Date(dueDate) : undefined,
        estimatedMinutes: parseMinutes(estimatedMinutes),
        actualMinutes: parseMinutes(actualMinutes),
        focusMinutes: parseMinutes(focusMinutes, 25) || 25,
        userId: req.user.id,
      },
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, description, completed, archived, workspace, priority, dueDate, tags, recurrence, estimatedMinutes, actualMinutes, focusMinutes } = req.body;

  try {
    const task = await prisma.task.findUnique({ where: { id: parseInt(id) } });
    if (!task || task.userId !== req.user.id) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const updatedTask = await prisma.task.update({
      where: { id: parseInt(id) },
      data: {
        title,
        description,
        completed,
        archived: typeof archived === 'boolean' ? archived : task.archived,
        archivedAt: typeof archived === 'boolean' ? (archived ? new Date() : null) : task.archivedAt,
        workspace: validWorkspaces.includes(workspace) ? workspace : task.workspace,
        priority: validPriorities.includes(priority) ? priority : task.priority,
        tags: typeof tags === 'string' ? tags : task.tags,
        recurrence: validRecurrence.includes(recurrence) ? recurrence : task.recurrence,
        dueDate: dueDate ? new Date(dueDate) : dueDate === null ? null : task.dueDate,
        estimatedMinutes: typeof estimatedMinutes === 'number' ? parseMinutes(estimatedMinutes) : task.estimatedMinutes,
        actualMinutes: typeof actualMinutes === 'number' ? parseMinutes(actualMinutes) : task.actualMinutes,
        focusMinutes: typeof focusMinutes === 'number' ? parseMinutes(focusMinutes, 25) || 25 : task.focusMinutes,
      },
    });
    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const task = await prisma.task.findUnique({ where: { id: parseInt(id) } });
    if (!task || task.userId !== req.user.id) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await prisma.task.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
export const getTaskSummary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const totalTasks = await prisma.task.count({ where: { userId, archived: false } });
    const completedTasks = await prisma.task.count({ where: { userId, completed: true, archived: false } });
    const activeTasks = await prisma.task.count({ where: { userId, completed: false, archived: false } });
    const archivedTasks = await prisma.task.count({ where: { userId, archived: true } });
    const workspaceStats = await prisma.task.groupBy({
      by: ['workspace'],
      where: { userId, archived: false },
      _count: { _all: true },
    });

    res.json({
      totalTasks,
      completedTasks,
      activeTasks,
      archivedTasks,
      workspaceStats: workspaceStats.reduce((acc, item) => ({
        ...acc,
        [item.workspace]: item._count._all,
      }), {} as Record<string, number>),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
