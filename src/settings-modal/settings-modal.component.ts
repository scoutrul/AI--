import { Component, ChangeDetectionStrategy, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DailyTask } from '../models/task.model';
import { TaskService } from '../services/task.service';
import { SettingsService } from '../services/settings.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in" (click)="closed.emit()">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg flex flex-col" (click)="$event.stopPropagation()">
        <header class="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 class="text-lg font-semibold">Настройки уведомлений</h2>
          <button (click)="closed.emit()" class="p-1 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors" title="Закрыть">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        <main class="flex-1 p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            @if (notificationService.permission() === 'denied') {
              <div class="p-3 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg text-sm">
                Уведомления заблокированы в настройках вашего браузера. Чтобы включить их, вам нужно изменить разрешения для этого сайта.
              </div>
            }
            @for (task of dailyTasks; track task.id) {
              <div class="flex justify-between items-center">
                  <div>
                    <p class="font-medium">{{ task.title }}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">{{ task.time }}</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      class="sr-only peer"
                      [checked]="settingsService.isNotificationEnabled(task.id)"
                      (change)="toggleNotification(task.id, $event)"
                      [disabled]="notificationService.permission() === 'denied'">
                    <div class="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
              </div>
            }
        </main>
        <footer class="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button (click)="closed.emit()" class="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors">
              Готово
            </button>
        </footer>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsModalComponent {
  closed = output<void>();

  taskService = inject(TaskService);
  settingsService = inject(SettingsService);
  notificationService = inject(NotificationService);

  dailyTasks: DailyTask[];

  constructor() {
    this.dailyTasks = this.taskService.getDailyTasks();
  }

  async toggleNotification(taskId: string, event: Event): Promise<void> {
    const isEnabled = (event.target as HTMLInputElement).checked;

    if (isEnabled && this.notificationService.permission() === 'default') {
      const permission = await this.notificationService.requestPermission();
      if (permission !== 'granted') {
        // If permission denied, revert the checkbox visually and save state
        (event.target as HTMLInputElement).checked = false;
        this.settingsService.setNotificationEnabled(taskId, false);
        return;
      }
    }
    
    this.settingsService.setNotificationEnabled(taskId, isEnabled);
  }
}
