variable "location" {
  description = "Azure region. Student subscriptions are often limited to a few regions; change this if apply is rejected."
  type        = string
  default     = "southeastasia"
}

variable "vm_size" {
  description = "B1s is in the 12-month free tier; B2s is roomier and uses student credit."
  type        = string
  default     = "Standard_B1s"
}

variable "admin_username" {
  type    = string
  default = "azureuser"
}

variable "name_prefix" {
  type    = string
  default = "resqos"
}
