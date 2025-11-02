import { Component, ChangeDetectionStrategy, signal, inject, effect, viewChild, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from './services/gemini.service';
import { ChatMessage } from './models/chat.model';
import { AudioService } from './services/audio.service';
import { TaskService } from './services/task.service';
import { DailyTask } from './models/task.model';
import { NotificationService } from './services/notification.service';

// Component Imports
import { HeaderComponent } from './header/header.component';
import { ChatAreaComponent } from './chat-area/chat-area.component';
import { MessageInputComponent } from './message-input/message-input.component';
import { MoodPickerComponent, MoodSelection } from './mood-picker/mood-picker.component';
import { JournalModalComponent } from './journal-modal/journal-modal.component';
import { TimelineComponent } from './timeline/timeline.component';
import { SettingsModalComponent } from './settings-modal/settings-modal.component';


// Let TypeScript know about the Web Speech API
declare var webkitSpeechRecognition: any;

interface MoodData {
  rating: number;
  timestamp: Date;
  note?: string;
}

interface JournalEntry {
  text: string;
  timestamp: Date;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    HeaderComponent,
    ChatAreaComponent,
    MessageInputComponent,
    MoodPickerComponent,
    JournalModalComponent,
    TimelineComponent,
    SettingsModalComponent
  ]
})
export class AppComponent {
  private geminiService = inject(GeminiService);
  private audioService = inject(AudioService);
  private taskService = inject(TaskService);
  private notificationService = inject(NotificationService); // Initialize the service
  private destroyRef = inject(DestroyRef);

  messages = signal<ChatMessage[]>([]);
  isLoading = signal(true);
  showMoodPicker = signal(false);
  isRecording = signal(false);
  speechApiSupported = signal(false);
  justCopied = signal(false);
  moodHistory = signal<MoodData[]>([]);
  
  showJournal = signal(false);
  showSettings = signal(false);
  journalHistory = signal<JournalEntry[]>([]);
  dailyTasks = signal<DailyTask[]>([]);

  messageInput = viewChild(MessageInputComponent);
  private recognition: any;
  private recognitionError = false;
  private previousMessageCount = 0;
  private lastMoodPromptTime: number | null = null;

  readonly moods = [
    { rating: 1, emoji: '😔', label: 'Ужасно' },
    { rating: 2, emoji: '😕', label: 'Плохо' },
    { rating: 3, emoji: '😐', label: 'Нормально' },
    { rating: 4, emoji: '🙂', label: 'Хорошо' },
    { rating: 5, emoji: '😄', label: 'Отлично' }
  ] as const;
  
  constructor() {
    this.initializeChat();
    this.initializeSpeechRecognition();
    this.initializeTasks();

    effect(() => {
      const currentMessages = this.messages();
      if (currentMessages.length > this.previousMessageCount) {
        const lastMessage = currentMessages[currentMessages.length - 1];
        if (lastMessage.sender === 'bot') {
           // Only play for new messages, not the initial greeting
           if (this.previousMessageCount > 0) {
              this.audioService.playReceivedSound();
           }
        }
      }
      this.previousMessageCount = currentMessages.length;
    });
  }

  private initializeSpeechRecognition(): void {
    if ('webkitSpeechRecognition' in window) {
      this.speechApiSupported.set(true);
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'ru-RU';

      this.recognition.onstart = () => {
        this.isRecording.set(true);
        this.audioService.playRecordingStartSound();
      };
      this.recognition.onend = () => {
        if (!this.recognitionError) {
          this.audioService.playRecordingStopSound();
        }
        this.isRecording.set(false);
        this.recognitionError = false; // Reset for next time
      };
      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        this.recognitionError = true; // Set flag so 'onend' doesn't play success sound
        this.isRecording.set(false);
      };
      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.sendMessage(transcript);
      };
    } else {
      this.speechApiSupported.set(false);
    }
  }
  
  private initializeTasks(): void {
    this.dailyTasks.set(this.taskService.getDailyTasks());
  }
  
  onTaskClicked(prompt: string): void {
    const messageInputComponent = this.messageInput();
    if (messageInputComponent) {
      messageInputComponent.setUserInput(prompt);
    }
  }

  toggleRecording(): void {
    if (!this.speechApiSupported()) return;
    if (this.isRecording()) {
      this.recognition.stop();
    } else {
      this.recognition.start();
    }
  }

  async initializeChat(): Promise<void> {
    try {
      const greeting = await this.geminiService.getInitialGreeting();
      this.addBotMessage(greeting);
    } catch (e) {
       this.addBotMessage('Здравствуйте! Я здесь, чтобы поддержать вас. Как вы себя чувствуете сегодня?');
    } finally {
      this.isLoading.set(false);
    }
  }

  async sendMessage(messageText: string): Promise<void> {
    const trimmedText = messageText.trim();
    if (!trimmedText || this.isLoading()) {
      return;
    }

    this.addUserMessage(trimmedText);
    this.audioService.playSentSound();
    this.isLoading.set(true);

    try {
      const botResponseText = await this.geminiService.getChatResponse(trimmedText);
      this.addBotMessage(botResponseText);
    } catch (error) {
      this.addBotMessage('Возникли проблемы с подключением. Пожалуйста, проверьте соединение и попробуйте снова.');
    } finally {
      this.isLoading.set(false);
    }
  }

  handleMoodSelection(selection: MoodSelection): void {
    this.showMoodPicker.set(false);
    const { mood, note } = selection;
    
    this.lastMoodPromptTime = Date.now();

    this.moodHistory.update(history => [
      ...history, 
      { 
        rating: mood.rating, 
        timestamp: new Date(), 
        note: note ? note : undefined 
      }
    ]);
    
    let moodMessage = `Я чувствую себя: ${mood.emoji} ${mood.label}`;
    if (note) {
      moodMessage += ` (Заметка: ${note})`;
    }
    
    setTimeout(() => this.sendMessage(moodMessage), 0);
  }

  async generateReport(): Promise<void> {
    if (this.isLoading()) return;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentMoods = this.moodHistory().filter(mood => mood.timestamp >= sevenDaysAgo);
    const recentJournalEntries = this.journalHistory().filter(entry => entry.timestamp >= sevenDaysAgo);

    let reportRequest = "Сгенерируй, пожалуйста, еженедельный отчет о моем прогрессе.";

    if (recentMoods.length > 0) {
      const moodDataString = recentMoods.map(m => `{ mood: ${m.rating}, date: '${m.timestamp.toLocaleDateString('ru-RU')}'${m.note ? `, note: '${m.note.replace(/'/g, "\\'")}'` : ''} }`).join(', ');
      reportRequest += `\n\nВот моя история настроения за последнюю неделю: [${moodDataString}].`;
    }

    if (recentJournalEntries.length > 0) {
      const journalDataString = recentJournalEntries.map(e => `{ date: '${e.timestamp.toLocaleDateString('ru-RU')}', text: '${e.text.replace(/'/g, "\\'").replace(/\n/g, " ")}' }`).join(', ');
      reportRequest += `\n\nВот мои записи в журнале за последнюю неделю: [${journalDataString}].`;
    }

    if (recentMoods.length > 0 || recentJournalEntries.length > 0) {
       reportRequest += `\n\nПроанализируй эту динамику, обращая внимание на мои заметки и записи в журнале, чтобы выявить триггеры и темы. Обязательно включи в свой ответ плейсхолдер [MOOD_CHART] для диаграммы.`;
    } else {
       reportRequest += " У меня пока нет данных о настроении или записей в журнале для анализа.";
    }
    
    this.sendMessage(reportRequest);
  }

  getAffirmation(): void {
    this.sendMessage("Дай мне, пожалуйста, аффирмацию на сегодня.");
  }

  getExercise(type: 'dictation' | 'pronunciation' | 'gestures'): void {
    const requestMap = {
      dictation: "Сгенерируй, пожалуйста, упражнение на дикцию.",
      pronunciation: "Сгенерируй, пожалуйста, упражнение на произношение.",
      gestures: "Сгенерируй, пожалуйста, упражнение на язык жестов."
    };
    this.sendMessage(requestMap[type]);
  }
  
  saveJournalEntry(text: string): void {
    const newEntry: JournalEntry = { text, timestamp: new Date() };
    this.journalHistory.update(current => [...current, newEntry]);
    this.showJournal.set(false);

    this.addUserMessage('Я добавил запись в журнал.');
    this.audioService.playSentSound();
    this.addBotMessage('Спасибо, что поделились. Ваши мысли сохранены.');
  }

  async shareApp(): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `AI-коуч 'Майндфул'`,
          text: `Познакомься с 'Майндфул' — твоим персональным AI-коучем для заботы о ментальном здоровье.`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('User cancelled share or something went wrong:', error);
      }
    } else if (typeof navigator?.clipboard?.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(window.location.href);
        this.justCopied.set(true);
        setTimeout(() => this.justCopied.set(false), 2000);
      } catch (err) {
        console.error('Failed to copy: ', err);
        alert('Не удалось скопировать ссылку.');
      }
    } else {
      alert('Функция "Поделиться" или "Копировать" не поддерживается в вашем браузере.');
    }
  }

  private addUserMessage(text: string): void {
     const userMessage: ChatMessage = {
      id: new Date().getTime().toString(),
      sender: 'user',
      text: text,
      timestamp: new Date(),
    };
    this.messages.update(currentMessages => [...currentMessages, userMessage]);
  }
  
  private addBotMessage(text: string): void {
    let messageText = text;
    let containsChart = false;
    let quickReplies: string[] = [];
    
    // The model can sometimes still produce this, even if it's not ideal.
    const cleanQuickReplyRegex = /\[QUICK_REPLIES:\s*(".*?")\s*(,\s*".*?")?\s*(,\s*".*?")?\s*\]/s;
    const match = messageText.match(cleanQuickReplyRegex);

    if (match) {
        try {
            const repliesJson = `[${match.slice(1).filter(Boolean).join(',')}]`;
            quickReplies = JSON.parse(repliesJson);
            messageText = messageText.replace(cleanQuickReplyRegex, '').trim();
        } catch (e) {
            console.error("Failed to parse quick replies JSON:", e);
            quickReplies = [];
        }
    }


    if (messageText.includes('[ASK_FOR_MOOD]')) {
      messageText = messageText.replace('[ASK_FOR_MOOD]', '').trim();
      
      const FOUR_HOURS_IN_MS = 4 * 60 * 60 * 1000;
      const now = Date.now();
      
      if (!this.lastMoodPromptTime || (now - this.lastMoodPromptTime > FOUR_HOURS_IN_MS)) {
        setTimeout(() => this.showMoodPicker.set(true), 100);
      }
    }
    
    if (messageText.includes('[MOOD_CHART]')) {
      containsChart = true;
    }
    
    const botMessage: ChatMessage = {
      id: new Date().getTime().toString() + '-bot',
      sender: 'bot',
      text: messageText,
      timestamp: new Date(),
      containsChart: containsChart,
      quickReplies: quickReplies.length > 0 ? quickReplies : undefined
    };
    this.messages.update(currentMessages => [...currentMessages, botMessage]);
  }
}
