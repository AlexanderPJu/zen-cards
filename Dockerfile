# Используем ультра-легкий и быстрый веб-сервер Nginx на Alpine Linux
FROM nginx:alpine

# Копируем наши файлы проекта в дефолтную директорию Nginx для статики
COPY index.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/

# Экспонируем стандартный 80-й порт
EXPOSE 80