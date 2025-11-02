import { Component, ChangeDetectionStrategy, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-journal-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col">
        <header class="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 class="text-lg font-semibold">Запись в журнале</h2>
          <button (click)="closed.emit()" class="p-1 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors" title="Закрыть">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
          </button>
        </header>
        <main class="flex-1 p-4">
          <textarea 
            class="w-full h-full p-3 border-gray-300 dark:border-gray-600 dark:bg-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none text-base"
            placeholder="Что у вас на уме?..."
            [(ngModel)]="journalInput">
          </textarea>
        </main>
        <footer class="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
            <button (click)="closed.emit()" class="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors">
              Отмена
            </button>
            <button (click)="saveEntry()" [disabled]="journalInput().trim() === ''" class="px-6 py-2 rounded-lg text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors">
              Сохранить запись
            </button>
        </footer>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JournalModalComponent {
  entrySaved = output<string>();
  closed = output<void>();

  journalInput = signal('');

  saveEntry(): void {
    const text = this.journalInput().trim();
    if (text) {
      this.entrySaved.emit(text);
    }
  }
}
