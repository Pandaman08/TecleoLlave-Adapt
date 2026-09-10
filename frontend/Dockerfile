# -------------------------------------------------------------
# Stage 1: Base (Instalación de dependencias de Node)
# -------------------------------------------------------------
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

# -------------------------------------------------------------
# Stage 2: Desarrollo con Hot-Reload (Vite dev server)
# -------------------------------------------------------------
FROM base AS dev
WORKDIR /app
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# -------------------------------------------------------------
# Stage 3: Compilación para Producción (Vite build)
# -------------------------------------------------------------
FROM base AS build
WORKDIR /app
COPY . .
RUN npm run build

# -------------------------------------------------------------
# Stage 4: Servidor Web Nginx para Producción
# -------------------------------------------------------------
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
