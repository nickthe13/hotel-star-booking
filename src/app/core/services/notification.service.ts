import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly DEFAULT_DURATION = 5000;

  notifications = signal<Notification[]>([]);

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  show(message: string, type: NotificationType = 'info', duration?: number): void {
    const notification: Notification = {
      id: this.generateId(),
      type,
      message,
      duration: duration ?? this.DEFAULT_DURATION
    };

    this.notifications.update(notifications => [...notifications, notification]);

    // Auto-remove after duration
    const autoDismiss = notification.duration ?? this.DEFAULT_DURATION;
    if (autoDismiss > 0) {
      setTimeout(() => {
        this.remove(notification.id);
      }, autoDismiss);
    }
  }

  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration?: number): void {
    this.show(message, 'error', duration ?? 7000); // Errors stay longer
  }

  warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }

  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  remove(id: string): void {
    this.notifications.update(notifications =>
      notifications.filter(n => n.id !== id)
    );
  }

  clear(): void {
    this.notifications.set([]);
  }
}
