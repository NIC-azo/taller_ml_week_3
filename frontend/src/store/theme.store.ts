import {create} from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}
/**
 * Zustand store para manejar el tema de la aplicación (claro/oscuro) con persistencia 
 * en localStorage.
 * El estado se guarda bajo la clave 'theme' en localStorage, lo que permite mantener 
 * la preferencia del usuario incluso después de recargar la página.
 * La función toggleTheme alterna entre los temas claro y oscuro, actualizando la 
 * clase del elemento raíz del documento para reflejar el cambio de tema.
 */
export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            theme: 'light',
            toggleTheme: () => {
                const next = get().theme === 'light' ? 'dark' : 'light';
                document.documentElement.classList.toggle('dark', next === 'dark');
                set({theme: next});
            },
        }),
        {
            name: 'sistem-theme', // nombre de la clave en localStorage
            // Rehidrata el estado desde localStorage al cargar la aplicación
            onRehydrateStorage: () => (state) => {
                // Aplica la clase 'dark' al elemento raíz si el tema guardado es 'dark'
                if (state) {
                    document.documentElement.classList.toggle('dark', state.theme === "dark");
                }
            },
        }
    )
);