# Stage 1: Build the React application
FROM node:18-alpine AS build

WORKDIR /app

# The current project doesn't have a package.json, so we create a minimal one.
# In a real project, you would copy your package.json and package-lock.json here.
RUN echo '{ "name": "nginx-config-ai-frontend", "version": "1.0.0", "private": true }' > package.json

# Copy the rest of the application source code
COPY . .

# In a typical React/Vite project, you would run 'npm install' and 'npm run build'.
# Since this project is pre-configured, we assume a build step would place files in a 'dist' folder.
# For this example, we'll simulate this by moving the relevant files.
RUN mkdir -p dist && \
    cp index.html index.tsx metadata.json types.ts services/geminiService.ts components/Icons.tsx App.tsx dist/

# Stage 2: Serve the application with Nginx
FROM nginx:1.25-alpine

# Copy the build output from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy a custom Nginx configuration to handle SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
