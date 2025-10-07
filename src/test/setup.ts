import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, vi } from 'vitest';

// Extend expect with testing-library matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock for Tauri API
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}));

// Mock for sonner (toasts)
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  Toaster: ({ children }: { children?: React.ReactNode }) => children || null,
}));

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Export mock for use in tests
export { mockInvoke };
