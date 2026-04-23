# Cluster EKS managé (bonus). Activer avec: enable_eks = true
# Coût approximatif : ~2,30 $/jour control plane + nodes.

module "eks" {
  count   = var.enable_eks ? 1 : 0
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.8"

  cluster_name    = var.project_name
  cluster_version = "1.30"

  cluster_endpoint_public_access = true

  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.public[*].id

  enable_cluster_creator_admin_permissions = true

  eks_managed_node_groups = {
    default = {
      instance_types = [var.eks_node_instance_type]
      min_size       = 1
      max_size       = 3
      desired_size   = var.eks_node_desired_size
    }
  }

  tags = {
    Cluster = var.project_name
  }
}
