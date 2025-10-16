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
                            if [[ -z "$CS_USERNAME" || -z "$CS_PASSWORD" || -z "$CS_REGISTRY" || -z "$CS_IMAGE_NAME" || -z "$CS_IMAGE_TAG" || -z "$CS_CLIENT_ID" || -z "$CS_CLIENT_SECRET" || -z "$FALCON_REGION" || -z "$PROJECT_PATH" ]]; then
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

                        // Build the Docker image
                        sh "docker build -t juice-shop ."
                        
                        // Run the container with explicit port mapping
                        sh "docker run -d -p 3000:3000 --name juice-shop juice-shop"
                        
                        // Wait a moment for container to start
                        sleep(time: 5, unit: 'SECONDS')
                        
                        // Verify container is running
                        def containerStatus = sh(
                            script: "docker ps --filter name=juice-shop --format '{{.Status}}'",
                            returnStdout: true
                        ).trim()
                        
                        if (containerStatus.contains('Up')) {
                            echo "Juice Shop is running on http://localhost:3000"
                            env.DOCKER_HOST_PORT = "3000"
                            
                            // Optional: Test if the application is responding
                            sh "sleep 10" // Give app time to fully start
                            def healthCheck = sh(
                                script: "curl -f http://localhost:3000 || echo 'Health check failed'",
                                returnStdout: true
                            ).trim()
                            
                            if (healthCheck.contains('Health check failed')) {
                                echo "Warning: Application may not be fully ready yet"
                            } else {
                                echo "Application is responding successfully"
                            }
                        } else {
                            error "Container failed to start properly"
                        }
                    } catch (Exception e) {
                        echo "Deployment failed: ${e.getMessage()}"
                        // Show container logs for debugging
                        sh "docker logs juice-shop || echo 'No logs available'"
                        throw e
                    }
                }
            }
        }
    }

    post {
        success {
            echo 'Build, test, and deployment successful!'
        }
        failure {
            echo 'Build, test, or deployment failed!'
        }
        always {
            echo 'Pipeline execution completed.'
        }
    }
}
