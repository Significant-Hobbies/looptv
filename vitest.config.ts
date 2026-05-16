import path from 'path';

import react from '@vitejs/plugin-react';
import { defineVitestConfig } from '@saas-maker/test-config/vitest';

export default defineVitestConfig({
  extend: {
    test: {
      include: ["src/**/__tests__/**/*.test.ts", "src/**/*.test.ts", "scripts/__tests__/**/*.test.ts"],
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  },
});
