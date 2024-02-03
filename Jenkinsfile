pipeline {
    agent any
    
    environment {
        JUICE_SHOP_REPO = 'https://github.com/bkimminich/juice-shop.git'
        DOCKER_PORT = 3000 // Default Docker port
    }
    
    tools {
        nodejs 'NodeJS'
    }
    
    stages {
        stage('Checkout') {
            steps {
                script {
                    checkout([$class: 'GitSCM', branches: [[name: '*/master']], doGenerateSubmoduleConfigurations: false, extensions: [], submoduleCfg: [], userRemoteConfigs: [[url: JUICE_SHOP_REPO]]])
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
                    sh "DOCKER_PORT=$(docker run -d -P --name juice-shop juice-shop)"
                    sh "DOCKER_HOST_PORT=$(docker port $DOCKER_PORT 3000 | cut -d ':' -f 2)"

                    echo "Juice Shop is running on http://localhost:$DOCKER_HOST_PORT"
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
