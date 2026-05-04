import 'package:equatable/equatable.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object> get props => [];
}

class AuthCheckRequested extends AuthEvent {}

class AuthLoginRequested extends AuthEvent {
  final String username;
  final String password;

  const AuthLoginRequested({
    required this.username,
    required this.password,
  });

  @override
  List<Object> get props => [username, password];
}

class AuthRegisterRequested extends AuthEvent {
  final String username;
  final String email;
  final String password;
  final String? nickname;

  const AuthRegisterRequested({
    required this.username,
    required this.email,
    required this.password,
    this.nickname,
  });

  @override
  List<Object> get props => [username, email, password, nickname ?? ''];
}

class AuthLogoutRequested extends AuthEvent {}
