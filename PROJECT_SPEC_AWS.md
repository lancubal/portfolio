# Proyecto: Secure RCE Portfolio (Remote Code Execution)

## 1. Resumen Ejecutivo

Implementación de una terminal interactiva en un portfolio web personal desarrollado en Next.js. La terminal permite a los visitantes ejecutar código real (Python, C, Rust) de forma segura. El sistema utiliza una arquitectura híbrida con un frontend en Vercel y un backend de ejecución aislado en AWS EC2/DigitalOcean mediante Docker.

## 2. Arquitectura del Sistema

### Diagrama de Flujo

`[Browser]` -> `[Next.js Frontend]` -> `HTTPS POST` -> `[EC2 Nginx Proxy]` -> `[Node.js API]` -> `[Docker Container]`

### Stack Tecnológico

* **Frontend:** Next.js 14+ (App Router), TailwindCSS, `xterm.js` (opcional) o UI propia.
* **Backend Orchestrator:** Node.js (Express o Fastify).
* **Infraestructura:** Instancia AWS EC2 t3.small (o DigitalOcean Droplet 1GB).
* **Aislamiento:** Docker Engine.
* **Seguridad Web:** Nginx (Reverse Proxy) + Certbot (SSL Let's Encrypt).

---

## 3. Fases de Implementación

### Fase 1: Configuración de Infraestructura (EC2/VPS)

**Objetivo:** Preparar el servidor Linux para soportar cargas de compilación sin bloquearse.

* **OS:** Ubuntu 22.04 / 24.04 LTS.
* **Swap Memory:** Configurar 2GB de Swap (Crítico para evitar OOM kills en compilación de Rust/C).
* **Docker:** Instalación de Docker Engine y permisos de usuario (`usermod -aG docker`).
* **Imágenes Base:** Pre-descargar imágenes ligeras (`python:3.10-alpine`, `gcc:latest`, `rust:alpine`).

### Fase 2: Backend "The Warden" (Node.js API)

**Objetivo:** API que recibe código y gestiona el ciclo de vida de los contenedores efímeros.

* **Endpoint:** `POST /api/execute`
* **Payload:** `{ "language": "python", "code": "print('hola')" }`
* **Lógica de Seguridad (Hardening):**
* Timeout estricto: 5 segundos.
* Network: `none` (Sin internet).
* CPU: 0.5 cores.
* RAM: 128MB.
* Filesystem: Read-only (excepto `/tmp`).


* **Lógica de Ejecución:**
1. Generar ID único (UUID).
2. Escribir código a `/tmp/{uuid}.{ext}`.
3. Ejecutar `docker run` montando el volumen.
4. Capturar `stdout` y `stderr`.
5. Limpiar archivos.



### Fase 3: Seguridad de Red (Nginx & SSL)

**Objetivo:** Permitir que el Frontend (HTTPS) hable con el Backend sin errores de "Mixed Content".

* **Dominio:** Apuntar subdominio (ej: `api.tudominio.com`) a la IP de la EC2.
* **Nginx:** Configurar como Proxy Inverso escuchando en 443 -> redirigiendo a localhost:3000.
* **CORS:** Configurar headers para aceptar peticiones SOLO desde `https://tu-portfolio.vercel.app`.

### Fase 4: Frontend (React/Next.js)

**Objetivo:** Una interfaz de terminal que se sienta real.

* **Componente:** `TerminalWindow.tsx`.
* **Estado:** Manejo de historial de comandos y posición del cursor.
* **Hook:** `useCodeRunner` para gestionar la petición asíncrona a la API.
* **UX:** Mostrar estado de "Compilando..." o "Ejecutando..." y formatear la salida (color rojo para errores).

---

## 4. Guía de Prompts para Gemini CLI

Usa estos prompts secuencialmente en tu terminal para generar el código.

#### Para la Fase 1 (Infraestructura)

> "Actúa como un ingeniero DevOps experto. Genera un script de Bash (`setup.sh`) para una instancia Ubuntu nueva que haga lo siguiente: 1. Cree un archivo swap de 2GB. 2. Instale Docker y Docker Compose. 3. Instale Node.js 20 y Nginx. 4. Descargue las imágenes de docker 'python:3.10-alpine' y 'gcc:11'. Agrega comentarios explicando cada paso."

#### Para la Fase 2 (Backend)

> "Genera una API simple en Node.js usando Express. Crea un endpoint `POST /execute`. Debe recibir 'language' y 'code'. Usa el módulo `child_process` para ejecutar un contenedor docker con las siguientes flags de seguridad: `--network none --memory 128m --rm`. Debe escribir el código en un archivo temporal antes de ejecutarlo. Maneja errores de timeout y limpieza de archivos."

#### Para la configuración de Nginx

> "Genera un archivo de configuración de Nginx (`sites-available/default`) que actúe como Proxy Inverso. Debe escuchar en el puerto 80 y 443, y redirigir todo el tráfico a `http://localhost:3000`. Incluye configuración de CORS para permitir únicamente el origen `https://mi-portfolio.vercel.app`."

#### Para la Fase 4 (Frontend React)

> "Crea un componente de React moderno llamado `Terminal` usando TailwindCSS. Debe tener un área de output y un input al final. Simula el comportamiento de una terminal: al dar Enter, agrega el comando al historial. Si el comando empieza con 'run python', debe llamar a una función asíncrona (mockeada por ahora). Usa hooks para mantener el scroll siempre abajo."

---

## 5. Próximos Pasos (Checklist)

1. [ ] Levantar instancia en DigitalOcean/AWS.
2. [ ] Correr script de setup (Fase 1).
3. [ ] Desplegar backend Node.js en la instancia.
4. [ ] Configurar Dominio y HTTPS.
5. [ ] Integrar fetch en el Frontend local y probar conexión.
