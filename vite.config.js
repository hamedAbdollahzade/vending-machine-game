import {defineConfig} from 'vite';

export default defineConfig({
    // Relative assets also load under a GitHub Pages repository path.
    base: './',
    server: {
        host: true,
        allowedHosts: [
            'robotmarkets.ir',
            'www.robotmarkets.ir',
        ],
    },
});
