# Nginx Config AI Assistant

An AI-powered web application to help you generate Nginx load balancer configurations. Define your upstreams and VIPs, and let the AI generate a secure and optimized configuration file for you.

## CI/CD Deployment with Jenkins and Kubernetes

This guide outlines the process of setting up a continuous integration and continuous deployment (CI/CD) pipeline using Jenkins to automatically build, test, and deploy the application to a Kubernetes cluster.

### Prerequisites

*   A running Kubernetes cluster.
*   `kubectl` configured to connect to your cluster.
*   A running Jenkins instance with the following plugins installed:
    *   Docker Pipeline
    *   Kubernetes CLI (kubectl)
    *   Credentials Binding
*   A Docker registry (like Docker Hub, GCR, or a private registry) where Jenkins can push built images.
*   Jenkins credentials configured for:
    *   Your Git repository.
    *   Your Docker registry (this guide will use a credentials ID of `DOCKER_HUB_CREDENTIALS_ID`).
    *   Your Kubernetes configuration file (this guide will use a credentials ID of `KUBECONFIG_CREDENTIALS_ID`).

### CI/CD Workflow Overview

1.  **Commit & Push:** A developer pushes code changes to the Git repository.
2.  **Jenkins Trigger:** Jenkins detects the new push and starts the pipeline defined in the `Jenkinsfile`.
3.  **Build:** Jenkins checks out the code and uses a temporary Node.js container to build the static frontend assets.
4.  **Dockerize:** Jenkins builds a Docker image containing the built assets, served by a lightweight Nginx server, based on the `Dockerfile`.
5.  **Push:** The newly built Docker image is tagged and pushed to your specified Docker registry.
6.  **Deploy:** Jenkins uses `kubectl` to apply the Kubernetes manifest files, updating the running application with the new image.

---

### 1. Dockerfile

This is a multi-stage Dockerfile. The first stage (`build`) uses Node.js to build the static React application. The second, final stage copies these static files into a lean Nginx image for serving.

You will need to create a file named `Dockerfile` in the root of your project with the following content:

```dockerfile
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
COPY nginx.conf.txt /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
```

### 2. Nginx Configuration (`nginx.conf.txt`)

This configuration ensures that requests to any path are served by `index.html`, which is standard for single-page applications (SPAs).

Create a file named `nginx.conf.txt` in the root of your project with the following content:

```nginx
server {
  listen 80;
  server_name localhost;

  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

### 3. Kubernetes Manifests

Create a directory named `k8s` in your project root and add the following files. These manifests define the desired state of your application in Kubernetes.

#### `k8s/deployment.yaml`

This file defines how to run your application on the cluster. It creates a Deployment that manages a set of replica Pods. **Remember to replace `your-docker-registry/nginx-config-ai`** with your actual image name.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-config-ai-deployment
  labels:
    app: nginx-config-ai
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx-config-ai
  template:
    metadata:
      labels:
        app: nginx-config-ai
    spec:
      containers:
      - name: nginx-config-ai
        image: your-docker-registry/nginx-config-ai:latest # This will be updated by Jenkins
        ports:
        - containerPort: 80
```

#### `k8s/service.yaml`

This file creates a stable network endpoint (a Service) to access the application Pods from within the cluster.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-config-ai-service
spec:
  selector:
    app: nginx-config-ai
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: ClusterIP
```

#### `k8s/ingress.yaml`

This file manages external access to the services in the cluster. It provides load balancing, SSL termination, and name-based virtual hosting. You will need an Ingress controller (like Nginx Ingress or Traefik) running in your cluster for this to work.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nginx-config-ai-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: nginx-ai.your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nginx-config-ai-service
            port:
              number: 80
```

---

### 4. Jenkinsfile

This declarative pipeline script automates the entire CI/CD process. Place this file named `Jenkinsfile` in the root of your project.

```groovy
pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = "your-docker-registry" // e.g., "docker.io/yourusername"
        DOCKER_IMAGE_NAME = "nginx-config-ai"
        DOCKER_CREDENTIALS_ID = "your-docker-hub-credentials-id" // The ID of your Docker Hub credentials in Jenkins
        KUBECONFIG_CREDENTIALS_ID = "your-kubeconfig-credentials-id" // The ID of your kubeconfig file credentials in Jenkins
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out source code...'
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    echo "Building Docker image: ${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${env.BUILD_NUMBER}"
                    def customImage = docker.build("${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${env.BUILD_NUMBER}", ".")
                    
                    echo "Pushing Docker image to ${DOCKER_REGISTRY}..."
                    docker.withRegistry("https://${DOCKER_REGISTRY}", DOCKER_CREDENTIALS_ID) {
                        customImage.push()
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                script {
                    echo 'Deploying to Kubernetes cluster...'
                    withCredentials([file(credentialsId: KUBECONFIG_CREDENTIALS_ID, variable: 'KUBECONFIG_FILE')]) {
                        // Set KUBECONFIG env variable for this block to use the correct cluster credentials
                        env.KUBECONFIG = KUBECONFIG_FILE
                        
                        // Update the deployment image with the new tag
                        sh "kubectl set image deployment/nginx-config-ai-deployment nginx-config-ai=${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${env.BUILD_NUMBER}"
                        
                        // Verify the rollout status to ensure the update was successful
                        sh "kubectl rollout status deployment/nginx-config-ai-deployment"
                        
                        echo 'Deployment successful!'
                    }
                }
            }
        }
    }

    post {
        always {
            echo 'Pipeline finished.'
            // You can add cleanup steps or notifications here
        }
    }
}
```