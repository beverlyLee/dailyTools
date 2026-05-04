class Tenant {
  final int id;
  final User? user;
  final String name;
  final String phone;
  final String? idCard;
  final String? email;
  final String? emergencyContact;
  final String? emergencyPhone;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Tenant({
    required this.id,
    this.user,
    required this.name,
    required this.phone,
    this.idCard,
    this.email,
    this.emergencyContact,
    this.emergencyPhone,
    this.createdAt,
    this.updatedAt,
  });

  factory Tenant.fromJson(Map<String, dynamic> json) {
    return Tenant(
      id: json['id'],
      user: json['user'] != null ? User.fromJson(json['user']) : null,
      name: json['name'],
      phone: json['phone'],
      idCard: json['id_card'],
      email: json['email'],
      emergencyContact: json['emergency_contact'],
      emergencyPhone: json['emergency_phone'],
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'phone': phone,
      'id_card': idCard,
      'email': email,
      'emergency_contact': emergencyContact,
      'emergency_phone': emergencyPhone,
    };
  }

  String get maskedIdCard {
    if (idCard == null || idCard!.length < 8) {
      return idCard ?? '';
    }
    return '${idCard!.substring(0, 6)}********${idCard!.substring(14)}';
  }

  String get maskedPhone {
    if (phone.length < 7) {
      return phone;
    }
    return '${phone.substring(0, 3)}****${phone.substring(7)}';
  }
}
