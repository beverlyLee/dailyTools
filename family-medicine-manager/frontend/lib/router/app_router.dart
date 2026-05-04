import 'package:go_router/go_router.dart';
import 'package:flutter/material.dart';

import '../services/storage_service.dart';
import '../screens/home/home_screen.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/medicine/medicine_list_screen.dart';
import '../screens/medicine/medicine_detail_screen.dart';
import '../screens/medicine/add_medicine_screen.dart';
import '../screens/medicine/scan_barcode_screen.dart';
import '../screens/medicine/ocr_scan_screen.dart';
import '../screens/reminder/reminder_list_screen.dart';
import '../screens/reminder/add_reminder_screen.dart';
import '../screens/location/pharmacy_map_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/splash/splash_screen.dart';

class AppRouter {
  static GoRouter createRouter(StorageService storageService) {
    return GoRouter(
      initialLocation: '/splash',
      routes: [
        GoRoute(
          path: '/splash',
          builder: (context, state) => const SplashScreen(),
        ),
        GoRoute(
          path: '/login',
          builder: (context, state) => const LoginScreen(),
        ),
        GoRoute(
          path: '/register',
          builder: (context, state) => const RegisterScreen(),
        ),
        StatefulShellRoute.indexedStack(
          builder: (context, state, navigationShell) {
            return HomeScreen(navigationShell: navigationShell);
          },
          branches: [
            StatefulShellBranch(
              routes: [
                GoRoute(
                  path: '/',
                  builder: (context, state) => const MedicineListScreen(),
                  routes: [
                    GoRoute(
                      path: 'medicine/:id',
                      builder: (context, state) {
                        final id = state.pathParameters['id']!;
                        return MedicineDetailScreen(medicineId: id);
                      },
                    ),
                    GoRoute(
                      path: 'add-medicine',
                      builder: (context, state) => const AddMedicineScreen(),
                    ),
                    GoRoute(
                      path: 'scan-barcode',
                      builder: (context, state) => const ScanBarcodeScreen(),
                    ),
                    GoRoute(
                      path: 'ocr-scan',
                      builder: (context, state) => const OcrScanScreen(),
                    ),
                  ],
                ),
              ],
            ),
            StatefulShellBranch(
              routes: [
                GoRoute(
                  path: '/reminders',
                  builder: (context, state) => const ReminderListScreen(),
                  routes: [
                    GoRoute(
                      path: 'add',
                      builder: (context, state) => const AddReminderScreen(),
                    ),
                  ],
                ),
              ],
            ),
            StatefulShellBranch(
              routes: [
                GoRoute(
                  path: '/map',
                  builder: (context, state) => const PharmacyMapScreen(),
                ),
              ],
            ),
            StatefulShellBranch(
              routes: [
                GoRoute(
                  path: '/profile',
                  builder: (context, state) => const ProfileScreen(),
                ),
              ],
            ),
          ],
        ),
      ],
      redirect: (context, state) async {
        final location = state.matchedLocation;
        final isAuthenticated = await storageService.getToken() != null;
        
        final publicRoutes = ['/login', '/register', '/splash'];
        final isPublicRoute = publicRoutes.contains(location);
        
        if (!isAuthenticated && !isPublicRoute) {
          return '/login';
        }
        
        if (isAuthenticated && (location == '/login' || location == '/register' || location == '/splash')) {
          return '/';
        }
        
        return null;
      },
    );
  }
}
