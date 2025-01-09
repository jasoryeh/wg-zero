import { createApp } from 'vue'
import './css/app.css'
import App from './App.vue'

window.osIsDarkTheme = function() {
    return  window.matchMedia('(prefers-color-scheme: dark)').matches;
}

window.reloadTheme = function() {
    document.documentElement.classList.toggle(
      'dark',
      localStorage.theme === 'dark' || (!('theme' in localStorage) && osIsDarkTheme())
    )
}

window.setTheme = function(theme) {
    if (theme == null) {
        localStorage.removeItem('theme');
    } else {
        localStorage.theme = theme;
    }
    window.reloadTheme();
}

window.getTheme = function(theme) {
    return localStorage.theme ?? (osIsDarkTheme() ? 'dark' : 'light');
}


window.toggleTheme = function() {
    window.setTheme(window.getTheme() == 'dark' ? 'light' : 'dark');
}


createApp(App).mount('#app')
