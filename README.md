# TP Final CI/CD — Docker, Kubernetes & AWS

Application 2 services (API Node.js + MongoDB) containerisée, déployée sur une VM AWS EC2 exécutant **K3s**, via un pipeline **GitHub Actions** complet. L'infrastructure est provisionnée par **Terraform**, et la plateforme est monitorée par **Prometheus + Grafana**. Un cluster **AWS EKS** managé est également disponible en bonus.

---

## Architecture

```
             ┌──────────────┐          git push          ┌────────────────────┐
             │  Développeur │ ───────────────────────▶   │   GitHub Actions   │
             └──────────────┘                             │ 1. Install deps    │
                                                          │ 2. Tests (Jest)    │
                                                          │ 3. Build Docker    │
                                                          │ 4. Push → GHCR     │
                                                          │ 5. SSH → VM        │
                                                          │ 6. kubectl set img │
                                                          └─────────┬──────────┘
                                                                    │
                         ┌──────────────────────────────────────────▼────────────┐
                         │        AWS EC2  (Ubuntu 22.04, t3.small)              │
                         │                                                       │
                         │   ┌───────── K3s cluster (namespace: tp-cicd) ──────┐ │
                         │   │                                                 │ │
                         │   │   [Deployment api ×2]  ───▶  [Service api]     │ │
                         │   │          │                     │                │ │
                         │   │          ▼                     ▼                │ │
                         │   │   [StatefulSet mongo]      [Ingress Traefik]   │ │
                         │   │                                                 │ │
                         │   │   [Prometheus] ◀── /metrics ── [api]           │ │
                         │   │   [Grafana]                                    │ │
                         │   └─────────────────────────────────────────────────┘ │
                         └───────────────────────────────────────────────────────┘
                                               │
                                               ▼
                                   http://<IP_VM>/health
```

## Arborescence

```
.
├── app/                  API Node.js (Express + MongoDB)
├── docker-compose.yml    Orchestration locale api + mongo
├── k8s/                  Manifests Kubernetes
├── terraform/            Provisioning AWS (VPC, EC2, EKS)
├── monitoring/           Prometheus / Grafana (Helm values)
├── .github/workflows/    Pipeline CI/CD
└── docs/                 Rapport + captures d'écran
```

---

## Prérequis

| Outil | Version | Usage |
|---|---|---|
| Node.js | ≥ 20 | Dev local |
| Docker + Compose | récent | Build + exécution conteneurs |
| AWS CLI | v2 | Credentials pour Terraform |
| Terraform | ≥ 1.5 | Provisioning |
| kubectl | ≥ 1.29 | Pilotage K8s |
| Helm | ≥ 3.14 | Monitoring |

Un compte AWS avec des credentials configurés (`aws configure`).

---

## 1 · Exécution en local (Docker Compose)

```bash
cp .env.example .env
# Remplir au moins MONGO_PASSWORD
docker compose up --build
```

Vérifier :
```bash
curl http://localhost:3000/health
# → {"status":"ok","db":"connected","uptime":...}
curl -X POST http://localhost:3000/api/items -H 'Content-Type: application/json' -d '{"name":"demo"}'
curl http://localhost:3000/api/items
curl http://localhost:3000/metrics
```

Lancer les tests :
```bash
cd app && npm ci && npm test
```

---

## 2 · Provisioning AWS (Terraform)

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Éditer terraform.tfvars : restreindre admin_ssh_cidr à ton IP (curl ifconfig.me)
terraform init
terraform apply
```

Outputs utiles :
- `ec2_public_ip` : IP publique de la VM
- `ssh_command` : commande SSH prête à copier
- `app_url` : URL de l'app une fois K8s déployé

La VM lance automatiquement via `user_data` : Docker, Docker Compose, K3s, kubectl, Helm.

**Bonus EKS** : passer `enable_eks = true` dans `terraform.tfvars` puis `terraform apply` (coût ~2,30 $/jour).

---

## 4 · Pipeline CI/CD (GitHub Actions)

Trigger : `push` sur `main`.

```
git push
   │
   ▼
┌─────────────────────────┐
│ job: test               │   npm ci → npm run test:ci
└───────────┬─────────────┘
            │ needs
            ▼
┌─────────────────────────┐
│ job: build-push         │   docker buildx → GHCR (tag = sha-$GITHUB_SHA + latest)
└───────────┬─────────────┘
            │ needs
            ▼
┌─────────────────────────┐
│ job: deploy-vm          │   SSH EC2 → kubectl apply → kubectl set image → rollout status
└─────────────────────────┘
```

### Secrets GitHub à configurer (Repository Settings → Secrets and variables → Actions)

| Nom | Contenu |
|---|---|
| `EC2_HOST` | IP publique de la VM (output Terraform) |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Contenu de `terraform/tp-cicd-key.pem` (clé privée) |
| `MONGO_USER` | ex: `appuser` |
| `MONGO_PASSWORD` | mot de passe fort |
| `GHCR_PULL_TOKEN` | Personal Access Token avec scope `read:packages` (pour que la VM puisse pull depuis GHCR) |

Le workflow échoue si les tests échouent (les jobs sont chaînés par `needs`). Aucune action manuelle n'est requise pour déployer.

---

## 5 · Monitoring (bonus Prometheus + Grafana)

Sur la VM :
```bash
bash monitoring/install.sh
```

Accès :
- Prometheus : `http://<IP_VM>:31090`
- Grafana : `http://<IP_VM>:31000` (admin / `changeme-grafana` — à changer immédiatement)

Importer le dashboard `monitoring/dashboards/api-dashboard.json` dans Grafana (UI → Dashboards → Import).

Le `ServiceMonitor` (`k8s/servicemonitor.yaml`) déclare le scraping automatique de `/metrics` sur l'API.

---

## 6 · Bonus EKS (Kubernetes managé)

```bash
cd terraform
# dans terraform.tfvars : enable_eks = true
terraform apply
aws eks update-kubeconfig --region eu-west-3 --name tp-cicd
kubectl get nodes
kubectl apply -f ../k8s/   # même manifests, cluster managé
```

> EKS est ~2,30 $/jour pour le control plane. **Lancer `terraform destroy` dès la démo terminée.**

---

## 7 · Gestion des variables et des secrets

| Contexte | Mécanisme |
|---|---|
| Local | `.env` (gitignoré) ; `.env.example` committé |
| CI/CD | GitHub Secrets injectés dans le workflow via `${{ secrets.* }}` |
| Kubernetes | `Secret` créé via `kubectl create secret ... --dry-run=client -o yaml \| kubectl apply -f -` (jamais committé) |
| Terraform | `terraform.tfvars` gitignoré ; state et clé privée `.pem` gitignorés |

Aucun secret n'est présent dans le code source. Le `.gitignore` couvre `.env`, `*.pem`, `*.tfvars`, `*.tfstate*`.

---

## 8 · Nettoyage

```bash
cd terraform
terraform destroy
```

---

## 9 · Difficultés rencontrées

*(À compléter au fil du projet — voir `docs/rapport.md`.)*

---

## 10 · Bonus réalisés

- [x] Dockerfile **multi-stage** (`app/Dockerfile`)
- [x] Provisioning automatique de la VM par **Terraform**
- [x] **Monitoring** Prometheus + Grafana via Helm
- [x] Cluster **Kubernetes managé** (AWS EKS, activable par variable Terraform)
