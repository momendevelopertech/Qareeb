import {
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayInit,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NotificationsEventsService } from './notifications-events.service';

@WebSocketGateway({
    namespace: '/notifications',
    cors: {
        origin: true,
        credentials: true,
    },
})
export class NotificationsGateway implements OnGatewayInit, OnGatewayConnection {
    @WebSocketServer()
    server!: Server;

    constructor(private readonly events: NotificationsEventsService) { }

    afterInit() {
        this.events.subscribe((payload) => {
            const roles: string[] = payload?.roles || [];
            if (!roles.length) {
                this.server.emit('notification', payload);
                return;
            }
            for (const role of roles) {
                this.server.to(`role:${role}`).emit('notification', payload);
            }
        });
    }

    handleConnection(@ConnectedSocket() client: Socket) {
        const role = (client.handshake.query?.role || '').toString();
        if (role) client.join(`role:${role}`);
    }
}
