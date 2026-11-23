import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5188,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4188,
    strictPort: true,
  },
  // GameStudio E0-06: đường dẫn tương đối để đặt bản build ở thư mục con bất kỳ trên máy chủ poc.
  base: './',
  build: {
    // Không xuất sourcemap lên máy chủ công khai.
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
});
