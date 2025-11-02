import { Component, ChangeDetectionStrategy, input, output, signal, viewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-message-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './message-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageInputComponent {
  isLoading = input(false);
  isRecording = input(false);
  speechApiSupported = input(false);
  
  messageSent = output<string>();
  recordingToggled = output();

  userInput = signal('');
  userInputArea = viewChild<ElementRef<HTMLTextAreaElement>>('userInputArea');

  private readonly prompts = [
    'Какие задачи я могу выполнить сегодня для улучшения настроения?',
    'Дай мне, пожалуйста, аффирмацию на сегодня.',
    'Сгенерируй еженедельный отчет о моем прогрессе.',
    'Предложи упражнение на дикцию.',
    'Как я могу справиться с тревогой прямо сейчас?',
    'Расскажи интересный факт о работе мозга.',
    'Какую технику осознанности мне попробовать?'
  ];

  constructor() {
    effect(() => {
      this.userInput();
      const textarea = this.userInputArea()?.nativeElement;
      if (textarea) {
        // Reset height to auto to allow shrinking
        textarea.style.height = 'auto';
        // Set height to scrollHeight to allow expanding
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    });
  }

  sendMessage(): void {
    const text = this.userInput().trim();
    if (text) {
      this.messageSent.emit(text);
      this.userInput.set('');
    }
  }

  suggestPrompt(): void {
    const randomIndex = Math.floor(Math.random() * this.prompts.length);
    this.userInput.set(this.prompts[randomIndex]);
    setTimeout(() => this.userInputArea()?.nativeElement?.focus(), 0);
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}