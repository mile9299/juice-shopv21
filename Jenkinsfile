\pipeline {
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
                    def nodejsTool = tool name: "NodeJS ${NODEJS_VERSION}", type: 'jenkins.plugins.nodejs.tools.NodeJSInstallation'
                    env.PATH = "${nodejsTool}/bin:${env.PATH}"
                }
            }
        }

        stage('Checkout') {
            steps {
                script {
                    // Checkout the Juice Shop repository
                    checkout([$class: 'GitSCM', branches: [[name: '*/master']], doGenerateSubmoduleConfigurations: false, extensions: [], submoduleCfg: 
