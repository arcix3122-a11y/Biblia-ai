export interface QueuedErrorLog {
  id: string;
  app_name: string;
  error_message: string;
  error_stack: string | null;
  device_info: Record<string, unknown>;
  created_at: string;
}
