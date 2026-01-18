variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
  default     = "rg-worldmeters-demo"
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "swedencentral"
}

variable "prefix" {
  description = "Prefix for all resource names"
  type        = string
  default     = "wm"
}

variable "container_image" {
  description = "Container image to deploy (without registry prefix)"
  type        = string
  default     = "worldmonitor:latest"
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Environment = "Demo"
    ManagedBy   = "Terraform"
    Project     = "WorldMonitor"
  }
}
