FROM oven/bun:1.3-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN bun install
COPY . .
RUN bun run build

FROM nginx:alpine AS runtime
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080