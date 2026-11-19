import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 루트 .env를 세 앱이 같이 쓴다
export default defineConfig({ plugins: [react()], envDir: '../..' });
