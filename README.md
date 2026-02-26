git commit -m "feat: inicialización del proyecto Excellere"
# Excellere Revive 2.0

Este es el proyecto modernizado de Excellere, construido con Next.js 15, Firebase y Genkit.

## Requisitos Previos
- Node.js 20+
- Firebase CLI instalado (`npm install -g firebase-tools`)

## Comandos Útiles
- `npm run dev`: Inicia el servidor de desarrollo en el puerto 9003.
- `npm run build`: Compila la aplicación para producción.
- `firebase deploy`: Despliega las reglas de seguridad y funciones de nube.

## Estructura del Proyecto
- `/src/app`: Rutas y páginas de la aplicación (Next.js App Router).
- `/src/components`: Componentes UI reutilizables (ShadCN).
- `/src/firebase`: Configuración y hooks de Firebase.
- `/functions`: Lógica de backend (Firebase Functions v2).
- `/docs`: Documentación técnica y esquema de datos.

## Despliegue en App Hosting
1. Sube este código a un repositorio de GitHub.
2. En el Firebase Console, ve a **App Hosting**.
3. Conecta tu repositorio de GitHub y selecciona la rama `main`.
4. Firebase detectará automáticamente Next.js y realizará el despliegue.
