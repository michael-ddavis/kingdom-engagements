import * as signalR from '@microsoft/signalr';

type RealtimeHandler = (payload: unknown) => void;

interface EngagementRealtimeHandlers {
  messageCreated?: RealtimeHandler;
  coordinationUpdated?: RealtimeHandler;
  documentAdded?: RealtimeHandler;
  reconnected?: () => void;
}

interface ApostolOSRealtimeApi {
  connectToEngagement(
    assignmentId: string,
    handlers: EngagementRealtimeHandlers,
  ): Promise<() => Promise<void>>;
}

declare global {
  interface Window {
    ApostolOSRealtime?: ApostolOSRealtimeApi;
  }
}

window.ApostolOSRealtime = {
  async connectToEngagement(
    assignmentId: string,
    handlers: EngagementRealtimeHandlers,
  ): Promise<() => Promise<void>> {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/engagements/host')
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('engagement.message-created', payload => handlers.messageCreated?.(payload));
    connection.on('engagement.coordination-updated', payload => handlers.coordinationUpdated?.(payload));
    connection.on('engagement.document-added', payload => handlers.documentAdded?.(payload));

    connection.onreconnected(async () => {
      await connection.invoke('JoinEngagement', assignmentId);
      handlers.reconnected?.();
    });

    await connection.start();
    await connection.invoke('JoinEngagement', assignmentId);

    return async () => {
      await connection.stop();
    };
  },
};
