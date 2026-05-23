declare module "expo-speech" {
  export interface SpeechOptions {
    language?: string;
    pitch?: number;
    rate?: number;
    voice?: string;
    onStart?: () => void;
    onDone?: () => void;
    onStopped?: () => void;
    onError?: (error: Error) => void;
  }

  export function speak(text: string, options?: SpeechOptions): void;
  export function stop(): Promise<void>;
  export function pause(): Promise<void>;
  export function resume(): Promise<void>;
  export function isSpeakingAsync(): Promise<boolean>;
}
