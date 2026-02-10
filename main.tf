terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-south-1" # Mumbai
}

# =============================================
# 1. VPC
# =============================================
resource "aws_vpc" "textract_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "textract-vpc"
  }
}

# =============================================
# 2. Internet Gateway
# =============================================
resource "aws_internet_gateway" "textract_igw" {
  vpc_id = aws_vpc.textract_vpc.id

  tags = {
    Name = "textract-igw"
  }
}

# =============================================
# 3. Public Subnet
# =============================================
resource "aws_subnet" "textract_public_subnet" {
  vpc_id                  = aws_vpc.textract_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "ap-south-1a"
  map_public_ip_on_launch = true

  tags = {
    Name = "textract-public-subnet"
  }
}

# =============================================
# 4. Route Table (routes traffic to Internet Gateway)
# =============================================
resource "aws_route_table" "textract_rt" {
  vpc_id = aws_vpc.textract_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.textract_igw.id
  }

  tags = {
    Name = "textract-route-table"
  }
}

# =============================================
# 5. Associate Route Table with Subnet
# =============================================
resource "aws_route_table_association" "textract_rta" {
  subnet_id      = aws_subnet.textract_public_subnet.id
  route_table_id = aws_route_table.textract_rt.id
}

# =============================================
# 6. Security Group (HTTP + SSH)
# =============================================
resource "aws_security_group" "textract_sg" {
  name        = "textract-sg"
  description = "Allow HTTP and SSH traffic"
  vpc_id      = aws_vpc.textract_vpc.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "textract-sg"
  }
}

# =============================================
# 7. EC2 Instance
# =============================================
resource "aws_instance" "app_server" {
  ami           = "ami-0317b0f0a0144b137" # Amazon Linux 2023
  instance_type = "t3.micro"

  key_name                    = "textract"
  subnet_id                   = aws_subnet.textract_public_subnet.id
  vpc_security_group_ids      = [aws_security_group.textract_sg.id]
  associate_public_ip_address = true

  # OPTIMIZATION: Increase disk size to 20GB (Free Tier allows up to 30GB)
  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  user_data = <<-EOF
              #!/bin/bash
              # Update packages
              dnf update -y

              # Install Docker
              dnf install -y docker
              systemctl start docker
              systemctl enable docker

              # OPTIMIZATION: Add Swap space (4GB) to prevent OOM on t3.micro during OCR
              fallocate -l 4G /swapfile
              chmod 600 /swapfile
              mkswap /swapfile
              swapon /swapfile
              echo '/swapfile none swap sw 0 0' >> /etc/fstab

              # Add ec2-user to docker group
              usermod -aG docker ec2-user

              # Pull and run the container
              docker pull nidhishaseuro/textract:slim
              docker run -d -p 80:80 --restart always --name textract-app nidhishaseuro/textract:slim
              EOF

  tags = {
    Name = "Textract-App-Server"
  }
}

# =============================================
# Outputs
# =============================================
output "public_ip" {
  value       = aws_instance.app_server.public_ip
  description = "Access your app at http://<this-ip>"
}

output "vpc_id" {
  value = aws_vpc.textract_vpc.id
}
