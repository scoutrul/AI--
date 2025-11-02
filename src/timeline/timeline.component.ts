import { Component, ChangeDetectionStrategy, input, output, signal, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DailyTask } from '../models/task.model';

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white dark:bg-gray-800/50 p-4 shadow-md">
      <div class="relative w-full h-12">
        <!-- Timeline track -->
        <div class="absolute top-1/2 left-0 w-full h-0.5 bg-gray-300 dark:bg-gray-600"></div>
        
        <!-- Now Marker -->
        <div class="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ease-linear" [style.left]="nowPosition()">
          <div class="w-2.5 h-2.5 bg-blue-500 rounded-full ring-2 ring-white dark:ring-gray-800"></div>
          <span class="absolute top-full mt-1.5 text-xs font-semibold text-blue-500 whitespace-nowrap -translate-x-1/2">
            Сейчас <span class="font-normal">({{ nowTimeFormatted() }})</span>
          </span>
        </div>

        <!-- Task Markers -->
        @for (task of tasks(); track task.id) {
          @let isPastTask = isPast(task.time);
          <div 
            class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group" 
            [style.left]="calculatePosition(task.time)"
            [class.opacity-50]="isPastTask">
            <button 
              (click)="taskClicked.emit(task.prompt)"
              [disabled]="isPastTask"
              class="w-8 h-8 rounded-full bg-white dark:bg-gray-700 border-2 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              [class.border-gray-300]="!isPastTask"
              [class.dark:border-gray-500]="!isPastTask"
              [class.hover:border-blue-500]="!isPastTask"
              [class.dark:hover:border-blue-400]="!isPastTask"
              [class.cursor-pointer]="!isPastTask"
              [class.border-gray-200]="isPastTask"
              [class.dark:border-gray-600]="isPastTask"
              [class.cursor-default]="isPastTask"
              [class.pointer-events-none]="isPastTask">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 transition-colors"
                [class.text-gray-600]="!isPastTask"
                [class.dark:text-gray-300]="!isPastTask"
                [class.group-hover:text-blue-500]="!isPastTask"
                [class.dark:group-hover:text-blue-400]="!isPastTask"
                [class.text-gray-400]="isPastTask"
                [class.dark:text-gray-500]="isPastTask"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="task.icon" />
              </svg>
            </button>
            <!-- Tooltip -->
            <div class="absolute bottom-full mb-2 w-max max-w-xs p-2 bg-gray-800 dark:bg-gray-900 text-white text-xs rounded-md text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -translate-x-1/2 left-1/2">
              {{ task.title }} <span class="text-gray-400">({{ task.time }})</span>
              <div class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800 dark:border-t-gray-900"></div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineComponent {
  tasks = input.required<DailyTask[]>();
  taskClicked = output<string>();

  private destroyRef = inject(DestroyRef);
      
  private readonly timelineStartHour = 8; // 8 AM
  private readonly timelineEndHour = 22; // 10 PM
  private readonly timelineDurationMinutes = (this.timelineEndHour - this.timelineStartHour) * 60;

  nowPosition = signal('0%');
  nowTimeFormatted = signal('');
  private nowMinutes = signal(0);
  
  constructor() {
    const updateNow = () => {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        this.nowTimeFormatted.set(`${hours}:${minutes}`);

        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        this.nowMinutes.set(currentMinutes);

        const startMinutes = this.timelineStartHour * 60;
        const minutesFromStart = currentMinutes - startMinutes;
        const percentage = (minutesFromStart / this.timelineDurationMinutes) * 100;
        this.nowPosition.set(`${Math.max(0, Math.min(100, percentage))}%`);
    };
    
    updateNow();
    const intervalId = setInterval(updateNow, 60000); // Update every minute
    this.destroyRef.onDestroy(() => clearInterval(intervalId));
  }

  private timeStringToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  calculatePosition(taskTime: string): string {
    const taskMinutes = this.timeStringToMinutes(taskTime);
    const startMinutes = this.timelineStartHour * 60;
    
    const minutesFromStart = taskMinutes - startMinutes;
    const percentage = (minutesFromStart / this.timelineDurationMinutes) * 100;

    return `${Math.max(0, Math.min(100, percentage))}%`;
  }
  
  isPast(taskTime: string): boolean {
      const taskMinutes = this.timeStringToMinutes(taskTime);
      return taskMinutes < this.nowMinutes();
  }
}