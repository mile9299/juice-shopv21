pipeline {
    agent any
    
    environment {
        JUICE_SHOP_REPO = 'https://github.com/mile9299/juice-shopv21.git'
        DOCKER_PORT = 3000
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
                            scan_status=0
                            if [ -z "$CS_USERNAME" ] || [ -z "$CS_PASSWORD" ] || [ -z "$CS_REGISTRY" ] || [ -z "$CS_IMAGE_NAME" ] || [ -z "$CS_IMAGE_TAG" ] || [ -z "$CS_CLIENT_ID" ] || [ -z "$CS_CLIENT_SECRET" ] || [ -z "$FALCON_REGION" ] || [ -z "$PROJECT_PATH" ]; then
                                echo "Error: required environment variables/params are not set"
                                exit 1
                            else  
                                echo "Logging in to crowdstrike registry with username: $CS_USERNAME"
                                echo "$CS_PASSWORD" | docker login --username "$CS_USERNAME" --password-stdin
                                
                                if [ $? -eq 0 ]; then
                                    echo "Docker login successful"
                                    echo "Pulling fcs container target from crowdstrike"
                                    docker pull "$CS_IMAGE_NAME:$CS_IMAGE_TAG"
                                    if [ $? -eq 0 ]; then
                                        echo "fcs docker container image pulled successfully"
                                        echo "=============== FCS IaC Scan Starts ==============="

                                        docker run --network=host --rm "$CS_IMAGE_NAME:$CS_IMAGE_TAG" --client-id "$CS_CLIENT_ID" --client-secret "$CS_CLIENT_SECRET" --falcon-region "$FALCON_REGION" iac scan -p "$PROJECT_PATH"
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
                            exit $scan_status
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
        
        stage('Build Docker Image') {
            steps {
                script {
                    echo 'Building Juice Shop Docker image'
                    
                    // Check project structure
                    sh '''
                        echo "=== Project Structure ==="
                        ls -la
                        echo "=== Package.json scripts ==="
                        cat package.json | grep -A 10 '"scripts"' || echo "No scripts section found"
                    '''
                    
                    // Create optimized Dockerfile
                    sh '''
                        cat > Dockerfile << 'EOF'
FROM node:18-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /juice-shop

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --ignore-scripts

# Copy the rest of the application
COPY . .

# Create necessary directories and set permissions
RUN mkdir -p logs uploads && \
    chown -R node:node /juice-shop

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Use dumb-init and start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
EOF
                    '''
                    
                    // Build the image
                    sh 'docker build -t juice-shop:latest .'
                    
                    echo 'Docker image built successfully'
                }
            }
        }
        
        stage('Falcon Cloud Security Image Scan') {
            steps {
                withCredentials([usernameColonPassword(credentialsId: 'CRWD', variable: 'FALCON_CREDENTIALS')]) {
                    crowdStrikeSecurity imageName: 'juice-shop', imageTag: 'latest', enforce: false, timeout: 60
                }
            }
        }
        
        stage('Deploy') {
            steps {
                script {
                    try {
                        echo 'Deploying Juice Shop container'
                        
                        // Clean up any existing containers
                        sh 'docker rm -f juice-shop || true'
                        
                        // Start the container
                        sh 'docker run -d -p 3000:3000 --name juice-shop juice-shop:latest'
                        
                        // Wait for container to start
                        echo 'Waiting for container to start...'
                        sleep(time: 15, unit: 'SECONDS')
                        
                        // Check container status
                        def containerStatus = sh(
                            script: 'docker ps --filter name=juice-shop --format "{{.Status}}"',
                            returnStdout: true
                        ).trim()
                        
                        echo "Container status: ${containerStatus}"
                        
                        if (containerStatus.contains('Up')) {
                            echo "✅ Juice Shop container is running"
                            
                            // Health check with retries
                            def healthCheckAttempts = 0
                            def maxAttempts = 12
                            def appReady = false
                            
                            while (healthCheckAttempts < maxAttempts && !appReady) {
                                healthCheckAttempts++
                                echo "Health check attempt ${healthCheckAttempts}/${maxAttempts}"
                                
                                def healthCheck = sh(
                                    script: 'curl -f -s -m 10 http://localhost:3000 > /dev/null && echo "SUCCESS" || echo "FAILED"',
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
                                echo "⚠️ Application health check failed, but container is running"
                                echo "Container logs:"
                                sh 'docker logs --tail 20 juice-shop'
                                // Don't fail the build, just warn
                                env.DOCKER_HOST_PORT = "3000"
                            }
                            
                        } else {
                            // Container is not running, check why
                            def exitedStatus = sh(
                                script: 'docker ps -a --filter name=juice-shop --format "{{.Status}}"',
                                returnStdout: true
                            ).trim()
                            
                            echo "Container failed to start. Status: ${exitedStatus}"
                            sh 'docker logs juice-shop'
                            error "Container failed to start properly"
                        }
                        
                    } catch (Exception e) {
                        echo "Deployment failed: ${e.getMessage()}"
                        echo "=== Container Logs ==="
                        sh 'docker logs juice-shop 2>/dev/null || echo "No logs available"'
                        echo "=== Container Status ==="
                        sh 'docker ps -a --filter name=juice-shop'
                        throw e
                    }
                }
            }
        }
    }

    post {
        always {
            echo 'Pipeline execution completed.'
            script {
                // Show final container status
                sh 'docker ps -a --filter name=juice-shop || true'
                
                // Clean up any dangling images
                sh 'docker image prune -f || true'
            }
        }
        success {
            echo 'Build, test, and deployment successful!'
            echo "🎉 Juice Shop is available at: http://localhost:3000"
            script {
                // Show container info
                sh '''
                    echo "=== Final Container Status ==="
                    docker ps --filter name=juice-shop --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"
                '''
            }
        }
        failure {
            echo 'Build, test, or deployment failed!'
            script {
                // Enhanced debugging for failures
                sh '''
                    echo "=== Debug Information ==="
                    docker ps -a --filter name=juice-shop || true
                    echo "=== Container Logs (last 50 lines) ==="
                    docker logs --tail 50 juice-shop 2>/dev/null || echo "No container logs available"
                    echo "=== Available Images ==="
                    docker images | grep juice-shop || echo "No juice-shop images found"
                '''
            }
        }
        unstable {
            echo 'Pipeline completed with warnings (unstable)!'
        }
        cleanup {
            script {
                // Optional: Clean up containers after pipeline (uncomment if needed)
                // sh 'docker rm -f juice-shop || true'
                echo 'Cleanup completed'
            }
        }
    }
}
