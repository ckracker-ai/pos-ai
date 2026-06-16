# ==========================================
# ETAPA 1: Instalador de dependencias
# ==========================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copiamos los manifiestos de dependencias
COPY package.json package-lock.json* ./
# Instalamos todas las dependencias (incluyendo devDependencies para poder compilar)
RUN npm ci

# ==========================================
# ETAPA 2: Constructor (Builder)
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copiamos las dependencias instaladas desde la etapa anterior
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Deshabilitamos la telemetría de Next.js durante la compilación por privacidad/rendimiento
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Variables embebidas en el bundle del cliente (deben existir en build)
ARG NEXT_PUBLIC_INTERNAL_KEY=supersecretkey
ARG NEXT_PUBLIC_API_URL=
ARG BFF_INTERNAL_URL=http://pos-api-bff:2020
ARG NEXT_PUBLIC_APP_VERSION=1.9.2026-06-08
ENV NEXT_PUBLIC_INTERNAL_KEY=$NEXT_PUBLIC_INTERNAL_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION
ENV BFF_INTERNAL_URL=$BFF_INTERNAL_URL

# Compilamos la aplicación Next.js + React
RUN npm run build

# ==========================================
# ETAPA 3: Imagen de producción final (Ultra-ligera y segura)
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=80
ENV HOSTNAME="0.0.0.0"

# Configuramos la directiva de seguridad que pide tu docker-compose ("user: 1000:1000")
# En las imágenes Alpine de Node, el usuario 'node' ya viene creado por defecto con el UID 1000
RUN chown -R node:node /app
USER node

# Copiamos únicamente los artefactos estrictamente necesarios desde la etapa 'builder'
# Next.js standalone agrupa todo lo necesario en carpetas independientes
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Exponemos el puerto 80 que definiste en la capa pública del gateway
EXPOSE 80

# Next.js standalone genera un archivo server.js optimizado que no requiere dependencias externas
CMD ["node", "server.js"]