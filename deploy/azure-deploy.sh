#!/bin/bash
# Azure Container Apps Deployment Script for World Monitor
# 
# Prerequisites:
# - Azure CLI installed and logged in (az login)
# - Docker installed and running
# - An existing Azure Container Registry
#
# Usage: ./deploy/azure-deploy.sh
#
# Environment variables (set before running):
# - AZURE_SUBSCRIPTION_ID: Your Azure subscription ID
# - AZURE_RESOURCE_GROUP: Resource group for Container Apps
# - AZURE_LOCATION: Azure region (e.g., eastus, westeurope)
# - ACR_NAME: Azure Container Registry name
# - CONTAINER_APP_NAME: Name for the Container App
# - CONTAINER_APP_ENV: Container Apps Environment name
#
# Optional environment variables for API keys:
# - FINNHUB_API_KEY: Finnhub API key for stock quotes
# - CLOUDFLARE_API_TOKEN: Cloudflare Radar API token
# - ACLED_ACCESS_TOKEN: ACLED API access token
# - FRED_API_KEY: FRED economic data API key

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Determine the project root directory (parent of deploy/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Default values
DEFAULT_LOCATION="eastus"
DEFAULT_CONTAINER_APP_NAME="worldmonitor"
DEFAULT_CONTAINER_APP_ENV="worldmonitor-env"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# Verify we're in the right directory
verify_project_root() {
    if [ ! -f "$PROJECT_ROOT/package.json" ] || [ ! -f "$PROJECT_ROOT/Dockerfile" ]; then
        echo -e "${RED}Error: Cannot find package.json or Dockerfile in project root${NC}"
        echo "Expected project root: $PROJECT_ROOT"
        echo "Make sure you're running this script from the worldmonitor repository."
        exit 1
    fi
    
    # Change to project root for Docker build context
    cd "$PROJECT_ROOT"
    echo -e "${GREEN}Project root: $PROJECT_ROOT${NC}"
}

# Check required environment variables
check_required_vars() {
    local missing=0
    
    if [ -z "$AZURE_SUBSCRIPTION_ID" ]; then
        echo -e "${RED}Error: AZURE_SUBSCRIPTION_ID is not set${NC}"
        missing=1
    fi
    
    if [ -z "$AZURE_RESOURCE_GROUP" ]; then
        echo -e "${RED}Error: AZURE_RESOURCE_GROUP is not set${NC}"
        missing=1
    fi
    
    if [ -z "$ACR_NAME" ]; then
        echo -e "${RED}Error: ACR_NAME is not set${NC}"
        missing=1
    fi
    
    if [ $missing -eq 1 ]; then
        echo ""
        echo "Required environment variables:"
        echo "  AZURE_SUBSCRIPTION_ID - Your Azure subscription ID"
        echo "  AZURE_RESOURCE_GROUP  - Resource group for deployment"
        echo "  ACR_NAME              - Azure Container Registry name"
        exit 1
    fi
}

# Set defaults for optional variables
set_defaults() {
    AZURE_LOCATION="${AZURE_LOCATION:-$DEFAULT_LOCATION}"
    CONTAINER_APP_NAME="${CONTAINER_APP_NAME:-$DEFAULT_CONTAINER_APP_NAME}"
    CONTAINER_APP_ENV="${CONTAINER_APP_ENV:-$DEFAULT_CONTAINER_APP_ENV}"
}

# Display deployment configuration
show_config() {
    echo ""
    echo -e "${GREEN}=== Deployment Configuration ===${NC}"
    echo "Subscription:        $AZURE_SUBSCRIPTION_ID"
    echo "Resource Group:      $AZURE_RESOURCE_GROUP"
    echo "Location:            $AZURE_LOCATION"
    echo "Container Registry:  $ACR_NAME"
    echo "Container App:       $CONTAINER_APP_NAME"
    echo "Environment:         $CONTAINER_APP_ENV"
    echo "Image Tag:           $IMAGE_TAG"
    echo ""
}

# Build and push Docker image
build_and_push() {
    echo -e "${YELLOW}Building Docker image...${NC}"
    
    # Get ACR login server
    ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)
    IMAGE_NAME="${ACR_LOGIN_SERVER}/${CONTAINER_APP_NAME}:${IMAGE_TAG}"
    
    # Login to ACR
    echo -e "${YELLOW}Logging in to Azure Container Registry...${NC}"
    az acr login --name "$ACR_NAME"
    
    # Build and push using ACR task (faster in Azure)
    echo -e "${YELLOW}Building and pushing image to ACR...${NC}"
    az acr build --registry "$ACR_NAME" --image "${CONTAINER_APP_NAME}:${IMAGE_TAG}" .
    
    echo -e "${GREEN}Image pushed: $IMAGE_NAME${NC}"
}

# Create or update Container Apps Environment
ensure_environment() {
    echo -e "${YELLOW}Checking Container Apps Environment...${NC}"
    
    # Check if environment exists
    if az containerapp env show --name "$CONTAINER_APP_ENV" --resource-group "$AZURE_RESOURCE_GROUP" &>/dev/null; then
        echo -e "${GREEN}Environment '$CONTAINER_APP_ENV' already exists${NC}"
    else
        echo -e "${YELLOW}Creating Container Apps Environment...${NC}"
        az containerapp env create \
            --name "$CONTAINER_APP_ENV" \
            --resource-group "$AZURE_RESOURCE_GROUP" \
            --location "$AZURE_LOCATION"
        echo -e "${GREEN}Environment created${NC}"
    fi
}

# Deploy or update Container App
deploy_app() {
    echo -e "${YELLOW}Deploying Container App...${NC}"
    
    ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)
    IMAGE_NAME="${ACR_LOGIN_SERVER}/${CONTAINER_APP_NAME}:${IMAGE_TAG}"
    
    # Get ACR credentials
    ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query username -o tsv)
    ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)
    
    # Build environment variables as an array for safe handling
    local env_vars_array=()
    
    if [ -n "$FINNHUB_API_KEY" ]; then
        env_vars_array+=("FINNHUB_API_KEY=$FINNHUB_API_KEY")
    fi
    
    if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
        env_vars_array+=("CLOUDFLARE_API_TOKEN=$CLOUDFLARE_API_TOKEN")
    fi
    
    if [ -n "$ACLED_ACCESS_TOKEN" ]; then
        env_vars_array+=("ACLED_ACCESS_TOKEN=$ACLED_ACCESS_TOKEN")
    fi
    
    if [ -n "$FRED_API_KEY" ]; then
        env_vars_array+=("FRED_API_KEY=$FRED_API_KEY")
    fi
    
    if [ -n "$VITE_WS_RELAY_URL" ]; then
        env_vars_array+=("VITE_WS_RELAY_URL=$VITE_WS_RELAY_URL")
    fi
    
    if [ -n "$VITE_OPENSKY_RELAY_URL" ]; then
        env_vars_array+=("VITE_OPENSKY_RELAY_URL=$VITE_OPENSKY_RELAY_URL")
    fi
    
    # Check if app exists
    if az containerapp show --name "$CONTAINER_APP_NAME" --resource-group "$AZURE_RESOURCE_GROUP" &>/dev/null; then
        echo -e "${YELLOW}Updating existing Container App...${NC}"
        
        # Update the container app image
        az containerapp update \
            --name "$CONTAINER_APP_NAME" \
            --resource-group "$AZURE_RESOURCE_GROUP" \
            --image "$IMAGE_NAME"
        
        # Update environment variables if any
        if [ "${#env_vars_array[@]}" -ne 0 ]; then
            az containerapp update \
                --name "$CONTAINER_APP_NAME" \
                --resource-group "$AZURE_RESOURCE_GROUP" \
                --set-env-vars "${env_vars_array[@]}"
        fi
    else
        echo -e "${YELLOW}Creating new Container App...${NC}"
        
        # Create container app with proper quoting to avoid command injection
        if [ "${#env_vars_array[@]}" -ne 0 ]; then
            az containerapp create \
                --name "$CONTAINER_APP_NAME" \
                --resource-group "$AZURE_RESOURCE_GROUP" \
                --environment "$CONTAINER_APP_ENV" \
                --image "$IMAGE_NAME" \
                --registry-server "$ACR_LOGIN_SERVER" \
                --registry-username "$ACR_USERNAME" \
                --registry-password "$ACR_PASSWORD" \
                --target-port 3000 \
                --ingress external \
                --cpu 0.5 \
                --memory 1.0Gi \
                --min-replicas 0 \
                --max-replicas 3 \
                --env-vars "${env_vars_array[@]}"
        else
            az containerapp create \
                --name "$CONTAINER_APP_NAME" \
                --resource-group "$AZURE_RESOURCE_GROUP" \
                --environment "$CONTAINER_APP_ENV" \
                --image "$IMAGE_NAME" \
                --registry-server "$ACR_LOGIN_SERVER" \
                --registry-username "$ACR_USERNAME" \
                --registry-password "$ACR_PASSWORD" \
                --target-port 3000 \
                --ingress external \
                --cpu 0.5 \
                --memory 1.0Gi \
                --min-replicas 0 \
                --max-replicas 3
        fi
    fi
    
    echo -e "${GREEN}Container App deployed${NC}"
}

# Get deployment URL
get_app_url() {
    echo ""
    echo -e "${GREEN}=== Deployment Complete ===${NC}"
    
    APP_URL=$(az containerapp show \
        --name "$CONTAINER_APP_NAME" \
        --resource-group "$AZURE_RESOURCE_GROUP" \
        --query properties.configuration.ingress.fqdn -o tsv)
    
    echo -e "Application URL: ${GREEN}https://${APP_URL}${NC}"
    echo ""
    echo "To update the deployment in the future, run:"
    echo "  IMAGE_TAG=v1.0.1 ./deploy/azure-deploy.sh"
    echo ""
    echo "To view logs:"
    echo "  az containerapp logs show --name $CONTAINER_APP_NAME --resource-group $AZURE_RESOURCE_GROUP"
}

# Main execution
main() {
    echo -e "${GREEN}=== World Monitor Azure Deployment ===${NC}"
    
    verify_project_root
    check_required_vars
    set_defaults
    show_config
    
    # Set subscription
    az account set --subscription "$AZURE_SUBSCRIPTION_ID"
    
    build_and_push
    ensure_environment
    deploy_app
    get_app_url
}

main "$@"
