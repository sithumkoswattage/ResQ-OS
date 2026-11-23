// Pipeline 1: build the backend and frontend images and push them to Docker Hub.
// Jenkins credential needed: "dockerhub-creds" (Username with password; use a Docker Hub access token).
pipeline {
  agent any
  parameters {
    string(name: 'DOCKERHUB_USER', defaultValue: '', description: 'Your Docker Hub username')
  }
  environment {
    TAG = "${env.BUILD_NUMBER}"
  }
  stages {
    stage('Checkout') {
      steps { checkout scm }
    }
    stage('Build images') {
      steps {
        sh '''
          test -n "$DOCKERHUB_USER" || { echo "Set DOCKERHUB_USER"; exit 1; }
          docker build -t $DOCKERHUB_USER/resqos-backend:$TAG  -t $DOCKERHUB_USER/resqos-backend:latest  backend
          docker build -t $DOCKERHUB_USER/resqos-frontend:$TAG -t $DOCKERHUB_USER/resqos-frontend:latest frontend
        '''
      }
    }
    stage('Push to Docker Hub') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-creds', usernameVariable: 'HUB_USER', passwordVariable: 'HUB_TOKEN')]) {
          sh '''
            echo "$HUB_TOKEN" | docker login -u "$HUB_USER" --password-stdin
            for img in resqos-backend resqos-frontend; do
              docker push $DOCKERHUB_USER/$img:$TAG
              docker push $DOCKERHUB_USER/$img:latest
            done
          '''
        }
      }
    }
  }
  post {
    always { sh 'docker logout || true' }
    success { echo "Pushed tag ${env.TAG} (and latest)" }
  }
}
