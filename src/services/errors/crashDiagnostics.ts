import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { AppState, type AppStateStatus, Platform } from "react-native";
import { logError } from "@/services/errors/errorLogger";

const SESSION_KEY = "@biblia-ai/crash-session";
const BREADCRUMBS_KEY = "@biblia-ai/crash-breadcrumbs";
const MAX_BREADCRUMBS = 25;

interface CrashSessionState {
  active: boolean;
  startedAt: string;
  appState: AppStateStatus;
  appVersion: string;
  platform: string;
}

interface Breadcrumb {
  at: string;
  level: "warn" | "error";
  message: string;
}

let diagnosticsInstalled = false;
let restoreConsole: (() => void) | null = null;
let appStateSubscription: { remove: () => void } | null = null;
let breadcrumbs: Breadcrumb[] = [];

function normalizeArg(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Error) {
    return value.message;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

async function persistSessionState(nextState: CrashSessionState): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(nextState));
}

async function readPreviousSessionState(): Promise<CrashSessionState | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as CrashSessionState;
  } catch {
    return null;
  }
}

async function persistBreadcrumbs(next: Breadcrumb[]): Promise<void> {
  await AsyncStorage.setItem(BREADCRUMBS_KEY, JSON.stringify(next));
}

async function readBreadcrumbs(): Promise<Breadcrumb[]> {
  try {
    const raw = await AsyncStorage.getItem(BREADCRUMBS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as Breadcrumb[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function pushBreadcrumb(level: "warn" | "error", args: unknown[]): void {
  const joined = args.map(normalizeArg).join(" ").slice(0, 500);
  breadcrumbs = [...breadcrumbs, { at: new Date().toISOString(), level, message: joined }].slice(
    -MAX_BREADCRUMBS
  );
  void persistBreadcrumbs(breadcrumbs);
}

function installConsoleBreadcrumbs(): void {
  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);

  console.error = (...args: unknown[]) => {
    pushBreadcrumb("error", args);
    originalError(...args);
  };

  console.warn = (...args: unknown[]) => {
    pushBreadcrumb("warn", args);
    originalWarn(...args);
  };

  restoreConsole = () => {
    console.error = originalError;
    console.warn = originalWarn;
  };
}

function getAppVersion(): string {
  return String(Constants.expoConfig?.version ?? "unknown");
}

async function markSessionActive(appState: AppStateStatus): Promise<void> {
  await persistSessionState({
    active: true,
    startedAt: new Date().toISOString(),
    appState,
    appVersion: getAppVersion(),
    platform: Platform.OS,
  });
}

async function markSessionState(appState: AppStateStatus): Promise<void> {
  const prev = await readPreviousSessionState();
  const startedAt = prev?.startedAt ?? new Date().toISOString();
  await persistSessionState({
    active: true,
    startedAt,
    appState,
    appVersion: getAppVersion(),
    platform: Platform.OS,
  });
}

async function markSessionClosed(): Promise<void> {
  const prev = await readPreviousSessionState();
  if (!prev) {
    return;
  }
  await persistSessionState({ ...prev, active: false, appState: "background" });
}

async function reportPreviousUncleanShutdown(): Promise<void> {
  const prev = await readPreviousSessionState();
  if (!prev?.active) {
    return;
  }

  const previousBreadcrumbs = await readBreadcrumbs();
  logError(new Error("Detected previous unclean app shutdown"), "UncleanShutdown", {
    previousSession: prev,
    breadcrumbs: previousBreadcrumbs,
  });
}

export function initializeCrashDiagnostics(): void {
  if (diagnosticsInstalled) {
    return;
  }
  diagnosticsInstalled = true;

  void (async () => {
    breadcrumbs = await readBreadcrumbs();
    await reportPreviousUncleanShutdown();
    await markSessionActive(AppState.currentState);
  })();

  installConsoleBreadcrumbs();

  appStateSubscription = AppState.addEventListener("change", (nextState) => {
    void markSessionState(nextState);
  });
}

export function shutdownCrashDiagnostics(): void {
  if (!diagnosticsInstalled) {
    return;
  }
  diagnosticsInstalled = false;

  appStateSubscription?.remove();
  appStateSubscription = null;

  if (restoreConsole) {
    restoreConsole();
    restoreConsole = null;
  }

  void markSessionClosed();
}
