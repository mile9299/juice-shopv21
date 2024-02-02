pipeline {
    agent any
    
    environment {
        JUICE_SHOP_REPO = 'https://github.com/mile9299/juice-shopv21.git'
    }
    
    stages {
        stage('Install Node.js') {
            steps {
                script {
                    def nodejsTool = tool name: "NodeJS", type: 'jenkins.plugins.nodejs.tools.NodeJSInstallation'
                    env.PATH = "${nodejsTool}/bin:${env.PATH}"
                }
            }
        }

        stage('Checkout') {
            steps {
                script {
                    checkout([$class: 'GitSCM', branches: [[name: '*/master']], doGenerateSubmoduleConfigurations: false, extensions: [], submoduleCfg: [], userRemoteConfigs: [[url: JUICE_SHOP_REPO]]])
                }
            }
        }

        stage('Build') {
            steps {
                script {
                    sh 'npm cache clean -f'
                    sh 'npm install --legacy-peer-deps'
                    sh 'npm run build'
                }
            }
        }

        stage('Test with Snyk') {
            steps {
                snykSecurity failOnError: false, snykInstallation: 'snyk@latest', snykTokenId: 'SNYK'
            }
        }

        stage('Deploy') {
            steps {
                script {
                    sh 'docker build -t juice-shop .'
                    sh 'docker run -p 3000:3000 -d juice-shop'
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
