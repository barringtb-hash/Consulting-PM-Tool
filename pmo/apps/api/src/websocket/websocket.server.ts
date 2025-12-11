/**
 * WebSocket Server
 *
 * Real-time communication infrastructure using Socket.IO.
 * Provides:
 * - Tenant-isolated rooms
 * - User-specific channels
 * - Broadcast capabilities
 * - Integration with notification system
 */

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../prisma/client';
import type { TenantPlan } from '../tenant/tenant.types';

// Types
interface AuthenticatedSocket extends Socket {
  userId?: number;
  tenantId?: string;
  tenantPlan?: TenantPlan;
}

interface JwtPayload {
  userId: number;
  tenantId?: string;
}

// Server instance
let io: Server | null = null;

// Room naming conventions
const ROOM = {
  tenant: (tenantId: string) => `tenant:${tenantId}`,
  user: (userId: number) => `user:${userId}`,
  tenantUser: (tenantId: string, userId: number) => `tenant:${tenantId}:user:${userId}`,
  entity: (tenantId: string, entityType: string, entityId: number) =>
    `tenant:${tenantId}:${entityType}:${entityId}`,
};

/**
 * Initialize WebSocket server.
 */
export function initWebSocketServer(httpServer: HttpServer): Server {
  if (!env.wsEnabled) {
    console.log('WebSocket: Disabled in configuration');
    return null as unknown as Server;
  }

  io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigin?.split(',').map((o) => o.trim()) || '*',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify JWT
      const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
      socket.userId = payload.userId;

      // Get user's tenant
      const tenantUser = await prisma.tenantUser.findFirst({
        where: { userId: payload.userId },
        include: {
          tenant: {
            select: { id: true, plan: true, status: true },
          },
        },
      });

      if (!tenantUser || tenantUser.tenant.status !== 'ACTIVE') {
        return next(new Error('No active tenant found'));
      }

      socket.tenantId = tenantUser.tenantId;
      socket.tenantPlan = tenantUser.tenant.plan as TenantPlan;

      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`WebSocket: User ${socket.userId} connected from tenant ${socket.tenantId}`);

    // Join rooms
    if (socket.tenantId && socket.userId) {
      socket.join(ROOM.tenant(socket.tenantId));
      socket.join(ROOM.user(socket.userId));
      socket.join(ROOM.tenantUser(socket.tenantId, socket.userId));
    }

    // Handle subscription to entity updates
    socket.on('subscribe', (data: { entityType: string; entityId: number }) => {
      if (socket.tenantId) {
        const room = ROOM.entity(socket.tenantId, data.entityType, data.entityId);
        socket.join(room);
        console.log(`WebSocket: User ${socket.userId} subscribed to ${room}`);
      }
    });

    // Handle unsubscription
    socket.on('unsubscribe', (data: { entityType: string; entityId: number }) => {
      if (socket.tenantId) {
        const room = ROOM.entity(socket.tenantId, data.entityType, data.entityId);
        socket.leave(room);
        console.log(`WebSocket: User ${socket.userId} unsubscribed from ${room}`);
      }
    });

    // Handle presence updates
    socket.on('presence', (data: { status: string }) => {
      if (socket.tenantId && socket.userId) {
        io?.to(ROOM.tenant(socket.tenantId)).emit('user:presence', {
          userId: socket.userId,
          status: data.status,
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`WebSocket: User ${socket.userId} disconnected (${reason})`);

      // Notify tenant about user offline status
      if (socket.tenantId && socket.userId) {
        io?.to(ROOM.tenant(socket.tenantId)).emit('user:presence', {
          userId: socket.userId,
          status: 'offline',
        });
      }
    });
  });

  console.log('WebSocket: Server initialized');
  return io;
}

/**
 * Get the Socket.IO server instance.
 */
export function getSocketServer(): Server | null {
  return io;
}

/**
 * Emit event to a specific tenant.
 */
export function emitToTenant(
  tenantId: string,
  event: string,
  data: unknown,
): void {
  if (!io) return;
  io.to(ROOM.tenant(tenantId)).emit(event, data);
}

/**
 * Emit event to a specific user.
 */
export function emitToUser(userId: number, event: string, data: unknown): void {
  if (!io) return;
  io.to(ROOM.user(userId)).emit(event, data);
}

/**
 * Emit event to a user within a specific tenant context.
 */
export function emitToTenantUser(
  tenantId: string,
  userId: number,
  event: string,
  data: unknown,
): void {
  if (!io) return;
  io.to(ROOM.tenantUser(tenantId, userId)).emit(event, data);
}

/**
 * Emit event to entity subscribers.
 */
export function emitToEntity(
  tenantId: string,
  entityType: string,
  entityId: number,
  event: string,
  data: unknown,
): void {
  if (!io) return;
  io.to(ROOM.entity(tenantId, entityType, entityId)).emit(event, data);
}

/**
 * Get connected sockets count.
 */
export async function getConnectedCount(): Promise<number> {
  if (!io) return 0;
  const sockets = await io.fetchSockets();
  return sockets.length;
}

/**
 * Get connected sockets in a tenant.
 */
export async function getTenantConnectedCount(tenantId: string): Promise<number> {
  if (!io) return 0;
  const sockets = await io.in(ROOM.tenant(tenantId)).fetchSockets();
  return sockets.length;
}

// Export room helpers for external use
export const rooms = ROOM;

export default {
  initWebSocketServer,
  getSocketServer,
  emitToTenant,
  emitToUser,
  emitToTenantUser,
  emitToEntity,
  getConnectedCount,
  getTenantConnectedCount,
  rooms,
};
