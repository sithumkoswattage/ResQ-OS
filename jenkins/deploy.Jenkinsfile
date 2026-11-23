// Pipeline 2: create the Azure infrastructure with Terraform, then deploy with Ansible.
// Jenkins credentials needed (all "Secret text"):
//   azure-client-id, azure-client-secret, azure-tenant-id, azure-subscription-id, resqos-jwt-secret
pipeline {
  agent any
  parameters {
    string(name: 'DOCKERHUB_USER', defaultValue: '', description: 'Your Docker Hub username')
    string(name: 'IMAGE_TAG', defaultValue: 'latest', description: 'Image tag to deploy')
    choice(name: 'ACTION', choices: ['apply', 'destroy'], description: 'destroy removes everything in Azure')
  }
  environment {
    ARM_CLIENT_ID       = credentials('azure-client-id')
    ARM_CLIENT_SECRET   = credentials('azure-client-secret')
    ARM_TENANT_ID       = credentials('azure-tenant-id')
    ARM_SUBSCRIPTION_ID = credentials('azure-subscription-id')
    TF_IN_AUTOMATION    = 'true'
  }
  stages {
    stage('Checkout') {
      steps { checkout scm }
    }
    stage('Terraform init') {
      steps { dir('deploy/terraform') { sh 'terraform init -input=false' } }
    }
    stage('Terraform destroy') {
      when { expression { params.ACTION == 'destroy' } }
      steps { dir('deploy/terraform') { sh 'terraform destroy -input=false -auto-approve' } }
    }
    stage('Terraform apply') {
      when { expression { params.ACTION == 'apply' } }
      steps {
        dir('deploy/terraform') {
          sh 'terraform validate && terraform apply -input=false -auto-approve'
        }
      }
    }
    stage('Deploy with Ansible') {
      when { expression { params.ACTION == 'apply' } }
      steps {
        withCredentials([string(credentialsId: 'resqos-jwt-secret', variable: 'JWT_SECRET')]) {
          sh '''
            test -n "$DOCKERHUB_USER" || { echo "Set DOCKERHUB_USER"; exit 1; }
            cd deploy/terraform
            IP=$(terraform output -raw public_ip)
            FQDN=$(terraform output -raw fqdn)
            USER=$(terraform output -raw admin_username)
            umask 077
            terraform output -raw ssh_private_key > ../ansible/key.pem
            cd ../ansible
            printf "[resqos]\\n%s ansible_user=%s ansible_ssh_private_key_file=key.pem\\n" "$IP" "$USER" > inventory.ini
            ansible-playbook -i inventory.ini playbook.yml \
              -e dockerhub_user="$DOCKERHUB_USER" \
              -e image_tag="$IMAGE_TAG" \
              -e jwt_secret="$JWT_SECRET" \
              -e public_url="http://$FQDN"
            echo "http://$FQDN" > ../../deployed_url.txt
          '''
        }
      }
    }
    stage('Smoke test') {
      when { expression { params.ACTION == 'apply' } }
      steps {
        sh 'curl -fsS "$(cat deployed_url.txt)/api/health"'
        echo "Live at: ${readFile('deployed_url.txt').trim()}"
      }
    }
  }
  post {
    always { sh 'rm -f deploy/ansible/key.pem deploy/ansible/inventory.ini' }
  }
}
