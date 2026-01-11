import { WebSocketServer, WebSocket } from 'ws';
import { prisma } from '../server';

const connections = new Map<string, WebSocket[]>();

export function setupWebSocketHandlers(wss: WebSocketServer) {
  wss.on('connection', (ws, request) => {
    console.log('New WebSocket connection');
    
    let userId: string | null = null;

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'authenticate') {
          // Verify JWT token and get user ID
          const jwt = require('jsonwebtoken');
          try {
            const decoded = jwt.verify(message.token, process.env.JWT_SECRET);
            userId = decoded.id;
            
            if (!connections.has(userId)) {
              connections.set(userId, []);
            }
            connections.get(userId)!.push(ws);
            
            ws.send(JSON.stringify({
              type: 'authenticated',
              userId
            }));
            
            console.log(`User ${userId} authenticated via WebSocket`);
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Authentication failed'
            }));
            ws.close();
          }
        }
        
        if (message.type === 'subscribe_generation' && userId) {
          // User wants updates on their generation tasks
          ws.send(JSON.stringify({
            type: 'subscribed',
            taskType: 'generation'
          }));
        }
        
        if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
        
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    ws.on('close', () => {
      if (userId) {
        const userConnections = connections.get(userId);
        if (userConnections) {
          const index = userConnections.indexOf(ws);
          if (index > -1) {
            userConnections.splice(index, 1);
          }
          if (userConnections.length === 0) {
            connections.delete(userId);
          }
        }
      }
      console.log('WebSocket connection closed');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'WebSocket connection established'
    }));
  });
}

export async function notifyUser(userId: string, message: any) {
  const userConnections = connections.get(userId);
  if (!userConnections || userConnections.length === 0) {
    console.log(`No WebSocket connections for user ${userId}`);
    return;
  }

  const messageStr = JSON.stringify(message);
  
  userConnections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
}

export async function broadcastGenerationUpdate(taskId: string, update: any) {
  const task = await prisma.generationQueue.findUnique({
    where: { id: taskId }
  });

  if (!task) return;

  const message = {
    type: 'generation_update',
    taskId,
    taskType: task.taskType,
    status: update.status,
    progress: update.progress || 0,
    timestamp: new Date().toISOString()
  };

  await notifyUser(task.profileId, message);
}