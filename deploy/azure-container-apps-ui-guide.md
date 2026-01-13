# Deploying World Monitor to Azure Container Apps via the Azure Portal

This guide provides step-by-step instructions for deploying the World Monitor application to Azure Container Apps using the Azure Portal UI. The Docker image is automatically pushed to Azure Container Registry (ACR) by GitHub Actions when changes are merged to the `main` branch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Understanding the Workflow](#understanding-the-workflow)
3. [Step 1: Verify Image in ACR](#step-1-verify-image-in-acr)
4. [Step 2: Create a Container Apps Environment](#step-2-create-a-container-apps-environment)
5. [Step 3: Create the Container App](#step-3-create-the-container-app)
6. [Step 4: Configure Container Settings](#step-4-configure-container-settings)
7. [Step 5: Configure Ingress](#step-5-configure-ingress)
8. [Step 6: Configure Environment Variables](#step-6-configure-environment-variables)
9. [Step 7: Review and Create](#step-7-review-and-create)
10. [Step 8: Access Your Application](#step-8-access-your-application)
11. [Updating the Deployment](#updating-the-deployment)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:

- ✅ **Azure Account**: An active Azure subscription
- ✅ **Azure Container Registry (ACR)**: A registry with the World Monitor image pushed
- ✅ **GitHub Actions**: The workflow has successfully pushed the Docker image to ACR
- ✅ **ACR Access**: Appropriate permissions to pull images from the ACR

> **Note**: The GitHub Actions workflow (`.github/workflows/deploy-azure.yml`) automatically builds and pushes the Docker image to ACR on every push to `main`. Ensure at least one successful workflow run has completed before proceeding.

---

## Understanding the Workflow

The deployment architecture works as follows:

```
GitHub Repository
       │
       ▼ (push to main)
GitHub Actions
       │
       ▼ (build & push)
Azure Container Registry (ACR)
       │
       ▼ (pull image)
Azure Container Apps
       │
       ▼ (serves traffic)
End Users
```

**GitHub Actions handles:**
- Building the Docker image
- Tagging with commit SHA and `latest`
- Pushing to ACR (e.g., `jjacr01.azurecr.io/worldmonitor:latest`)

**You will configure via the Portal:**
- Creating the Container Apps Environment
- Creating the Container App that pulls from ACR
- Setting up ingress and environment variables

---

## Step 1: Verify Image in ACR

Before creating the Container App, verify the image exists in your ACR:

1. Navigate to the [Azure Portal](https://portal.azure.com)
2. Go to **Container registries**
3. Select your ACR (e.g., `jjacr01`)
4. Click **Repositories** in the left menu
5. Verify that `worldmonitor` repository exists
6. Click on the repository to see available tags (you should see `latest` and commit SHA tags)

> ✅ **Expected**: You should see the `worldmonitor` repository with at least the `latest` tag.

---

## Step 2: Create a Container Apps Environment

A Container Apps Environment is the shared boundary for a group of container apps. All apps in the same environment share the same virtual network and logging configuration.

1. In the Azure Portal, search for **Container Apps** in the top search bar
2. Click **+ Create** to create a new Container App
3. You'll first need an environment. If you don't have one:
   - In the **Container Apps Environment** dropdown, click **Create new**
   - Enter an **Environment name** (e.g., `worldmonitor-env`)
   - Leave **Zone redundancy** as disabled (unless you need high availability)
   - Click **Create**

> 💡 **Tip**: If you already have a Container Apps Environment from a previous deployment, you can reuse it.

---

## Step 3: Create the Container App

On the **Create Container App** page, configure the **Basics** tab:

### Project Details

| Field | Value |
|-------|-------|
| **Subscription** | Select your Azure subscription |
| **Resource group** | Select an existing group or create new (e.g., `worldmonitor-rg`) |
| **Container app name** | `worldmonitor` |
| **Deployment source** | Select **Container image** |

### Container Apps Environment

| Field | Value |
|-------|-------|
| **Region** | Select your preferred region (e.g., `East US`) |
| **Container Apps Environment** | Select the environment created in Step 2 |

Click **Next: Container >** to proceed.

---

## Step 4: Configure Container Settings

On the **Container** tab, configure the image source:

### Image Source

1. Uncheck **Use quickstart image** (if checked)
2. Select **Azure Container Registry** as the image source

### Azure Container Registry Settings

| Field | Value |
|-------|-------|
| **Registry** | Select your ACR (e.g., `jjacr01`) |
| **Image** | Select `worldmonitor` |
| **Image tag** | Select `latest` (or a specific commit SHA) |

### Container Resource Allocation

| Field | Recommended Value |
|-------|-------------------|
| **CPU cores** | `0.5` |
| **Memory (Gi)** | `1` |

> 💡 **Note**: These are the minimum recommended resources. For production workloads with higher traffic, consider increasing to `1` CPU and `2Gi` memory.

### Command Override (Optional)

Leave the **Command** and **Args** fields empty unless you need to override the default container startup command.

Click **Next: Bindings >** to proceed. You can skip the Bindings tab (click **Next: Ingress >**).

---

## Step 5: Configure Ingress

Ingress controls external access to your container app. On the **Ingress** tab:

1. **Enable** the **Ingress** toggle (set to **Enabled**)

### Ingress Settings

| Field | Value |
|-------|-------|
| **Ingress traffic** | Select **Accepting traffic from anywhere** |
| **Ingress type** | Select **HTTP** |
| **Client certificate mode** | Select **Ignore** |
| **Transport** | Select **Auto** |
| **Target port** | Enter `3000` |

> ⚠️ **Important**: The target port **must** be `3000` - this is the port the nginx server inside the container listens on.

### Session Affinity

Leave **Session affinity** disabled unless your application requires sticky sessions.

Click **Next: Tags >** (optional), then click **Next: Review + create >**.

---

## Step 6: Configure Environment Variables

Environment variables can be added during creation or after the app is deployed. The World Monitor app supports several optional environment variables for enhanced functionality:

### Adding Environment Variables During Creation

On the **Container** tab, scroll down to the **Environment variables** section and add any of these optional variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `FINNHUB_API_KEY` | No | Finnhub API key for stock quotes |
| `CLOUDFLARE_API_TOKEN` | No | Cloudflare Radar API token for internet outage data |
| `ACLED_ACCESS_TOKEN` | No | ACLED API token for protest/conflict data |
| `FRED_API_KEY` | No | FRED API key for economic data |
| `VITE_WS_RELAY_URL` | No | WebSocket relay URL for AIS vessel tracking |
| `VITE_OPENSKY_RELAY_URL` | No | OpenSky relay URL for aircraft tracking |

> 💡 **Note**: The app functions fully without these API keys—the corresponding features/layers will simply be hidden from the UI.

### Adding Environment Variables After Deployment

If you prefer to add them later:

1. Go to your Container App in the Azure Portal
2. Click **Containers** under **Application** in the left menu
3. Click **Edit and deploy**
4. In the **Container** section, expand **Environment variables**
5. Click **+ Add** for each variable
6. Enter the **Name** and **Value**
7. Click **Save** and then **Create** to deploy the new revision

---

## Step 7: Review and Create

On the **Review + create** tab:

1. Review all the configuration settings
2. Verify the following:
   - ✅ Correct ACR registry and image selected
   - ✅ Target port is `3000`
   - ✅ Ingress is enabled and set to accept traffic from anywhere
   - ✅ Environment is correctly configured

3. Click **Create** to deploy the Container App

> ⏱️ **Deployment Time**: The initial deployment typically takes 2-5 minutes.

---

## Step 8: Access Your Application

Once the deployment completes:

1. Go to your Container App in the Azure Portal
2. Click **Overview** in the left menu
3. Find the **Application Url** field (it will look like `https://worldmonitor.{random-suffix}.{region}.azurecontainerapps.io`)
4. Click the URL to open your World Monitor dashboard

> ✅ **Success**: You should see the World Monitor dashboard with the interactive map and data panels.

---

## Updating the Deployment

When new changes are pushed to the `main` branch, GitHub Actions automatically builds and pushes a new image to ACR. To update your Container App with the new image:

### Option 1: Using a New Revision (Recommended)

1. Go to your Container App in the Azure Portal
2. Click **Revisions and replicas** under **Application**
3. Click **Create new revision**
4. In the container settings, update the **Image tag** to the new commit SHA or leave as `latest`
5. Click **Create**

### Option 2: Force Pull of Latest Image

1. Go to your Container App in the Azure Portal
2. Click **Containers** under **Application**
3. Click **Edit and deploy**
4. Ensure the image tag is `latest`
5. Click **Create** (this creates a new revision that pulls the latest image)

### Option 3: Enable Continuous Deployment (Advanced)

You can configure ACR to trigger Container App updates automatically:

1. Go to your Container App
2. Click **Continuous deployment** under **Settings**
3. Enable continuous deployment
4. Select your ACR and repository
5. Configure the trigger settings

---

## Troubleshooting

### Image Pull Errors

**Symptom**: Container App shows "ImagePullBackOff" or similar error.

**Solutions**:
1. Verify ACR admin user is enabled:
   - Go to your ACR → **Settings** → **Access keys**
   - Enable **Admin user**
2. Verify the Container App has the correct registry credentials:
   - Go to Container App → **Secrets and Variables** → **Container registries**
   - Ensure your ACR is listed with valid credentials
3. Verify the image exists in ACR:
   - Go to ACR → **Repositories** → `worldmonitor`
   - Confirm the tag you're using exists

### Container Fails to Start

**Symptom**: Container restarts repeatedly or shows "CrashLoopBackOff".

**Solutions**:
1. Check the container logs:
   - Go to Container App → **Log stream** (under Monitoring)
   - Look for error messages during startup
2. Verify the target port is set to `3000`
3. Ensure resource allocation is sufficient (at least 0.5 CPU, 1Gi memory)

### Application Not Accessible

**Symptom**: The application URL returns 502 or connection timeout.

**Solutions**:
1. Verify ingress is enabled:
   - Go to Container App → **Ingress** (under Settings)
   - Ensure ingress is enabled and set to external
2. Verify the target port matches the container's exposed port (`3000`)
3. Wait for the health check to pass (may take 1-2 minutes after deployment)

### Viewing Application Logs

To view detailed application logs:

1. Go to your Container App → **Log stream** (for real-time logs)
2. Or go to **Logs** (under Monitoring) for historical log queries:
   ```kusto
   ContainerAppConsoleLogs_CL
   | where ContainerAppName_s == "worldmonitor"
   | project TimeGenerated, Log_s
   | order by TimeGenerated desc
   ```

### Health Check Failures

The World Monitor container includes a health check endpoint at `/health`. If health checks are failing:

1. Verify the container is running:
   - Go to Container App → **Revisions and replicas**
   - Check the replica status
2. Test the health endpoint locally:
   ```bash
   curl https://your-app-url/health
   ```
3. Check if the nginx server is properly configured (the `/health` endpoint should return a 200 status)

---

## Next Steps

After successfully deploying World Monitor:

1. **Configure API Keys**: Add optional environment variables for enhanced functionality
2. **Set Up Monitoring**: Configure Azure Monitor alerts for the Container App
3. **Scale Settings**: Adjust min/max replicas based on expected traffic
4. **Custom Domain**: Configure a custom domain via **Custom domains** settings

---

## Related Documentation

- [Azure Container Apps Documentation](https://learn.microsoft.com/en-us/azure/container-apps/)
- [World Monitor README](../README.md)
- [Azure Container Apps CLI Deployment Script](./azure-deploy.sh)
