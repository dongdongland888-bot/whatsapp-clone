import { ref, watch, onMounted } from 'vue';

const THEME_KEY = 'whatsapp-clone-theme';
const THEMES = ['light', 'dark', 'system'];

// Reactive state
const currentTheme = ref('system');
const actualTheme = ref('light');

// Get system preference
const getSystemTheme = () => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Apply theme to document
const applyTheme = (theme) => {
  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
  actualTheme.value = resolvedTheme;
  
  document.documentElement.setAttribute('data-theme', resolvedTheme);
  
  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#111b21' : '#00a884');
  }
};

// Initialize theme from storage
const initTheme = () => {
  const savedTheme = localStorage.getItem(THEME_KEY);
  
  if (savedTheme && THEMES.includes(savedTheme)) {
    currentTheme.value = savedTheme;
  } else {
    currentTheme.value = 'system';
  }
  
  applyTheme(currentTheme.value);
  
  // Listen for system theme changes
  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (currentTheme.value === 'system') {
        applyTheme('system');
      }
    });
  }
};

export function useTheme() {
  // Set theme
  const setTheme = (theme) => {
    if (!THEMES.includes(theme)) {
      console.warn(`Invalid theme: ${theme}. Valid themes are: ${THEMES.join(', ')}`);
      return;
    }
    
    currentTheme.value = theme;
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
  };
  
  // Toggle between light and dark
  const toggleTheme = () => {
    const newTheme = actualTheme.value === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };
  
  // Check if dark mode
  const isDark = () => actualTheme.value === 'dark';
  
  // Initialize on mount
  onMounted(() => {
    initTheme();
  });
  
  // Watch for changes
  watch(currentTheme, (newTheme) => {
    applyTheme(newTheme);
  });
  
  return {
    currentTheme,
    actualTheme,
    themes: THEMES,
    setTheme,
    toggleTheme,
    isDark,
    initTheme
  };
}

// Export for use outside of setup()
export const themeUtils = {
  getSystemTheme,
  applyTheme,
  initTheme
};
