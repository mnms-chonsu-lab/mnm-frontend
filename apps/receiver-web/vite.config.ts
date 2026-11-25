import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 루트 .env와 로고·아이콘(packages/ui/public)을 세 앱이 같이 쓴다
export default defineConfig({ plugins: [react()], envDir: '../..', publicDir: '../../packages/ui/public' });
