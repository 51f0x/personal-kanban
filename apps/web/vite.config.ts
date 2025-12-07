import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],

    // Load .env files from project root (../../)
    // Note: Vite will look for .env, .env.local, etc. in the root directory
    // For .env.web, you may need to copy it to apps/web/.env or create a symlink
    envDir: resolve(__dirname, '../..'),
    envPrefix: 'VITE_',

    server: {
        port: 5173,
        strictPort: false,
        open: false,
    },

    build: {
        // Output directory
        outDir: 'dist',

        // Generate separate source map files (not inline)
        sourcemap: true,

        // Minification
        minify: 'esbuild',

        // Chunking strategy
        rollupOptions: {
            output: {
                // Separate vendor chunks
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'dnd-vendor': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
                    'socket-vendor': ['socket.io-client'],
                },
                // Clean up source map paths (remove relative path prefixes)
                sourcemapPathTransform: (relativeSourcePath) => {
                    return relativeSourcePath.replace(/^\.\.\/src\//, '');
                },
            },
        },

        // Build optimization
        target: 'esnext',
        cssCodeSplit: true,

        // Chunk size warnings
        chunkSizeWarningLimit: 1000,
    },

    // Path resolution
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            '@/components': resolve(__dirname, './src/components'),
            '@/features': resolve(__dirname, './src/features'),
            '@/pages': resolve(__dirname, './src/pages'),
            '@/layouts': resolve(__dirname, './src/layouts'),
            '@/services': resolve(__dirname, './src/services'),
            '@/utils': resolve(__dirname, './src/utils'),
            '@/hooks': resolve(__dirname, './src/hooks'),
            '@/styles': resolve(__dirname, './src/styles'),
            '@/types': resolve(__dirname, './src/types'),
            '@/config': resolve(__dirname, './src/config'),
        },
    },
});
