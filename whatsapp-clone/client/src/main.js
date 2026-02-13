import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import store from './store';

// Import styles
import './assets/css/variables.css';
import './assets/css/style.css';
import './assets/css/animations.css';
import './assets/css/responsive.css';
import './assets/css/themes/dark.css';

// Initialize theme from localStorage before mounting
const initTheme = () => {
  const savedTheme = localStorage.getItem('whatsapp-clone-theme') || 'system';
  const getSystemTheme = () => 
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  
  const theme = savedTheme === 'system' ? getSystemTheme() : savedTheme;
  document.documentElement.setAttribute('data-theme', theme);
  
  // Update meta theme-color
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#111b21' : '#00a884');
  }
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const currentTheme = localStorage.getItem('whatsapp-clone-theme');
    if (currentTheme === 'system') {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', e.matches ? '#111b21' : '#00a884');
      }
    }
  });
};

// Initialize theme early to prevent flash
initTheme();

const app = createApp(App);

app.use(store);
app.use(router);
app.mount('#app');
