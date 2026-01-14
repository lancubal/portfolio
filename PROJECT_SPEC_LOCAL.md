# Proyecto: Secure RCE Portfolio (Versión Local Development)

## 1. Resumen Ejecutivo

Desarrollo de un prototipo funcional de "Remote Code Execution" en entorno local. El objetivo es validar la orquestación de contenedores Docker desde Node.js y la comunicación con el Frontend React antes de invertir en infraestructura Cloud.

## 2. Arquitectura Local

### Diagrama de Flujo Lógico

`[Tu Navegador]` -> `[Next.js (localhost:3000)]` -> `HTTP Fetch` -> `[Node API (localhost:3001)]` -> `[Docker Daemon de tu PC]`

### Requisitos Previos en tu Máquina

1. **Node.js:** Versión 18 o superior.
2. **Docker:** Debe estar instalado y corriendo (Docker Desktop en Windows/Mac o Docker Engine en Linux).
3. **Imágenes:** Debes tener las imágenes base descargadas para evitar esperas en la primera ejecución (`docker pull python:3.10-alpine`).

---

## 3. Fases de Implementación Local

### Fase 1: Backend API (El Orquestador)

En lugar de una instancia EC2, correremos un servidor Express simple en un puerto diferente al de Next.js.

* **Setup:** Carpeta `/backend`.
* **Servidor:** Express.js corriendo en puerto `3001`.
* **Permisos:** El script de Node debe tener permiso para ejecutar el comando `docker` en tu terminal.
* **CORS:** Configuración crítica para permitir peticiones desde `localhost:3000`.

### Fase 2: Configuración de Docker Local

Validar que podemos crear contenedores efímeros desde código.

* **Prueba de concepto:** Crear un script `test-docker.js` que ejecute:
```javascript
// Pseudocódigo
exec('docker run --rm python:3.10-alpine python -c "print(1+1)"')

```


* **Volúmenes:** En local, debemos usar rutas absolutas de tu sistema operativo para montar el archivo de código temporal dentro del contenedor.

### Fase 3: Frontend (Next.js)

Interfaz visual para probar la conexión.

* **Setup:** Carpeta `/frontend` (Next.js).
* **Proxy:** Configurar `next.config.js` o usar URL completa `http://localhost:3001/execute` para conectar con el backend.

---

## 4. Guía de Prompts para Gemini CLI (Ajustados para Local)

Usa estos prompts para generar el código necesario paso a paso.

#### Paso A: Estructura del Proyecto y Backend

> "Actúa como un desarrollador Full Stack Senior. Inicializa una estructura de proyecto monorepo con dos carpetas: `client` (Next.js) y `server` (Node/Express).
> Primero, genérame el código para `server/index.js`. Debe ser una API Express en el puerto 3001.
> 1. Incluye el paquete `cors` configurado para aceptar origen 'http://localhost:3000'.
> 2. Crea una ruta POST `/run`.
> 3. Usa `fs.writeFileSync` para guardar el código recibido en un archivo temporal en la carpeta actual (`./temp`).
> 4. Usa `child_process.exec` para correr un contenedor docker que monte ese archivo y ejecute python.
> **Importante:** Usa `path.resolve` para manejar las rutas de archivos correctamente tanto en Windows como en Linux."
>
>

#### Paso B: Dockerfile y Setup de Pruebas

> "Dame los comandos de terminal necesarios para preparar mi entorno local para este proyecto.
> 1. Comandos para crear las carpetas y el `package.json` del server.
> 2. Comando para descargar la imagen de docker `python:3.10-alpine`.
> 3. Un script de prueba `test.curl` para probar el endpoint del backend manualmente desde la terminal."
>
>

#### Paso C: Frontend (Integración)

> "Ahora genérame el componente principal para `client/src/app/page.tsx` (usando App Router).
> 1. Un `textarea` para escribir código.
> 2. Un botón 'Run'.
> 3. Una función `handleSubmit` que haga `fetch('http://localhost:3001/run')` enviando el JSON.
> 4. Muestra la respuesta (stdout) en un bloque `<pre>` con fondo negro y letras verdes."
>
>

---

## 5. Checklist de Verificación (Antes de pasar a Cloud)

1. [ ] **Docker Check:** Ejecutar `docker run hello-world` en tu terminal funciona.
2. [ ] **Backend Vivo:** `node server/index.js` arranca sin errores en puerto 3001.
3. [ ] **CORS Check:** El frontend puede recibir respuesta del backend (y no un error rojo en consola del navegador).
4. [ ] **Limpieza:** Verificar que después de ejecutar código, no quedan archivos basura en la carpeta `./temp` ni contenedores "zombies" (`docker ps -a` debería estar vacío).

---
