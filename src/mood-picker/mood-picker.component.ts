import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface MoodSelection {
  mood: { rating: number; emoji: string; label: string };
  note: string;
}

@Component({
  selector: 'app-mood-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-4xl mx-auto text-center relative p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
        <button (click)="closed.emit()" class="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors" title="Закрыть">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <p class="mb-3 font-medium text-gray-700 dark:text-gray-300">Как вы себя чувствуете сейчас?</p>
        <div class="flex justify-center items-center space-x-2 sm:space-x-4">
            @for (mood of moods(); track mood.rating) {
                <button (click)="selectMood(mood)" class="flex flex-col items-center justify-center space-y-1 group transition-transform duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded-lg p-2">
                    <span class="text-3xl sm:text-4xl">{{ mood.emoji }}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400">{{ mood.label }}</span>
                </button>
            }
        </div>
        <div class="mt-4">
          <input 
            type="text"
            class="w-full max-w-md mx-auto p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            placeholder="Что повлияло на ваше настроение? (необязательно)"
            [(ngModel)]="moodNote"
            />
        </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MoodPickerComponent {
  moods = input.required<ReadonlyArray<{ rating: number; emoji: string; label: string }>>();
  moodSelected = output<MoodSelection>();
  closed = output<void>();

  moodNote = signal('');

  selectMood(mood: { rating: number; emoji: string; label: string }): void {
    this.moodSelected.emit({ mood: mood, note: this.moodNote().trim() });
  }
}
