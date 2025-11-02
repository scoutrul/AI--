import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from './services/gemini.service';
import { ChatMessage } from './models/chat.model';

// Component Imports
import { HeaderComponent } from './header/header.component';
import { ChatAreaComponent } from './chat-area/chat-area.component';
import { MessageInputComponent } from './message-input/message-input.component';
import { MoodPickerComponent, MoodSelection } from './mood-picker/mood-picker.component';
import { JournalModalComponent } from './journal-modal/journal-modal.component';

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
    JournalModalComponent
  ]
})
export class AppComponent {
  private geminiService = inject(GeminiService);

  messages = signal<ChatMessage[]>([]);
  isLoading = signal(true);
  showMoodPicker = signal(false);
  isRecording = signal(false);
  speechApiSupported = signal(false);
  moodHistory = signal<MoodData[]>([]);
  
  showJournal = signal(false);
  journalHistory = signal<JournalEntry[]>([]);

  private recognition: any;
  private audioPlayer: HTMLAudioElement | null = null;

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
  }

  private initializeSpeechRecognition(): void {
    if ('webkitSpeechRecognition' in window) {
      this.speechApiSupported.set(true);
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'ru-RU';

      this.recognition.onstart = () => this.isRecording.set(true);
      this.recognition.onend = () => this.isRecording.set(false);
      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
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
  
  toggleRecording(): void {
    if (!this.speechApiSupported()) return;
    if (this.isRecording()) {
      this.recognition.stop();
    } else {
      this.recognition.start();
      this.isRecording.set(true);
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
    this.isLoading.set(true);
    this.stopCurrentAudio();

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
    this.stopCurrentAudio();
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
    this.addBotMessage('Спасибо, что поделились. Ваши мысли сохранены.');
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

    if (text.includes('[ASK_FOR_MOOD]')) {
      messageText = text.replace('[ASK_FOR_MOOD]', '').trim();
      setTimeout(() => this.showMoodPicker.set(true), 100);
    }
    
    if (text.includes('[MOOD_CHART]')) {
      containsChart = true;
    }
    
    const botMessage: ChatMessage = {
      id: new Date().getTime().toString() + '-bot',
      sender: 'bot',
      text: messageText,
      timestamp: new Date(),
      containsChart: containsChart,
      audioState: 'idle'
    };
    this.messages.update(currentMessages => [...currentMessages, botMessage]);
  }
  
  private base64ToBlob(base64: string, contentType: string = ''): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  }

  private stopCurrentAudio(): void {
    if (this.audioPlayer) {
        this.audioPlayer.pause();
        this.audioPlayer.src = '';
        this.audioPlayer = null;
    }
    this.messages.update(msgs => 
        msgs.map(m => (m.sender === 'bot' && m.audioState !== 'idle') ? { ...m, audioState: 'idle' } : m)
    );
  }

  async playTts(messageToPlay: ChatMessage): Promise<void> {
    if (messageToPlay.audioState === 'playing') {
        this.stopCurrentAudio();
        return;
    }

    this.stopCurrentAudio();
    this.messages.update(msgs => msgs.map(m => m.id === messageToPlay.id ? { ...m, audioState: 'loading' } : m));

    try {
        const audioBase64 = await this.geminiService.textToSpeech(messageToPlay.text.split('[MOOD_CHART]')[0]);
        
        const currentMessages = this.messages();
        const msgInState = currentMessages.find(m => m.id === messageToPlay.id);
        if (!msgInState || msgInState.audioState !== 'loading') {
            return; 
        }

        const audioBlob = this.base64ToBlob(audioBase64, 'audio/mpeg');
        const audioUrl = URL.createObjectURL(audioBlob);
        
        this.audioPlayer = new Audio(audioUrl);
        this.audioPlayer.play();
        this.messages.update(msgs => msgs.map(m => m.id === messageToPlay.id ? { ...m, audioState: 'playing' } : m));

        this.audioPlayer.onended = () => {
            this.stopCurrentAudio();
            URL.revokeObjectURL(audioUrl);
        };
        this.audioPlayer.onerror = () => {
             console.error('Error playing audio');
             this.stopCurrentAudio();
             URL.revokeObjectURL(audioUrl);
        }

    } catch (error) {
        console.error('Failed to play TTS audio:', error);
        this.messages.update(msgs => msgs.map(m => m.id === messageToPlay.id ? { ...m, audioState: 'idle' } : m));
    }
  }
}
