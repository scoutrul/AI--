import { Component, ChangeDetectionStrategy, input, output, viewChild, ElementRef, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ChatMessage } from '../models/chat.model';
import { MoodChartComponent } from '../mood-chart/mood-chart.component';

interface MoodData {
  rating: number;
  timestamp: Date;
  note?: string;
}

@Component({
  selector: 'app-chat-area',
  standalone: true,
  imports: [CommonModule, MoodChartComponent],
  template: `
    <main #chatContainer class="h-full overflow-y-auto p-6 space-y-4">
      @for (message of messages(); track message.id; let last = $last) {
        <div class="flex" [class.justify-end]="message.sender === 'user'" [class.justify-start]="message.sender === 'bot'">
          <div class="flex flex-col" [class.items-end]="message.sender === 'user'" [class.items-start]="message.sender === 'bot'">
            <!-- Message Bubble -->
            <div 
                class="relative max-w-lg lg:max-w-xl px-4 py-3 rounded-2xl shadow" 
                [class.bg-blue-500]="message.sender === 'user'" 
                [class.text-white]="message.sender === 'user'" 
                [class.bg-white]="message.sender === 'bot'" 
                [class.dark:bg-gray-700]="message.sender === 'bot'"
                [class.pr-10]="message.sender === 'bot' && message.text"
                [class.animate-message-in]="message.sender === 'bot'">
              
               @if (message.sender === 'bot' && message.text) {
                  <button 
                      (click)="ttsRequested.emit(message)" 
                      [disabled]="message.audioState === 'loading'" 
                      title="Прослушать сообщение"
                      class="absolute top-2 right-2 p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400">
                      @if (message.audioState === 'loading') {
                          <svg class="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                      } @else if (message.audioState === 'playing') {
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                          </svg>
                      } @else {
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                          </svg>
                      }
                  </button>
               }

               @if (message.containsChart) {
                 @let parts = message.text.split('[MOOD_CHART]');
                 <div class="text-base whitespace-pre-wrap" [innerHTML]="renderMessage(parts[0])"></div>
                 @if (moodHistory().length > 0) {
                    <app-mood-chart [data]="moodHistory()"></app-mood-chart>
                 }
                 <div class="text-base whitespace-pre-wrap" [innerHTML]="renderMessage(parts[1])"></div>
               } @else {
                 <div class="text-base whitespace-pre-wrap" [innerHTML]="renderMessage(message.text)"></div>
               }
            </div>

            <!-- Quick Replies -->
            @if (message.sender === 'bot' && last && message.quickReplies && message.quickReplies.length > 0 && !isLoading()) {
              <div class="flex flex-wrap gap-2 mt-2 max-w-lg lg:max-w-xl animate-fade-in">
                @for (reply of message.quickReplies; track reply) {
                  <button 
                    (click)="quickReplyClicked.emit(reply)"
                    class="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {{ reply }}
                  </button>
                }
              </div>
            }
          </div>
        </div>
      }
      
      @if (isLoading()) {
        <div class="flex justify-start animate-message-in">
          <div class="flex flex-col items-start">
            <div class="max-w-lg lg:max-w-xl px-4 py-3 rounded-2xl shadow bg-white dark:bg-gray-700">
              <div class="flex items-center space-x-2">
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
              </div>
            </div>
          </div>
        </div>
      }
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatAreaComponent {
  messages = input.required<ChatMessage[]>();
  isLoading = input.required<boolean>();
  moodHistory = input.required<MoodData[]>();
  
  ttsRequested = output<ChatMessage>();
  quickReplyClicked = output<string>();
  
  private sanitizer = inject(DomSanitizer);
  chatContainer = viewChild<ElementRef<HTMLDivElement>>('chatContainer');

  constructor() {
    effect(() => {
      this.messages(); 
      this.scrollToBottom();
    });
  }

  renderMessage(text: string): SafeHtml {
    if (!text) return this.sanitizer.bypassSecurityTrustHtml('');
    
    // Basic escaping for security.
    const escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return this.sanitizer.bypassSecurityTrustHtml(escapedText);
  }

  private scrollToBottom(): void {
    const container = this.chatContainer()?.nativeElement;
    if (container) {
        setTimeout(() => {
             container.scrollTop = container.scrollHeight;
        }, 0);
    }
  }
}
