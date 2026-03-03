import path from 'node:path';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

const webRoot = path.resolve(__dirname, 'src', 'web');
const monitorTarget = process.env.GLITCH_MONITOR_BASE_URL ?? 'http://127.0.0.1:19001';

export default defineConfig({
	root: webRoot,
	plugins: [solid()],
	server: {
		host: '127.0.0.1',
		port: 3001,
		proxy: {
			'/api': {
				target: monitorTarget,
				changeOrigin: true,
			},
			'/api/event': {
				target: monitorTarget,
				changeOrigin: true,
				ws: true,
			},
		},
	},
	build: {
		outDir: path.resolve(__dirname, 'dist', 'web'),
		emptyOutDir: true,
	},
	resolve: {
		alias: {
			'#src': path.resolve(__dirname, 'src'),
			'#test': path.resolve(__dirname, 'test'),
		}
	}
});
