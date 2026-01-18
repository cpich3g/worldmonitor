provider "azurerm" {
  features {}

  # OIDC authentication via environment variables:
  # ARM_CLIENT_ID, ARM_SUBSCRIPTION_ID, ARM_TENANT_ID, ARM_USE_OIDC=true
}
