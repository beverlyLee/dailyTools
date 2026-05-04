import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'blocs/auth/auth_bloc.dart';
import 'blocs/medicine/medicine_bloc.dart';
import 'blocs/reminder/reminder_bloc.dart';
import 'repositories/auth_repository.dart';
import 'repositories/medicine_repository.dart';
import 'repositories/reminder_repository.dart';
import 'services/api_service.dart';
import 'services/storage_service.dart';
import 'utils/theme.dart';
import 'router/app_router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  
  await initializeDateFormatting('zh_CN', null);
  
  final sharedPreferences = await SharedPreferences.getInstance();
  final storageService = StorageService(sharedPreferences);
  final apiService = ApiService(storageService);
  
  final authRepository = AuthRepository(apiService, storageService);
  final medicineRepository = MedicineRepository(apiService);
  final reminderRepository = ReminderRepository(apiService);
  
  runApp(MyApp(
    authRepository: authRepository,
    medicineRepository: medicineRepository,
    reminderRepository: reminderRepository,
    storageService: storageService,
  ));
}

class MyApp extends StatefulWidget {
  final AuthRepository authRepository;
  final MedicineRepository medicineRepository;
  final ReminderRepository reminderRepository;
  final StorageService storageService;

  const MyApp({
    super.key,
    required this.authRepository,
    required this.medicineRepository,
    required this.reminderRepository,
    required this.storageService,
  });

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    _router = AppRouter.createRouter(widget.storageService);
  }

  @override
  Widget build(BuildContext context) {
    return MultiRepositoryProvider(
      providers: [
        RepositoryProvider.value(value: widget.authRepository),
        RepositoryProvider.value(value: widget.medicineRepository),
        RepositoryProvider.value(value: widget.reminderRepository),
      ],
      child: MultiBlocProvider(
        providers: [
          BlocProvider(
            create: (context) => AuthBloc(
              authRepository: RepositoryProvider.of<AuthRepository>(context),
              storageService: widget.storageService,
            )..add(AuthCheckRequested()),
          ),
          BlocProvider(
            create: (context) => MedicineBloc(
              medicineRepository: RepositoryProvider.of<MedicineRepository>(context),
            ),
          ),
          BlocProvider(
            create: (context) => ReminderBloc(
              reminderRepository: RepositoryProvider.of<ReminderRepository>(context),
            ),
          ),
        ],
        child: MaterialApp.router(
          title: '家庭药品管理',
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          themeMode: ThemeMode.light,
          routerConfig: _router,
          debugShowCheckedModeBanner: false,
        ),
      ),
    );
  }
}
