output "public_ip" {
  value = azurerm_public_ip.ip.ip_address
}

output "fqdn" {
  value = azurerm_public_ip.ip.fqdn
}

output "admin_username" {
  value = var.admin_username
}

output "ssh_private_key" {
  value     = tls_private_key.ssh.private_key_pem
  sensitive = true
}
