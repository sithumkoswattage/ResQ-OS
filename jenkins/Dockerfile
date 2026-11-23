# Jenkins with the tools the pipelines need: Docker CLI, Terraform, Ansible.
FROM jenkins/jenkins:lts-jdk17
USER root
RUN apt-get update \
 && apt-get install -y --no-install-recommends ansible unzip curl openssh-client \
 && rm -rf /var/lib/apt/lists/*
ARG DOCKER_VERSION=27.3.1
ARG TERRAFORM_VERSION=1.9.8
RUN curl -fsSL https://download.docker.com/linux/static/stable/x86_64/docker-${DOCKER_VERSION}.tgz \
    | tar -xz -C /usr/local/bin --strip-components=1 docker/docker \
 && curl -fsSL -o /tmp/tf.zip https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip \
 && unzip /tmp/tf.zip -d /usr/local/bin && rm /tmp/tf.zip
# Runs as root so it can use the host Docker socket (fine for a coursework demo box).
