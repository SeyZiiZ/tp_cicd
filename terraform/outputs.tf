output "ec2_public_ip" {
  value       = aws_eip.vm.public_ip
  description = "IP publique (Elastic IP) de la VM K3s"
}

output "ssh_command" {
  value       = "ssh -i ${path.module}/${var.project_name}-key.pem ubuntu@${aws_eip.vm.public_ip}"
  description = "Commande SSH prête à copier"
}

output "app_url" {
  value       = "http://${aws_eip.vm.public_ip}/health"
  description = "URL de santé de l'app une fois K8s déployé"
}

output "eks_kubeconfig_command" {
  value       = var.enable_eks ? "aws eks update-kubeconfig --region ${var.aws_region} --name ${var.project_name}" : "EKS désactivé (var.enable_eks = false)"
  description = "Commande pour configurer kubectl sur EKS"
}
