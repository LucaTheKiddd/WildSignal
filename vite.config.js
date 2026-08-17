import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative assets work for both a username site and a /WildSignal/ project site.
  base: './',
  plugins: [react()],
});
