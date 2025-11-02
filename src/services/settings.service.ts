import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly STORAGE_KEY = 'mindful-coach-settings';
  
  notificationSettings = signal<Record<string, boolean>>({});

  constructor() {
    this.loadSettings();
  }

  private loadSettings(): void {
    try {
      const storedSettings = localStorage.getItem(this.STORAGE_KEY);
      if (storedSettings) {
        this.notificationSettings.set(JSON.parse(storedSettings));
      } else {
        // Default to all off
        this.notificationSettings.set({});
      }
    } catch (e) {
      console.error('Failed to load settings from localStorage', e);
      this.notificationSettings.set({});
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.notificationSettings()));
    } catch (e) {
      console.error('Failed to save settings to localStorage', e);
    }
  }

  isNotificationEnabled(taskId: string): boolean {
    return this.notificationSettings()[taskId] ?? false;
  }

  setNotificationEnabled(taskId: string, enabled: boolean): void {
    this.notificationSettings.update(settings => ({
      ...settings,
      [taskId]: enabled
    }));
    this.saveSettings();
  }
}
