variable "aws_region" {
  type        = string
  default     = "eu-west-3"
  description = "Région AWS (eu-west-3 = Paris)"
}

variable "project_name" {
  type    = string
  default = "tp-cicd"
}

variable "ec2_instance_type" {
  type        = string
  default     = "t3.small"
  description = "t3.small minimum pour K3s + app + mongo"
}

variable "admin_ssh_cidr" {
  type        = string
  default     = "0.0.0.0/0"
  description = "À restreindre à ton IP (ex: 88.12.34.56/32)"
}

variable "http_cidr" {
  type    = string
  default = "0.0.0.0/0"
}

variable "enable_eks" {
  type        = bool
  default     = false
  description = "Activer la création du cluster EKS managé (coûte ~2,30 $/jour)"
}

variable "eks_node_instance_type" {
  type    = string
  default = "t3.medium"
}

variable "eks_node_desired_size" {
  type    = number
  default = 2
}
