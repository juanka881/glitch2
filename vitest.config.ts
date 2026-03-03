import path from 'node:path';
import { defineConfig } from 'vitest/config';
import solid from 'vite-plugin-solid';

export default defineConfig({
    resolve: {
        alias: {
            '#src': path.resolve(__dirname, 'src'),
            '#test': path.resolve(__dirname, 'test'),
        }
    },
    test: {
        projects: [            
            {
                extends: true,
                test: {
                    name: 'app',
                    dir: 'test',
                    exclude: ['web/**'],
                }
            },
            {
                extends: true,
                plugins: [solid() as any],
                resolve: {
                    conditions: ['development', 'browser'],
                },
                test: {
                    name: 'web',
                    dir: 'test/web',
                    environment: 'jsdom',                    
                    server: {
                        deps: {
                            // https://github.com/solidjs/vite-plugin-solid/issues/102#issuecomment-2363242031
                            // must have to fix test environment issues
                            inline: true,
                        },
                    }
                }                
            }
        ]
    }
});

