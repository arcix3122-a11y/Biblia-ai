import { Platform } from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSupabaseClient } from "./supabaseClient";
import type { QueuedErrorLog } from "@/types/errors";

const APP_NAME = "biblia-ai" as const;
const QUEUE_KEY = "@biblia-ai/error-log-queue";

function buildDeviceInfo(metadata?: Record<string, unknown>): Record<string, unknown> {
  return {
    model: (Constants.deviceName as string | null | undefined) ?? "unknown",
    os: Platform.OS,
    os_version: String(Platform.Version),
    ...metadata,
  };
}

async function readQueue(): Promise<QueuedErrorLog[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as QueuedErrorLog[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(entries: QueuedErrorLog[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(entries));
}

async function enqueue(entry: QueuedErrorLog): Promise<void> {
  const queue = await readQueue();
  queue.push(entry);
  await writeQueue(queue.slice(-100));
}

async function flushQueue(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  const queue = await readQueue();
  if (queue.length === 0) {
    return;
  }

  const remaining: QueuedErrorLog[] = [];

  for (const item of queue) {
    const { error } = await supabase.from("error_logs").insert({
      app_name: item.app_name,
      error_message: item.error_message,
      error_stack: item.error_stack,
      device_info: item.device_info,
    });

    if (error) {
      remaining.push(item);
    }
  }

  await writeQueue(remaining);
}

function normalizeError(error: unknown): { message: string; stack: string | null } {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack ?? null,
    };
  }
  return { message: String(error), stack: null };
}

export function logError(
  error: unknown,
  context?: string,
  metadata?: Record<string, unknown>
): void {
  void (async () => {
    try {
      const { message, stack } = normalizeError(error);
      const errorMessage = context ? `[${context}] ${message}` : message;

      const payload: QueuedErrorLog = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        app_name: APP_NAME,
        error_message: errorMessage.slice(0, 1000),
        error_stack: stack?.slice(0, 4000) ?? null,
        device_info: buildDeviceInfo(metadata),
        created_at: new Date().toISOString(),
      };

      const supabase = getSupabaseClient();
      if (!supabase) {
        await enqueue(payload);
        return;
      }

      const { error: insertError } = await supabase.from("error_logs").insert({
        app_name: payload.app_name,
        error_message: payload.error_message,
        error_stack: payload.error_stack,
        device_info: payload.device_info,
      });

      if (insertError) {
        await enqueue(payload);
        return;
      }

      await flushQueue();
    } catch {
      // Error logging must never crash the app.
    }
  })();
}

export function initializeErrorLogger(): void {
  void flushQueue();
  setInterval(() => {
    void flushQueue();
  }, 30_000);
}
