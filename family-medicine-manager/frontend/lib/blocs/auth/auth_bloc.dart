import 'package:bloc/bloc.dart';

import 'auth_event.dart';
import 'auth_state.dart';
import '../../repositories/auth_repository.dart';
import '../../services/storage_service.dart';
import '../../models/user.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository _authRepository;
  final StorageService _storageService;

  AuthBloc({
    required AuthRepository authRepository,
    required StorageService storageService,
  })  : _authRepository = authRepository,
        _storageService = storageService,
        super(AuthInitial()) {
    on<AuthCheckRequested>(_onAuthCheckRequested);
    on<AuthLoginRequested>(_onAuthLoginRequested);
    on<AuthRegisterRequested>(_onAuthRegisterRequested);
    on<AuthLogoutRequested>(_onAuthLogoutRequested);
  }

  Future<void> _onAuthCheckRequested(
    AuthCheckRequested event,
    Emitter<AuthState> emit,
  ) async {
    try {
      final isAuthenticated = await _authRepository.isAuthenticated();
      
      if (isAuthenticated) {
        final user = await _authRepository.getSavedUser();
        final token = await _storageService.getToken();
        
        if (user != null && token != null) {
          emit(AuthAuthenticated(user: user, token: token));
          return;
        }
      }
      
      emit(AuthUnauthenticated());
    } catch (e) {
      emit(AuthUnauthenticated());
    }
  }

  Future<void> _onAuthLoginRequested(
    AuthLoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final result = await _authRepository.login(
        event.username,
        event.password,
      );
      
      emit(AuthAuthenticated(
        user: result['user'] as User,
        token: result['token'] as String,
      ));
    } catch (e) {
      emit(AuthError(e.toString().replaceAll('Exception: ', '')));
      emit(AuthUnauthenticated());
    }
  }

  Future<void> _onAuthRegisterRequested(
    AuthRegisterRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      await _authRepository.register(
        username: event.username,
        email: event.email,
        password: event.password,
        nickname: event.nickname,
      );
      
      final result = await _authRepository.login(
        event.username,
        event.password,
      );
      
      emit(AuthAuthenticated(
        user: result['user'] as User,
        token: result['token'] as String,
      ));
    } catch (e) {
      emit(AuthError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onAuthLogoutRequested(
    AuthLogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    await _authRepository.logout();
    emit(AuthUnauthenticated());
  }
}
