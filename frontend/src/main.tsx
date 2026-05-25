import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import {useThemeStore} from './store/theme.store.ts'

const savedTheme = useThemeStore.getState().theme;
// Aplica la clase 'dark' al elemento raíz si el tema guardado es 'dark'
document.documentElement.classList.toggle('dark', savedTheme === "dark");

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
