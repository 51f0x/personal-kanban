import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
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
    },
  },
});
