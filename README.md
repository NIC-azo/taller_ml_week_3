para ejecutar el sistema, primero dirigirse al la carpeta frontend con (cd frontend) en la terminal, luego poner pnpm install (para instalar todas las dependencias que forman parte del sistema), tercero ponen en la terminal (pnpm dev) para correr el sistema en navegador web local o en live server local (yo tengo una extension de vite que me permite abrir el sistema o ejecutarlo en el vs code en local)

---




# 📚 Explicación Detallada de Cada Característica del Sistema

Aquí tienes el desglose técnico de **cómo funciona cada módulo** que desarrollamos, con explicaciones de arquitectura, flujo de datos y patrones aplicados.

---

## 🎨 1. Sistema de Toggle de Tema (Dark/Light Mode)

### 🔧 Tecnología: **Zustand + persist middleware**

```typescript
// src/store/theme.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        // Aplica la clase 'dark' al elemento <html>
        document.documentElement.classList.toggle('dark', next === 'dark');
        set({ theme: next });
      },
    }),
    { name: 'farmacia-theme' } // Clave para localStorage
  )
);
```

### 🔄 Flujo de funcionamiento:

```
1. Usuario hace click en botón 🌙/☀️
   ↓
2. toggleTheme() calcula el tema opuesto
   ↓
3. document.documentElement.classList.toggle('dark', ...)
   → Aplica/remueve la clase "dark" en <html>
   ↓
4. Tailwind CSS detecta la clase y aplica variables oscuras
   ↓
5. persist guarda el tema en localStorage
   → Al recargar, el tema se restaura automáticamente
```

### ✅ Ventajas de esta implementación:

| Característica                   | Beneficio                                          |
| --------------------------------- | -------------------------------------------------- |
| **persist middleware**      | El tema no se pierde al recargar la página        |
| **classList en `<html>`** | Funciona con Tailwind's `dark:` modifier nativo  |
| **Estado global (Zustand)** | Cualquier componente puede leer/cambiar el tema    |
| **Sin FOUC**                | Se aplica el tema antes del render en `main.tsx` |

---

## 🤖 2. Componente DetectorIA (Machine Learning en el Navegador)

### 📦 Tecnologías clave:

- `@tensorflow/tfjs`: Motor de inferencia de ML en JavaScript
- `@teachablemachine/image`: Wrapper para modelos de clasificación de imágenes
- `requestAnimationFrame`: Loop optimizado para animaciones en el navegador

### 🔄 Ciclo de vida completo:

```mermaid
graph LR
    A[Cargar componente] --> B[tf.ready()]
    B --> C[Cargar model.json + metadata.json]
    C --> D[Modelo listo en memoria]
    D --> E[Solicitar permisos de webcam]
    E --> F[getUserMedia + video.play()]
    F --> G[Loop: canvas.drawImage + model.predict]
    G --> H[Actualizar estado React con predicciones]
    H --> I[Renderizar UI con barras de progreso]
    I --> G
```

### 📋 Detalle paso a paso:

#### **Paso 1: Carga del modelo (useEffect #1)**

```typescript
useEffect(() => {
  async function loadModel() {
    await tf.ready(); // Espera que TensorFlow.js esté inicializado
  
    const MODEL_URL = '/model/model.json'; // Manifiesto del modelo
    const METADATA_URL = '/model/metadata.json'; // Nombres de clases
  
    const loadedModel = await tmImage.load(MODEL_URL, METADATA_URL);
    setModel(loadedModel); // Guarda en estado para usar en predicciones
  }
  loadModel();
}, []); // Solo se ejecuta una vez al montar
```

**¿Por qué dos archivos?**

| Archivo                  | Contenido                                                | Función                            |
| ------------------------ | -------------------------------------------------------- | ----------------------------------- |
| `model.json`           | Arquitectura de la red + rutas a los pesos               | Define cómo es el modelo           |
| `group1-shard1of1.bin` | Pesos numéricos (float32) de la red neuronal            | Define qué "sabe" el modelo        |
| `metadata.json`        | Nombres de las clases:`['Teléfono', 'Mano', 'Fondo']` | Traduce índices a nombres legibles |

---

#### **Paso 2: Inicialización de webcam (useEffect #2)**

```typescript
useEffect(() => {
  let stream: MediaStream | null = null;
  let animationId: number;

  async function startWebcam() {
    if (!model || !videoRef.current || !canvasRef.current) return;
  
    // 1. Solicitar acceso a la cámara
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 224 }, height: { ideal: 224 } },
      audio: false,
    });
  
    // 2. Conectar stream al elemento <video>
    videoRef.current.srcObject = stream;
  
    // 3. Esperar que el video tenga dimensiones definidas
    await new Promise((resolve) => {
      videoRef.current!.addEventListener('loadedmetadata', resolve, { once: true });
    });
  
    // 4. Iniciar reproducción
    await videoRef.current.play();
  
    // 5. Sincronizar canvas con las dimensiones del video
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
  
    // 6. Iniciar loop de predicción
    async function predictLoop() {
      // Dibujar frame actual en canvas (el modelo necesita canvas, no video)
      const ctx = canvasRef.current!.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvasRef.current!.width, canvasRef.current!.height);
      }
    
      // Ejecutar inferencia
      const predictions = await model.predict(canvasRef.current!);
    
      // Formatear y actualizar estado
      const formattedPredictions = predictions.map(p => ({
        className: p.className,
        probability: Math.round(p.probability * 10000) / 100, // 2 decimales
      }));
      setPredictions(formattedPredictions);
    
      // Programar siguiente frame
      animationId = requestAnimationFrame(predictLoop);
    }
    predictLoop();
  }

  if (model) startWebcam();

  // Cleanup: liberar recursos al desmontar
  return () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (animationId) cancelAnimationFrame(animationId);
  };
}, [model]);
```

### 🔑 Puntos críticos explicados:

| Código                                      | ¿Por qué es necesario?                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `await tf.ready()`                         | TensorFlow.js carga WebAssembly en background; sin esto, fallaría la inferencia                  |
| `loadedmetadata` event                     | El video puede no tener dimensiones al iniciar; sin esperar, el canvas tendría tamaño 0x0       |
| `canvas.drawImage()`                       | El modelo de Teachable Machine espera un `HTMLCanvasElement`, no un `HTMLVideoElement`        |
| `requestAnimationFrame`                    | Sincroniza el loop con la tasa de refresco del navegador (60fps típico), optimizando rendimiento |
| `stream.getTracks().forEach(track.stop())` | Sin esto, la webcam queda encendida aunque el componente se desmonte (fuga de recursos)           |

---

## 📊 3. Sistema de Visualización de Predicciones

### 🎯 Lógica para encontrar la clase dominante:

```typescript
const dominantPrediction = predictions.reduce((max, pred) =>
  pred.probability > max.probability ? pred : max
, predictions[0] || { className: '-', probability: 0 });
```

**¿Qué hace?**

- Recorre el array de predicciones
- Compara cada probabilidad con el máximo actual
- Retorna la clase con mayor confianza
- Maneja el caso edge: si no hay predicciones, retorna un objeto por defecto

### 🎨 Renderizado condicional de estados:

```typescript
if (loading) return <Spinner />;      // Mientras carga el modelo
if (error) return <ErrorMessage />;   // Si falla webcam o modelo
return <DetectorUI />;                // UI principal con video y predicciones
```

### 📈 Barras de progreso dinámicas:

```tsx
<div
  className={`h-full rounded-full transition-all duration-300 ${
    pred.className === dominantPrediction.className
      ? 'bg-gradient-to-r from-blue-500 to-purple-600' // Destacada
      : 'bg-gray-400 dark:bg-gray-500' // Normal
  }`}
  style={{ width: `${pred.probability}%` }} // Ancho proporcional a confianza
/>
```

**Características UX:**

- ✅ `transition-all duration-300`: Animación suave al cambiar valores
- ✅ Clase destacada para la predicción ganadora (gradiente azul-morado)
- ✅ Soporte dark mode con clases `dark:` de Tailwind
- ✅ Porcentajes con 2 decimales para precisión legible

---

## 🔄 4. Integración con App.tsx (Orquestación)

```typescript
function App() {
  const { theme, toggleTheme } = useThemeStore(); // Hook personalizado
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header con toggle de tema */}
      <header>
        <button onClick={toggleTheme}>
          {theme === 'light' ? <i className="fas fa-moon" /> : <i className="fas fa-sun" />}
        </button>
      </header>
    
      {/* Contenido principal */}
      <main>
        <DetectorIA /> {/* Componente autónomo de ML */}
      </main>
    </div>
  );
}
```

### 🧩 Patrón de diseño aplicado: **Composición + Separación de responsabilidades**

| Módulo           | Responsabilidad                     | Comunicación                                            |
| ----------------- | ----------------------------------- | -------------------------------------------------------- |
| `useThemeStore` | Gestionar estado global del tema    | Hook personalizado, accesible desde cualquier componente |
| `DetectorIA`    | Cargar modelo + webcam + inferencia | Props/estado internos, completamente autónomo           |
| `App.tsx`       | Orquestar layout y temas            | Consume store, renderiza componentes hijos               |

---

## 🛡️ 5. Manejo de Errores y Edge Cases

### 🔐 Permisos de webcam:

```typescript
} catch (error) {
  setError('Error accediendo a la webcam. Verifica los permisos.');
  console.error(error);
}
```

**Escenarios manejados:**

| Error                | Causa probable                | Mensaje al usuario                                   |
| -------------------- | ----------------------------- | ---------------------------------------------------- |
| `NotAllowedError`  | Usuario denegó permisos      | "Verifica los permisos"                              |
| `NotFoundError`    | No hay webcam disponible      | (mismo mensaje genérico)                            |
| `NotReadableError` | Webcam ya en uso por otra app | (mismo mensaje)                                      |
| 404 en model.json    | Archivos mal ubicados         | "Verifica que los archivos estén en /public/model/" |

### 🧹 Limpieza de recursos (Cleanup):

```typescript
return () => {
  if (stream) stream.getTracks().forEach(track => track.stop());
  if (animationId) cancelAnimationFrame(animationId);
};
```

**¿Por qué es crítico?**

- Sin `track.stop()`: La luz de la webcam sigue encendida aunque navegues a otra página
- Sin `cancelAnimationFrame`: El loop de predicción sigue ejecutándose en background, consumiendo CPU

---

## 🚀 6. Optimizaciones Aplicadas

### ⚡ Rendimiento:

| Técnica                               | Impacto                                                              |
| -------------------------------------- | -------------------------------------------------------------------- |
| `requestAnimationFrame`              | Sincroniza con refresh rate del navegador, evita frames innecesarios |
| Canvas oculto (`className="hidden"`) | Procesa imágenes sin mostrar el canvas al usuario                   |
| Modelo MobileNet (pre-entrenado)       | Transfer learning: rápido de cargar, ligero para inferencia         |
| Resolución 224x224                    | Tamaño óptimo para MobileNet; balance precisión/velocidad         |

### ♿ Accesibilidad:

```tsx
<button aria-label="Cambiar tema">...</button>
<video playsInline muted autoPlay /> {/* Sin sonido, evita autoplay bloqueado */}
```

### 🎨 Tailwind CSS:

- Clases utilitarias para responsive design
- Soporte nativo de dark mode con `dark:` prefix
- Transiciones suaves con `transition-all duration-300`

---

## 📋 Resumen Visual del Flujo Completo

```
┌─────────────────────────────────────────┐
│ 1. Usuario abre la app                   │
└────────────────┬────────────────────────┘
                 ▼
┌─────────────────────────────────────────┐
│ 2. App.tsx monta + aplica tema guardado │
└────────────────┬────────────────────────┘
                 ▼
┌─────────────────────────────────────────┐
│ 3. DetectorIA monta:                     │
│    • tf.ready()                          │
│    • Carga model.json + metadata.json    │
└────────────────┬────────────────────────┘
                 ▼
┌─────────────────────────────────────────┐
│ 4. Modelo listo → solicita webcam        │
│    • getUserMedia()                      │
│    • Video.play() + loadedmetadata       │
└────────────────┬────────────────────────┘
                 ▼
┌─────────────────────────────────────────┐
│ 5. Loop de inferencia (60fps):           │
│    • canvas.drawImage(video)             │
│    • model.predict(canvas)               │
│    • setPredictions() → re-render UI     │
│    • requestAnimationFrame(predictLoop)  │
└────────────────┬────────────────────────┘
                 ▼
┌─────────────────────────────────────────┐
│ 6. Usuario ve en tiempo real:            │
│    • Video de su webcam                  │
│    • Clase dominante destacada           │
│    • Barras de progreso animadas         │
└─────────────────────────────────────────┘
```

---

## 💡 Consejos para Explicar en tu Defensa/Entrega

1. **Enfatiza el "por qué"**: No solo digas "usamos requestAnimationFrame", explica "lo usamos para sincronizar la inferencia con el refresh rate del navegador y evitar sobrecarga de CPU".
2. **Menciona buenas prácticas**: Cleanup de streams, manejo de errores, separación de responsabilidades.
3. **Destaca la arquitectura**: "El componente DetectorIA es autónomo: puede reutilizarse en cualquier proyecto sin depender del theme store".
4. **Relaciona con el enunciado**: "Implementamos exactamente el ciclo de vida pedido: Captura → Tensor → Predicción → DOM, sin recargar la página".

---

¿Te gustaría que profundice en alguna característica específica? ¿O necesitas ayuda para preparar la explicación oral para tu entrega? 🎓🚀
