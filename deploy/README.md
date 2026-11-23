# ResQ-OS CD pipeline (Jenkins + Docker Hub + Terraform + Ansible + Azure)

```
Pipeline 1 (jenkins/images.Jenkinsfile): build backend + frontend images -> push to Docker Hub
Pipeline 2 (jenkins/deploy.Jenkinsfile): Terraform creates the Azure VM -> Ansible installs Docker and runs the stack
```
Result: the app at `http://resqos-xxxxx.<region>.cloudapp.azure.com` (port 80, MongoDB on the same VM).

## 1. Free accounts (one-time)
1. **Docker Hub**: sign up at hub.docker.com. Account Settings > Personal access tokens > create one (read/write).
2. **Azure**: sign up at azure.microsoft.com/free/students with your university email. No card, about $100 credit. (No student offer? The normal free account gives a B1s VM free for 12 months but asks for a card.)
3. **Service principal** (lets Jenkins act on Azure). In the Azure portal open Cloud Shell (Bash) and run:
   ```bash
   az ad sp create-for-rbac --name resqos-jenkins --role Contributor \
     --scopes /subscriptions/$(az account show --query id -o tsv)
   ```
   Note `appId` (client id), `password` (client secret), `tenant`, plus your subscription id (`az account show --query id -o tsv`).
   If the student tenant blocks this, run the Terraform/Ansible steps by hand after `az login` (see section 5).

## 2. Start Jenkins
```bash
docker compose -f jenkins/docker-compose.yml up -d --build
docker compose -f jenkins/docker-compose.yml logs jenkins | grep -A2 password   # first-run unlock code
```
Open http://localhost:8080, install suggested plugins.

## 3. Add credentials (Manage Jenkins > Credentials > Global)
| ID | Kind | Value |
|---|---|---|
| `dockerhub-creds` | Username with password | Docker Hub user + access token |
| `azure-client-id` | Secret text | appId |
| `azure-client-secret` | Secret text | password |
| `azure-tenant-id` | Secret text | tenant |
| `azure-subscription-id` | Secret text | subscription id |
| `resqos-jwt-secret` | Secret text | output of `openssl rand -hex 32` |

## 4. Create the two pipelines
New Item > Pipeline > "Pipeline script from SCM" > Git > this repo, branch `main`:
- `resqos-images`, script path `jenkins/images.Jenkinsfile`
- `resqos-deploy`, script path `jenkins/deploy.Jenkinsfile`

Run `resqos-images` first (set `DOCKERHUB_USER`), then `resqos-deploy` (same `DOCKERHUB_USER`, `ACTION=apply`). The last stage prints the live URL.

Create the first admin (once):
```bash
ssh -i key.pem azureuser@<ip>      # key: `terraform output -raw ssh_private_key` in deploy/terraform
cd /opt/resqos && sudo docker compose exec backend node createAdmin.js
```

## 5. Manual run (no Jenkins)
```bash
az login
cd deploy/terraform && terraform init && terraform apply
terraform output -raw ssh_private_key > ../ansible/key.pem && chmod 600 ../ansible/key.pem
cd ../ansible
printf "[resqos]\n$(cd ../terraform && terraform output -raw public_ip) ansible_user=azureuser ansible_ssh_private_key_file=key.pem\n" > inventory.ini
ansible-playbook -i inventory.ini playbook.yml -e dockerhub_user=YOU -e image_tag=latest \
  -e jwt_secret=$(openssl rand -hex 32) -e public_url=http://$(cd ../terraform && terraform output -raw fqdn)
```

## Notes
- Terraform state lives in the Jenkins workspace (`jenkins_home` volume). Keep that volume, or `destroy` won't find the resources.
- If apply says the VM size or region is unavailable, change `location` / `vm_size` in `deploy/terraform/variables.tf`.
- Run the deploy pipeline with `ACTION=destroy` when you're done so credit isn't used.
