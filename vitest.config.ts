import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: 'chromium' }],
      // We don't do visual-regression testing; failure screenshots add disk
      // noise and conflict with the test-as-functional-assertion philosophy.
      screenshotFailures: false,
    },
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/unit/setup.ts'],
  },
  optimizeDeps: {
    // Pre-bundle zustand entry points so a first-encounter optimization mid-run
    // doesn't force a reload (vitest warns: "Vite unexpectedly reloaded a
    // test"). Without this, the per-mount store refactor caused
    // tests/unit/store/persistence.test.ts to fail to import.
    include: ['zustand', 'zustand/vanilla', 'zustand/middleware'],
  },
  resolve: {
    alias: { '@': new URL('.', import.meta.url).pathname },
    // Dedupe React so Radix-based shadcn components (Dialog, Popover, etc.)
    // see the same React instance as vitest-browser-react. Without this Vite
    // optimizes Radix separately and its `useRef` returns null (dual-React).
    dedupe: ['react', 'react-dom'],
  },
});
