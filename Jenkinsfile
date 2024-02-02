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
                    snykSecurity failOnIssues: false, severity: 'critical', snykInstallation: 'snyk-manual', snykTokenId: 'SNYK'
                }
            }
        }
        stage('Build') {
            steps {
                script {
                    sh 'npm cache clean -f'
                    sh 'npm install'
                    sh 'npm start &'
                    sh 'disown'
                }
            }
        }
        stage('Deploy') {
            steps {
                script {
                    sh 'docker stop juice-shop || true' // Stop and remove the container if it exists
                    sh 'docker rm juice-shop || true'
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
