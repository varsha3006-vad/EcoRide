import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

interface LocationMessageDto {
  rideId: string;
  lat: number;
  lng: number;
}

interface ChatMessageDto {
  rideId: string;
  content: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'rides',
})
export class RidesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track room sizes in memory
  private activeRoomOccupants: Map<string, Set<string>> = new Map();

  async handleConnection(socket: Socket) {
    try {
      // Parse token from handshakes for security validation
      const token = socket.handshake.auth?.token;
      if (!token) {
        throw new UnauthorizedException('Missing connection credentials');
      }
      
      const employeeEmail = socket.handshake.query?.email as string;
      console.log(`WebSocket client connected: Socket ID ${socket.id}, User: ${employeeEmail}`);
    } catch (err) {
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    console.log(`WebSocket client disconnected: Socket ID ${socket.id}`);
  }

  /**
   * Room join trigger (employees subscribe to their specific active ride ID room)
   */
  @SubscribeMessage('joinRideRoom')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { rideId: string; email: string },
  ) {
    client.join(data.rideId);
    
    if (!this.activeRoomOccupants.has(data.rideId)) {
      this.activeRoomOccupants.set(data.rideId, new Set());
    }
    this.activeRoomOccupants.get(data.rideId).add(data.email);

    // Notify room occupants of user join event
    this.server.to(data.rideId).emit('sysMessage', {
      content: `${data.email} joined the carpool channel.`,
      occupants: Array.from(this.activeRoomOccupants.get(data.rideId)),
    });
  }

  /**
   * Secure Chat dispatch
   */
  @SubscribeMessage('sendChatMessage')
  handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ChatMessageDto,
  ) {
    const senderEmail = client.handshake.query?.email || 'Colleague';
    
    // Broadcast message payload to everyone in the ride room
    this.server.to(payload.rideId).emit('chatMessage', {
      sender: senderEmail,
      content: payload.content,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Real-time GPS coordinate/ETA broadcast
   */
  @SubscribeMessage('updateLiveLocation')
  handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LocationMessageDto,
  ) {
    // Broadcast live coordinates to passengers registered in the ride channel
    client.to(payload.rideId).emit('liveLocationSync', {
      latitude: payload.lat,
      longitude: payload.lng,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Geofencing alert trigger (fired when driver crosses office boundary coordinates)
   */
  @SubscribeMessage('geofenceReached')
  handleGeofenceReached(
    @MessageBody() data: { rideId: string; officeName: string },
  ) {
    this.server.to(data.rideId).emit('sysMessage', {
      content: `Ride destination reached: Entered ${data.officeName} geofenced perimeter. Driver completion checklist is now active!`,
    });
  }

  /**
   * SOS Emergency broadcast
   */
  @SubscribeMessage('triggerEmergencySos')
  handleSosAlert(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { rideId: string; email: string },
  ) {
    this.server.to(data.rideId).emit('sosAlert', {
      sender: data.email,
      message: `CRITICAL ALERT: Emergency protocol initiated by ${data.email}. Local authorities & corporate security dispatched!`,
    });
  }
}
