FROM node:22-bookworm-slim AS build
WORKDIR /source
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN cp .env.production.example .env.production && npm run build:prod

FROM nginx:1.28-alpine
COPY --from=build /source/dist /usr/share/nginx/html
COPY deploy/admin.conf.template /etc/nginx/templates/default.conf.template
ENV API_UPSTREAM=http://backend:8080 H5_UPSTREAM=http://storefront
