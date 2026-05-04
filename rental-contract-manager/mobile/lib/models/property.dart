import 'package:intl/intl.dart';

class Property {
  final int id;
  final User? owner;
  final String name;
  final String address;
  final String propertyType;
  final double? area;
  final int? rooms;
  final int? bathrooms;
  final String? description;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Property({
    required this.id,
    this.owner,
    required this.name,
    required this.address,
    required this.propertyType,
    this.area,
    this.rooms,
    this.bathrooms,
    this.description,
    this.createdAt,
    this.updatedAt,
  });

  factory Property.fromJson(Map<String, dynamic> json) {
    return Property(
      id: json['id'],
      owner: json['owner'] != null ? User.fromJson(json['owner']) : null,
      name: json['name'],
      address: json['address'],
      propertyType: json['property_type'],
      area: json['area'] != null ? (json['area'] as num).toDouble() : null,
      rooms: json['rooms'],
      bathrooms: json['bathrooms'],
      description: json['description'],
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
      'id': id,
      'name': name,
      'address': address,
      'property_type': propertyType,
      'area': area,
      'rooms': rooms,
      'bathrooms': bathrooms,
      'description': description,
    };
  }

  String get propertyTypeDisplay {
    const Map<String, String> types = {
      'apartment': '公寓',
      'house': '住宅',
      'studio': '单间',
      'loft': 'loft',
      'other': '其他',
    };
    return types[propertyType] ?? propertyType;
  }

  String get displayText {
    String text = name;
    if (area != null) {
      text += ' · ${NumberFormat('0.0').format(area)}㎡';
    }
    if (rooms != null) {
      text += ' · $rooms室';
    }
    if (bathrooms != null) {
      text += '$bathrooms卫';
    }
    return text;
  }
}
