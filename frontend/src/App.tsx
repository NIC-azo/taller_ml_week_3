import { DetectorIA } from './components/IADetector';
import { useThemeStore } from './store/theme.store';

function App() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header con toggle de tema */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Clasificador Web Inteligente
          </h1>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 
                     text-gray-800 dark:text-gray-200
                     hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            aria-label="Cambiar tema"
          >
            {theme === 'light' ? (
              <i className="fas fa-moon"></i>
            ) : (
              <i className="fas fa-sun"></i>
            )}
          </button>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Detección en Tiempo Real
          </h2>
          <DetectorIA />
        </div>
      </main>
    </div>
  );
}

export default App;