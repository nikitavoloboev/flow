import { invoke as tauriInvoke } from '@tauri-apps/api/core';

/**
 * Typed wrapper for Tauri calls
 * Centralizes error handling and logging
 */
export async function invoke<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  try {
    const result = await tauriInvoke<T>(command, args);
    return result;
  } catch (error) {
    console.error(`[Tauri Error] Command: ${command}`, error);
    throw error;
  }
}

/**
 * Invoke with timeout
 */
export async function invokeWithTimeout<T>(
  command: string,
  args?: Record<string, unknown>,
  timeoutMs = 30000,
): Promise<T> {
  return Promise.race([
    invoke<T>(command, args),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${command}`)), timeoutMs),
    ),
  ]);
}
