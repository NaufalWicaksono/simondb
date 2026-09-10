FROM nginx:alpine

# Copy pre-built production assets directly (eliminates npm download timeouts inside Docker)
COPY dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
