
# Stage 1: Build the Vue application
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the frontend source code
COPY . .

# Build the production application
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:alpine

# Copy the production build to Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Expose the HTTP port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
