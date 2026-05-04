import 'package:json_annotation/json_annotation.dart';

part 'user.g.dart';

@JsonSerializable()
class User {
  final String id;
  final String username;
  final String email;
  final String? nickname;
  final String? avatar;
  final String role;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  User({
    required this.id,
    required this.username,
    required this.email,
    this.nickname,
    this.avatar,
    this.role = 'user',
    this.createdAt,
    this.updatedAt,
  });

  String get displayName => nickname ?? username;

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);

  Map<String, dynamic> toJson() => _$UserToJson(this);
}
