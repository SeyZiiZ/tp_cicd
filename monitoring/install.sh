#!/usr/bin/env bash
# Script à exécuter sur la VM pour installer la stack monitoring.
set -euo pipefail

export KUBECONFIG=${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

sudo kubectl create namespace monitoring --dry-run=client -o yaml | sudo kubectl apply -f -

helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  -n monitoring \
  -f "$(dirname "$0")/values-prometheus.yaml" \
  --wait --timeout 10m

# Le ServiceMonitor de l'API doit porter le label release=monitoring pour être scrapé
sudo kubectl apply -f "$(dirname "$0")/../k8s/servicemonitor.yaml"

echo ""
echo "Grafana :     http://<IP_VM>:31000   (admin / changeme-grafana)"
echo "Prometheus :  http://<IP_VM>:31090"
