pipeline {
    agent any
    
    environment {
        JUICE_SHOP_REPO = 'https://github.com/bkimminich/juice-shop.git'
        NODEJS_VERSION = '21.6.1' // Adjust the Node.js version as needed
    }
    
    stages {
        stage('Install Node.js') {
            steps {
                script {
                    def nodejsTool = tool name: "NodeJS", type: 'jenkins.plugins.nodejs.tools.NodeJSInstallation'
                    if (nodejsTool) {
                        env.PATH = "${nodejsTool}/bin:${env.PATH}"
                    } else {
                        error "NodeJS ${NODEJS_VERSION} not found. Please configure it in Jenkins Global Tool Configuration."
                    }
                }
            }
        }

        stage('Checkout') {
            steps {
                script {
                    // Checkout the Juice Shop repository
                    checkout([$class: 'GitSCM', branches: [[name: '*/master']], doGenerateSubmoduleConfigurations: false, extensions: [], submoduleCfg: [], userRemoteConfigs: [[url: JUICE_SHOP_REPO]]])
                }
            }
        }

        stage('Build') {
            steps {
                script {
                    // Assuming your build process, for example, using npm
                    sh 'npm cache clean -f'
                    sh 'npm install'
                    sh 'npm start'
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
