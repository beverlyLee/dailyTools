resource "aws_s3_bucket" "public_bucket" {
  bucket = "my-public-bucket-12345"
  
  acl = "public-read"
  
  public_access_block {
    block_public_acls       = false
    block_public_policy     = false
    ignore_public_acls      = false
    restrict_public_buckets = false
  }
}

resource "aws_security_group" "open_sg" {
  name        = "open-security-group"
  description = "过于宽松的安全组"
  
  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
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
}

resource "aws_ebs_volume" "unencrypted_volume" {
  availability_zone = "us-east-1a"
  size              = 100
  type              = "gp2"
  encrypted         = false
}

resource "aws_db_instance" "unencrypted_db" {
  engine               = "mysql"
  instance_class       = "db.t2.micro"
  storage_encrypted    = false
  
  username = "admin"
  password = "hardcoded_password_123"
}

resource "aws_ec2_instance" "web_server" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"
  
  tags = {
    Name = "web-server"
  }
}
