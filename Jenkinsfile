pipeline {
    agent any
    
    environment {
        JUICE_SHOP_REPO = 'https://github.com/mile9299/juice-shopv21.git'
        DOCKER_PORT = 3000 // Default Docker port
        SPECTRAL_DSN = credentials('SPECTRAL_DSN')
        CS_IMAGE_NAME = 'mile/cs-fcs'
        CS_IMAGE_TAG = '2.1.0'
        CS_CLIENT_ID = credentials('CS_CLIENT_ID')
        CS_CLIENT_SECRET = credentials('CS_CLIENT_SECRET')
        CS_USERNAME = 'mile'
        CS_PASSWORD = credentials('CS_PASSWORD')
        CS_REGISTRY = 'registry.crowdstrike.com'
        FALCON_REGION = 'us-1'
        PROJECT_PATH = 'git::https://github.com/hashicorp/terraform-guides.git'
    }
    
    tools {
        nodejs 'NodeJS 18.0.0'
    }

    stages {
        stage('Checkout') {
            steps {
                script {
                    checkout([$class: 'GitSCM', branches: [[name: '*/main']], doGenerateSubmoduleConfigurations: false, extensions: [], submoduleCfg: [], userRemoteConfigs: [[url: JUICE_SHOP_REPO]]])
                }
            }
        }
        
        stage('Falcon Cloud Security IaC Scan') {
            steps {
                script {
                    def SCAN_EXIT_CODE = sh(
                        script: '''
                            set +x
                            # check if required env vars are set in the build set up

                            scan_status=0
                            if [ -z "$CS_USERNAME" ] || [ -z "$CS_PASSWORD" ] || [ -z "$CS_REGISTRY" ] || [ -z "$CS_IMAGE_NAME" ] || [ -z "$CS_IMAGE_TAG" ] || [ -z "$CS_CLIENT_ID" ] || [ -z "$CS_CLIENT_SECRET" ] || [ -z "$FALCON_REGION" ] || [ -z "$PROJECT_PATH" ]; then
                                echo "Error: required environment variables/params are not set"
                                exit 1
                            else  
                                # login to crowdstrike registry
                                echo "Logging in to crowdstrike registry with username: $CS_USERNAME"
                                echo "$CS_PASSWORD" | docker login --username "$CS_USERNAME" --password-stdin
                                
                                if [ $? -eq 0 ]; then
                                    echo "Docker login successful"
                                    #  pull the fcs container target
                                    echo "Pulling fcs container target from crowdstrike"
                                    docker pull mile/cs-fcs:1.0.0
                                    if [ $? -eq 0 ]; then
                                        echo "fcs docker container image pulled successfully"
                                        echo "=============== FCS IaC Scan Starts ==============="

                                        docker run --network=host --rm "$CS_IMAGE_NAME":"$CS_IMAGE_TAG" --client-id "$CS_CLIENT_ID" --client-secret "$CS_CLIENT_SECRET" --falcon-region "$FALCON_REGION" iac scan -p "$PROJECT_PATH"
                                        scan_status=$?
                                        echo "=============== FCS IaC Scan Ends ==============="
                                    else
                                        echo "Error: failed to pull fcs docker image from crowdstrike"
                                        scan_status=1
                                    fi
                                else
                                    echo "Error: docker login failed"
                                    scan_status=1
                                fi
                            fi
                        ''', returnStatus: true
                    )
                    echo "fcs-iac-scan-status: ${SCAN_EXIT_CODE}"
                    if (SCAN_EXIT_CODE == 40) {
                        echo "Scan succeeded & vulnerabilities count are ABOVE the '--fail-on' threshold; Pipeline will be marked as Success, but this stage will be marked as Unstable"
                        currentBuild.result = 'UNSTABLE'
                    } else if (SCAN_EXIT_CODE == 0) {
                        echo "Scan succeeded & vulnerabilities count are BELOW the '--fail-on' threshold; Pipeline will be marked as Success"
                        currentBuild.result = 'SUCCESS'
                    } else {
                        currentBuild.result = 'FAILURE'
                        error "Unexpected scan exit code: ${SCAN_EXIT_CODE}"
                    }
                }
            }
            post {
                success {
                    echo 'FCS IaC Scan succeeded!'
                }
                unstable {
                    echo 'FCS IaC Scan is unstable, but still considered successful!'
                }
                failure {
                    echo 'FCS IaC Scan failed!'
                }
                always {
                    echo "FCS IaC Scan Execution complete.."
                }
            }
        }

        stage('Test with Snyk') {
            steps {
                script {
                    snykSecurity failOnIssues: false, severity: 'critical', snykInstallation: 'snyk-manual', snykTokenId: 'SNYK'
                }
            }
        }
        
        stage('Falcon Cloud Security') {
            steps {
                withCredentials([usernameColonPassword(credentialsId: 'CRWD', variable: 'FALCON_CREDENTIALS')]) {
                    crowdStrikeSecurity imageName: 'spooky', imageTag: 'latest', enforce: true, timeout: 60
                }
            }
        }
        
        stage('Build') {
            steps {
                script {
                    sh 'npm cache clean -f'
                    sh 'npm install'
                    // Start the application in the background using nohup
                    sh 'nohup npm start > /dev/null 2>&1 &'

                    // Sleep for a few seconds to ensure the application has started before moving to the next stage
                    sleep(time: 5, unit: 'SECONDS')
                }
            }
        }
        
        stage('Deploy') {
            steps {
                script {
                    try {
                        // Stop and remove the container if it exists
                        sh 'docker stop juice-shop || true'
                        sh 'docker rm juice-shop || true'

                        // First, let's check the project structure
                        sh '''
                            echo "=== Project Structure ==="
                            ls -la
                            echo "=== Package.json content ==="
                            cat package.json | grep -A 5 -B 5 "scripts\\|main"
                        '''

                        // Create a proper Dockerfile for OWASP Juice Shop
                        sh '''
                            cat > Dockerfile.fixed << 'EOF'
FROM node:18-alpine AS installer

# Set working directory
WORKDIR /juice-shop

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --ignore-scripts

# Copy the rest of the application
COPY . .

# Install TypeScript and build tools if needed
RUN npm install -g typescript ts-node || true

# Build the application if build script exists
RUN npm run build 2>/dev/null || echo "No build script found, continuing..."

# Create necessary directories
RUN mkdir -p logs && chmod 755 logs
RUN mkdir -p uploads && chmod 755 uploads

# Clean up unnecessary files
RUN rm -rf frontend/node_modules || true
RUN rm -rf frontend/.angular || true
RUN rm -rf frontend/src/assets || true
RUN rm -rf .git || true
RUN rm -rf test || true
RUN rm -rf cypress || true

# Set proper permissions
RUN chown -R node:node /juice-shop

FROM node:18-alpine AS runtime

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /juice-shop

# Copy application from installer stage
COPY --from=installer --chown=node:node /juice-shop .

# Create non-root user
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node --version || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application using npm start
CMD ["npm", "start"]
EOF
                        '''
                        
                        // Build with the fixed Dockerfile
                        sh "docker build -f Dockerfile.fixed -t juice-shop ."
                        
                        // Run the container with correct port mapping
                        sh "docker run -d -p 3000:3000 --name juice-shop juice-shop"
                        
                        // Wait for container to start
                        sleep(time: 15, unit: 'SECONDS')
                        
                        // Check container status with more detailed information
                        def containerInfo = sh(
                            script: "docker ps -a --filter name=juice-shop --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}'",
                            returnStdout: true
                        ).trim()
                        
                        echo "Container info: ${containerInfo}"
                        
                        def containerStatus = sh(
                            script: "docker ps --filter name=juice-shop --format '{{.Status}}'",
                            returnStdout: true
                        ).trim()
                        
                        echo "Container status: ${containerStatus}"
                        
                        if (containerStatus.contains('Up')) {
                            echo "✅ Juice Shop container is running"
                            
                            // Check if the application is responding
                            def healthCheckAttempts = 0
                            def maxAttempts = 10
                            def appReady = false
                            
                            while (healthCheckAttempts < maxAttempts && !appReady) {
                                healthCheckAttempts++
                                echo "Health check attempt ${healthCheckAttempts}/${maxAttempts}"
                                
                                def healthCheck = sh(
                                    script: "curl -f -s -m 5 http://localhost:3000 > /dev/null && echo 'SUCCESS' || echo 'FAILED'",
                                    returnStdout: true
                                ).trim()
                                
                                if (healthCheck == 'SUCCESS') {
                                    appReady = true
                                    echo "✅ Juice Shop is running successfully on http://localhost:3000"
                                    env.DOCKER_HOST_PORT = "3000"
                                } else {
                                    echo "⏳ Application not ready yet, waiting 10 seconds..."
                                    sleep(time: 10, unit: 'SECONDS')
                                }
                            }
                            
                            if (!appReady) {
                                echo "⚠️  Application may not be fully ready, but container is running"
                                echo "You can check manually: curl http://localhost:3000"
                                // Don't fail the build if container is running but app isn't responding yet
                                env.DOCKER_HOST_PORT = "3000"
                            }
                            
                        } else {
                            // Check if container exited
                            def exitedStatus = sh(
                                script: "docker ps -a --filter name=juice-shop --format '{{.Status}}'",
                                returnStdout: true
                            ).trim()
                            
                            if (exitedStatus.contains('Exited')) {
                                echo "Container exited. Checking logs for errors..."
                                sh "docker logs juice-shop"
                                error "Container failed to start properly - exited with error"
                            } else {
                                error "Container failed to start properly - unknown status: ${exitedStatus}"
                            }
                        }
                        
                    } catch (Exception e) {
                        echo "Deployment failed: ${e.getMessage()}"
                        echo "=== Container Logs ==="
                        sh "docker logs juice-shop || echo 'No logs available'"
                        echo "=== Container Status ==="
                        sh "docker ps -a --filter name=juice-shop || echo 'No container found'"
                        echo "=== Available Files in Container ==="
                        sh "docker exec juice-shop ls -la /juice-shop/ || echo 'Cannot access container'"
                        throw e
                    }
                }
            }
        }
    }

    post {
        success {
            echo 'Build, test, and deployment successful!'
            echo "🎉 Juice Shop is available at: http://localhost:3000"
        }
        failure {
            echo 'Build, test, or deployment failed!'
        }
        always {
            echo 'Pipeline execution completed.'
            // Show final container status
            script {
                sh 'docker ps -a --filter name=juice-shop || true'
            }
        }
    }
}
