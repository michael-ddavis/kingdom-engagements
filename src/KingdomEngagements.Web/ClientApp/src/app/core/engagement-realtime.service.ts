import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';

export interface EngagementRealtimeHandlers {
  messageCreated?: (payload: unknown) => void;
  coordinationUpdated?: (payload: unknown) => void;
  documentAdded?: (payload: unknown) => void;
  connectionChanged?: (connected: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class EngagementRealtimeService {
  async connect(
    assignmentId: string,
    handlers: EngagementRealtimeHandlers,
  ): Promise<() => Promise<void>> {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/engagements')
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('engagement.message-created', payload => handlers.messageCreated?.(payload));
    connection.on('engagement.coordination-updated', payload => handlers.coordinationUpdated?.(payload));
    connection.on('engagement.document-added', payload => handlers.documentAdded?.(payload));

    connection.onreconnecting(() => handlers.connectionChanged?.(false));

    connection.onreconnected(async () => {
      await connection.invoke('JoinEngagement', assignmentId);
      handlers.connectionChanged?.(true);
    });

    connection.onclose(() => handlers.connectionChanged?.(false));

    await connection.start();
    await connection.invoke('JoinEngagement', assignmentId);
    handlers.connectionChanged?.(true);

    return async () => {
      handlers.connectionChanged?.(false);
      await connection.stop();
    };
  }
}
