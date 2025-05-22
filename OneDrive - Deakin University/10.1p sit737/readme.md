# simple-node-app

A simple Node.js web application deployed on Google Kubernetes Engine (GKE) with full monitoring, logging, and alerting via Google Cloud.

---

## Table of Contents

1. [Overview](#overview)  
2. [Prerequisites](#prerequisites)  
3. [Project Structure](#project-structure)  
4. [Setup & Deployment](#setup--deployment)  
   1. [Enable GCP APIs](#enable-gcp-apis)  
   2. [Create GKE Cluster](#create-gke-cluster)  
   3. [Build & Push Docker Image](#build--push-docker-image)  
   4. [Deploy to Kubernetes](#deploy-to-kubernetes)  
5. [Usage & Testing](#usage--testing)  
6. [Monitoring & Logging](#monitoring--logging)  
   1. [Metrics Explorer](#metrics-explorer)  
   2. [Logs Explorer & Log-Based Metric](#logs-explorer--log-based-metric)  
   3. [Alerting Policy](#alerting-policy)  
7. [Autoscaling (HPA)](#autoscaling-hpa)  
8. [Troubleshooting](#troubleshooting)  
9. [Scope Note](#scope-note)  
10. [References](#references)  

---

## Overview

This repo contains a minimal Express.js app that prints its hostname and uptime, packaged in a Docker container and deployed on GKE. It demonstrates:

- Containerization (Docker)  
- Kubernetes deployment & Service  
- Horizontal Pod Autoscaling (HPA)  
- Google Cloud Monitoring (CPU & Memory)  
- Google Cloud Logging & a log-based counter metric  
- Alerting policy with email notification  

---

## Prerequisites

- Google Cloud project & billing enabled  
- `gcloud` CLI & `kubectl` installed  
- Docker Desktop (or equivalent)  
- (Optional) Docker Hub account for fallback registry  

---

## Project Structure

```

simple-node-app/
├── README.md
├── app.js
├── package.json
├── Dockerfile
└── k8s/
├── deployment.yaml
├── service.yaml
└── hpa.yaml

````

---

## Setup & Deployment

### Enable GCP APIs

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable \
  container.googleapis.com \
  monitoring.googleapis.com \
  logging.googleapis.com
````

### Create GKE Cluster

```bash
gcloud container clusters create simple-cluster \
  --zone asia-southeast1-a \
  --num-nodes 3 \
  --enable-stackdriver-kubernetes

gcloud container clusters get-credentials simple-cluster \
  --zone asia-southeast1-a
```

### Build & Push Docker Image

#### Artifact Registry (preferred)

```bash
gcloud auth configure-docker asia-southeast1-docker.pkg.dev

docker build -t asia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/my-repo/simple-node-app:latest .
docker push asia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/my-repo/simple-node-app:latest
```

#### Docker Hub (fallback)

```bash
docker login
docker build -t YOUR_DOCKERHUB_USER/simple-node-app:latest .
docker push YOUR_DOCKERHUB_USER/simple-node-app:latest
```

### Deploy to Kubernetes

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml     # optional
kubectl get pods
kubectl get svc simple-node-service
```

---

## Usage & Testing

Get the external IP:

```bash
kubectl get svc simple-node-service
# → EXTERNAL_IP=35.240.190.176
```

Test the app:

```bash
curl http://35.240.190.176/
```

You should see:

```html
<h1>Simple Node App</h1>
<p>Hostname: simple-node-app-xxxxx</p>
<p>Uptime: 123 seconds</p>
```

---

## Monitoring & Logging

### Metrics Explorer

1. Open **Monitoring → Metrics Explorer** in GCP console.
2. Select **Resource type**: *Kubernetes Container*.
3. **CPU chart**:

   * Metric: `kubernetes.io/container/cpu/request_utilization`
   * Filters: `namespace_name=default`, `pod_name =~ simple-node-app-.*`
   * Aggregation: Mean, Unaggregated, Last 6 hours.
4. **Memory chart**: same steps with
   `kubernetes.io/container/memory/request_utilization`.

### Logs Explorer & Log-Based Metric

1. In **Logs Explorer**: filter by:

   ```plaintext
   resource.type="k8s_container"
   AND resource.labels.k8s-pod/app="simple-node-app"
   AND textPayload:"Request received"
   ```
2. Click **Create log-based metric**:

   * Name: `simple_node_request_count`
   * Type: Counter, Units: `1`
   * Filter (one-line LQL):

     ```plaintext
     resource.type="k8s_container" AND
     resource.labels.k8s-pod/app="simple-node-app" AND
     textPayload:"Request received"
     ```
3. Preview logs → Create metric.

### Alerting Policy

1. **Monitoring → Alerting → Create policy**
2. Select metric: **Logging > Counter > simple\_node\_request\_count**
3. Transform:

   * Rolling window: 1 min, Function: sum
   * Across time series: sum, Group by: None
4. Trigger: **Above 0 for 1 minute**
5. Notification: add Email channel
6. Name: `Simple-Node Request Alert` → Save

#### Verify Incident

To keep the alert firing long enough to view:

```powershell
while ($true) {
  curl http://35.240.190.176/ > $null
  Start-Sleep 1
}
```

Open **Monitoring → Alerting → Incidents** (show closed incidents) to see your alert.

---

## Autoscaling (HPA)

Check HPA status:

```bash
kubectl get hpa simple-node-hpa
# TARGETS  cpu:0%/50%  REPLICAS 3  (under no load)
```

Generate load for 2 minutes:

```bash
kubectl run load --image=busybox -- sh -c "while sleep 0.1; do wget -qO- http://35.240.190.176; done"
```

Re-check:

```bash
kubectl get hpa simple-node-hpa
# TARGETS  cpu:>50%  REPLICAS >3
```

---

## Troubleshooting

* **ImagePullBackOff**: run `gcloud auth configure-docker …` or use Docker Hub.
* **No metrics**: remove filters first, confirm unfiltered data, then re-add.
* **Log-metric errors**: use one-line LQL and Preview logs.
* **Blank alert chart**: switch to 1 min sum transform and re-fire requests.
* **Incident auto-close**: generate continuous load or set “Never” auto-close.

---

## Scope Note

This demo is stateless and uses no database. MongoDB and Docker-Compose were not required for Task 10.1P.

---

## References

* Google Cloud. (2025) *Metrics Explorer overview*. Available at: [https://cloud.google.com/monitoring/metrics-explorer](https://cloud.google.com/monitoring/metrics-explorer) (Accessed: 22 May 2025).
* Google Cloud. (2025) *Creating log-based metrics*. Available at: [https://cloud.google.com/logging/docs/logs-based-metrics/creating-metrics](https://cloud.google.com/logging/docs/logs-based-metrics/creating-metrics) (Accessed: 22 May 2025).
* Google Cloud. (2025) *Alerting policies*. Available at: [https://cloud.google.com/monitoring/alerts](https://cloud.google.com/monitoring/alerts) (Accessed: 22 May 2025).
* Kubernetes. (2024) *Horizontal Pod Autoscaling*. Available at: [https://cloud.google.com/kubernetes-engine/docs/concepts/horizontalpodautoscaler](https://cloud.google.com/kubernetes-engine/docs/concepts/horizontalpodautoscaler) (Accessed: 22 May 2025).
* Express. (2024) *Express API reference*. Available at: [https://expressjs.com/en/4x/api.html](https://expressjs.com/en/4x/api.html) (Accessed: 22 May 2025).

```
```
