import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 4200
    },
    preview: {
        port: 4201
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-react': ['react', 'react-dom', 'react-router'],
                    'vendor-mantine': [
                        '@mantine/core',
                        '@mantine/hooks',
                        '@mantine/form',
                        '@mantine/dates',
                        '@mantine/notifications',
                        '@mantine/modals'
                    ],
                    'vendor-charts': ['@mantine/charts', 'recharts'],
                    'vendor-motion': ['motion'],
                    'vendor-misc': ['axios', '@tanstack/react-query', 'dayjs']
                }
            }
        }
    }
});
