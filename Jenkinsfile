pipeline {
    agent any
    
    environment {
        JUICE_SHOP_REPO = 'https://github.com/bkimminich/juice-shop.git'
        NODEJS_VERSION = '14' // Adjust the Node.js version as needed
    }
    
    stages {
        stage('Install Node.js') {
            steps {
                script {
                    // Install Node.js
                    def nodejsTool = tool name: "NodeJS ${NODEJS_VERSION}", type: 'jenkins.plugins.nodejs.tools.NodeJSInstal
lation'
                    env.PATH = "${nodejsTool}/bin:${env.PATH}"
                }
            }
        }

        stage('Checkout') {
            steps {
                script {
                    // Checkout the Juice Shop repository
                    checkout([$class: 'GitSCM', branches: [[name: '*/master']], doGenerateSubmoduleConfigurations: false, ex
tensions: [], submoduleCfg: [], userRemoteConfigs: [[url: JUICE_SHOP_REPO]]])
                }
            }
        }

        stage('Build') {
            steps {
                script {
                    // Assuming your build process, for example, using npm
                    sh 'npm install'
                    sh 'npm run build'
                }
            }
        }

        stage('Test with Snyk') {
            steps steps {
        snykSecurity failOnError: false, snykInstallation: 'snyk@latest', snykTokenId: 'SNYK'
            }
        }
    }

        stage('Deploy') {
            steps {
                script {
                    // Assuming your deployment process, for example, using Docker
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
