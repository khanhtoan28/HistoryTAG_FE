# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm config set registry https://registry.npmjs.org/
RUN npm install --legacy-peer-deps
COPY . .
# ⚠️ QUAN TRỌNG: Set VITE_API_URL="" để frontend dùng relative path /api
# Nginx sẽ proxy /api đến backend container
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
# ✅ Set các biến khác để dùng relative path (same origin với Cloudflare Tunnel)
ARG VITE_NOTIFICATION_STOMP_URL=""
ENV VITE_NOTIFICATION_STOMP_URL=$VITE_NOTIFICATION_STOMP_URL
ARG VITE_LOGOUT_URL="/api/v1/auth/logout"
ENV VITE_LOGOUT_URL=$VITE_LOGOUT_URL
RUN npm run build

# Production stage với Nginx
FROM nginx:alpine
COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

