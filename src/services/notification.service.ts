// FIX: Import `signal` from `@angular/core` to resolve reference error.
import { Injectable, inject, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { SettingsService } from './settings.service';
import { TaskService } from './task.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private settingsService = inject(SettingsService);
  private taskService = inject(TaskService);
  private destroyRef = inject(DestroyRef);
  
  permission = signal<NotificationPermission>('default');
  private notifiedTaskIds = new Set<string>();

  constructor() {
    if ('Notification' in window) {
      this.permission.set(Notification.permission);
    }
    this.startScheduler();
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.error('This browser does not support desktop notification');
      return 'denied';
    }

    const currentPermission = await Notification.requestPermission();
    this.permission.set(currentPermission);
    return currentPermission;
  }

  private startScheduler(): void {
    const resetAtMidnight = () => {
      const now = new Date();
      const night = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0, 0, 0
      );
      const msToMidnight = night.getTime() - now.getTime();
      setTimeout(() => {
        this.notifiedTaskIds.clear();
        resetAtMidnight();
      }, msToMidnight);
    };
    resetAtMidnight();
    
    interval(60 * 1000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.checkAndNotify();
    });
  }

  private checkAndNotify(): void {
    if (this.permission() !== 'granted') {
      return;
    }
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const allTasks = this.taskService.getDailyTasks();
    for (const task of allTasks) {
      if (
        task.time === currentTime &&
        this.settingsService.isNotificationEnabled(task.id) &&
        !this.notifiedTaskIds.has(task.id)
      ) {
        this.showNotification(`Время для: ${task.title}`, {
          body: 'Нажмите, чтобы начать задание в AI-коуче.',
          icon: '/favicon.ico',
        });
        this.notifiedTaskIds.add(task.id);
      }
    }
  }

  private showNotification(title: string, options: NotificationOptions): void {
    new Notification(title, options);
  }
}
