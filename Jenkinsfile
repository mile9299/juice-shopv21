pipeline {
    agent any
    
    environment {
        JUICE_SHOP_REPO = 'https://github.com/mile9299/juice-shopv21.git'
        DOCKER_PORT = 3000 // Default Docker port
        SPECTRAL_DSN = credentials('SPECTRAL_DSN')
        CS_IMAGE_NAME = 'mile/cs-fcs'
        CS_IMAGE_TAG = '0.42.0'
        CS_CLIENT_ID = credentials('CS_CLIENT_ID')
        CS_CLIENT_SECRET = credentials('CS_CLIENT_SECRET')
        CS_USERNAME = 'mile'
        CS_PASSWORD = credentials('CS_PASSWORD')
        FALCON_REGION = 'us-1'
        PROJECT_PATH = 'git::https://github.com/hashicorp/terraform-guides.git'
    }
    // Added
    tools {
        nodejs 'NodeJS 18.0.0'
    }
// Added
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
                            docker pull mile/cs-fcs:0.42.0
                            if [ $? -eq 0 ]; then
                                echo "fcs docker container image pulled successfully"
                                echo "=============== FCS IaC Scan Starts ==============="

docker run --network=host --rm "$CS_IMAGE_NAME":"$CS_IMAGE_TAG" --client-id "$CS_CLIENT_ID" --client-secret "$CS_CLIENT_SECRET" --falcon-region "$FALCON_REGION" iac scan -p "$PROJECT_PATH" --fail-on "high=10,medium=70,low=50,info=10"
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
                    skipPublishingChecks: false
                    currentBuild.result = 'UNSTABLE'
                } else if (SCAN_EXIT_CODE == 0) {
                    echo "Scan succeeded & vulnerabilities count are BELOW the '--fail-on' threshold; Pipeline will be marked as Success"
                    skipPublishingChecks: false
                    skipMarkingBuildUnstable: false
                    currentBuild.result = 'Success'
                } else {
                    currentBuild.result = 'Failure'
                    error 'Unexpected scan exit code: ${SCAN_EXIT_CODE}'
                }
                
        }
    }
    post {
        success {
            echo 'Build succeeded!'
        }
        unstable {
            echo 'Build is unstable, but still considered successful!'
        }
        failure {
            echo 'Build failed!'
        }
        always {
            echo "FCS IaC Scan Execution complete.."
        }
    }
}


       stage('Test with Snyk') {
            steps {
                dir('build') {
                    script {
                        snykSecurity failOnIssues: false, severity: 'critical', snykInstallation: 'snyk-manual', snykTokenId: 'SNYK'
                    }
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
                    // Stop and remove the container if it exists
                    sh 'docker stop juice-shop || true'
                    sh 'docker rm juice-shop || true'

                    // Build and run the Docker container with a dynamically allocated port
                    sh "docker build -t juice-shop ."
                    sh "DOCKER_PORT=\$(docker run -d -P --name juice-shop juice-shop)"
                    sh "DOCKER_HOST_PORT=\$(docker port $DOCKER_PORT 3000 | cut -d ':' -f 2)"

                    echo "Juice Shop is running on http://localhost:\$DOCKER_HOST_PORT"
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
    }
}
