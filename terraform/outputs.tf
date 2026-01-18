output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "acr_name" {
  description = "Name of the Azure Container Registry"
  value       = azurerm_container_registry.main.name
}

output "acr_login_server" {
  description = "Login server for the ACR"
  value       = azurerm_container_registry.main.login_server
}

output "container_app_name" {
  description = "Name of the Container App"
  value       = azurerm_container_app.main.name
}

output "container_app_url" {
  description = "URL of the Container App"
  value       = "https://${azurerm_container_app.main.ingress[0].fqdn}"
}

output "container_app_environment_name" {
  description = "Name of the Container App Environment"
  value       = azurerm_container_app_environment.main.name
}

output "managed_identity_client_id" {
  description = "Client ID of the managed identity"
  value       = azurerm_user_assigned_identity.container_app.client_id
}
