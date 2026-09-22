import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { filter } from 'rxjs';

export type EngagementRealtimeEventType =
  | 'message-created'
  | 'coordination-updated'
  | 'document-added';

export interface EngagementRealtimeEvent {
  type: EngagementRealtimeEventType;
  assignmentId: string;
  payload: unknown;
}

@Injectable({ providedIn: 'root' })
export class EngagementRealtimeService {
  private connection: HubConnection | null = null;
  private assignmentId: string | null = null;
  private mounted = false;

  constructor(private readonly router: Router) {}

  mount(): void {
    if (this.mounted || typeof window === 'undefined') return;
    this.mounted = true;

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => void this.syncConnection());

    void this.syncConnection();
  }

  private async syncConnection(): Promise<void> {
    const nextAssignmentId = this.currentAssignmentId();

    if (nextAssignmentId === this.assignmentId &&
        this.connection?.state === HubConnectionState.Connected) {
      return;
    }

    await this.stopConnection();

    if (!nextAssignmentId) return;

    this.assignmentId = nextAssignmentId;
    const connection = this.createConnection();
    this.connection = connection;

    try {
      await connection.start();
      await connection.invoke('JoinEngagement', nextAssignmentId);
    } catch {
      if (this.connection === connection) {
        await this.stopConnection();
      }
    }
  }

  private createConnection(): HubConnection {
    const connection = new HubConnectionBuilder()
      .withUrl('/hubs/engagements', { withCredentials: true })
      .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000])
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on('coordinationMessageCreated', message => {
      this.publish('message-created', message);
    });

    connection.on('coordinationUpdated', update => {
      this.publish('coordination-updated', update);
    });

    connection.on('coordinationDocumentAdded', document => {
      this.publish('document-added', document);
    });

    connection.onreconnected(() => {
      const assignmentId = this.assignmentId;
      if (assignmentId) {
        void connection.invoke('JoinEngagement', assignmentId);
      }
    });

    return connection;
  }

  private publish(type: EngagementRealtimeEventType, payload: unknown): void {
    const assignmentId = this.assignmentId;
    if (!assignmentId) return;

    window.dispatchEvent(new CustomEvent<EngagementRealtimeEvent>(
      'apostolos:engagement-realtime',
      {
        detail: {
          type,
          assignmentId,
          payload,
        },
      },
    ));
  }

  private async stopConnection(): Promise<void> {
    const connection = this.connection;
    this.connection = null;
    this.assignmentId = null;

    if (!connection || connection.state === HubConnectionState.Disconnected) {
      return;
    }

    try {
      await connection.stop();
    } catch {
      // The next route will create a fresh connection. A failed stop should not
      // make navigation fail.
    }
  }

  private currentAssignmentId(): string | null {
    const path = window.location.pathname;
    const directMatch = path.match(/^\/assignments\/([0-9a-f-]{36})\/?$/i);
    if (directMatch) return directMatch[1];

    const directorMatch = path.match(/^\/organization\/ctg\/engagements\/([0-9a-f-]{36})\/?$/i);
    return directorMatch ? directorMatch[1] : null;
  }
}
