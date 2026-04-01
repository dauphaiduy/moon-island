import { defineConfig } from 'vite';

export default defineConfig({
  // Required for Electron: assets load via relative paths from file://
  base: './',
});
