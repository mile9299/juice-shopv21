pipeline {
    agent any
    
    environment {
        JUICE_SHOP_REPO = 'https://github.com/bkimminich/juice-shop.git'
    }
    
    tools {
        nodejs 'NodeJS' // Assuming 'NodeJS' is the name of the NodeJS tool installation
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
                    // Your Snyk testing steps here
                }
            }
        }
        stage('Build') {
            steps {
                script {
                    sh 'npm cache clean -f'
                    sh 'npm install'
                    sh 'nohup npm start > /dev/null 2>&1 &'
            // Sleep to ensure the application has started
                    sleep(10)
                }
            }
        }
        stage('Deploy') {
            steps {
                script {
                    // Stop and remove the container if it exists
                    sh 'docker stop juice-shop || true'
                    sh 'docker rm juice-shop || true'

                    // Build and run the Docker container
                    sh 'docker build -t juice-shop .'
                    sh 'docker run -p 3000:3000 -d --name juice-shop juice-shop'
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
