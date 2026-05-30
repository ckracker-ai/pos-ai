# ==========================================
# Dockerfile para api-bff (Optimizado y Seguro)
# ==========================================
FROM node:20-alpine

# Definimos el directorio de trabajo
WORKDIR /usr/src/app

# Cambiamos la propiedad del directorio de trabajo al usuario 'node' (UID/GID 1000)
# Esto asegura que cuando Compose use "user: 1000:1000", el proceso pueda operar aquí
RUN chown -R node:node /usr/src/app

# Copiamos los manifiestos de dependencias asegurando que pertenezcan al usuario 'node'
COPY --chown=node:node package.json package-lock.json* ./

# Pasamos temporalmente al usuario node para instalar dependencias de forma segura
USER node
RUN npm install --production

# Copiamos el resto del código fuente manteniendo la propiedad para el usuario 'node'
COPY --chown=node:node . .

# Compilamos la aplicación (TypeScript a JavaScript en la carpeta dist)
RUN npm run build

# Expone el puerto asignado en la arquitectura
EXPOSE 3000

# Ejecuta el servidor final
CMD ["node", "dist/server.js"]