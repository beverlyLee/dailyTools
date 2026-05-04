import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../blocs/auth/auth_bloc.dart';
import '../../../blocs/auth/auth_event.dart';
import '../../../blocs/auth/auth_state.dart';
import '../../../models/user.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  User? _currentUser;

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is AuthAuthenticated) {
          setState(() {
            _currentUser = state.user;
          });
        }

        if (state is AuthUnauthenticated) {
          context.go('/login');
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('个人中心'),
          actions: [
            IconButton(
              icon: const Icon(Icons.settings),
              onPressed: () {
                _showSettingsDialog();
              },
            ),
          ],
        ),
        body: SingleChildScrollView(
          child: Column(
            children: [
              _buildUserHeader(),
              _buildQuickStats(),
              _buildMenuSection(),
              _buildBottomSection(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildUserHeader() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Theme.of(context).colorScheme.primary,
            Theme.of(context).colorScheme.primaryContainer,
          ],
        ),
      ),
      child: Column(
        children: [
          Stack(
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(40),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    _currentUser?.nickname?.substring(0, 1) ??
                        _currentUser?.username.substring(0, 1) ??
                        '用',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                ),
              ),
              Positioned(
                bottom: 0,
                right: 0,
                child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.secondary,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                  child: const Icon(
                    Icons.camera_alt,
                    size: 14,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            _currentUser?.nickname ?? _currentUser?.username ?? '用户',
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          if (_currentUser?.email != null) ...[
            const SizedBox(height: 4),
            Text(
              _currentUser!.email!,
              style: TextStyle(
                fontSize: 14,
                color: Colors.white.withOpacity(0.8),
              ),
            ),
          ],
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _buildUserStat('药品数', '12'),
              const SizedBox(width: 32),
              _buildUserStat('提醒数', '8'),
              const SizedBox(width: 32),
              _buildUserStat('收藏', '5'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildUserStat(String label, String value) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.white.withOpacity(0.8),
          ),
        ),
      ],
    );
  }

  Widget _buildQuickStats() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '快速统计',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _buildStatCard(
                      icon: Icons.warning,
                      label: '即将过期',
                      value: '3',
                      color: Colors.orange,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildStatCard(
                      icon: Icons.inventory_2,
                      label: '库存不足',
                      value: '2',
                      color: Colors.purple,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildStatCard(
                      icon: Icons.error,
                      label: '已过期',
                      value: '1',
                      color: Colors.red,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Icon(
            icon,
            color: color,
            size: 28,
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              color: color.withOpacity(0.7),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuSection() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '功能菜单',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Column(
              children: [
                _buildMenuItem(
                  icon: Icons.local_pharmacy,
                  title: '我的药品',
                  subtitle: '管理您的药品库存',
                  onTap: () {
                    context.go('/');
                  },
                ),
                const Divider(height: 1, indent: 16, endIndent: 16),
                _buildMenuItem(
                  icon: Icons.notifications,
                  title: '提醒管理',
                  subtitle: '设置用药和过期提醒',
                  onTap: () {
                    context.go('/reminders');
                  },
                ),
                const Divider(height: 1, indent: 16, endIndent: 16),
                _buildMenuItem(
                  icon: Icons.map,
                  title: '周边药店',
                  subtitle: '查找附近的药店和医院',
                  onTap: () {
                    context.go('/map');
                  },
                ),
                const Divider(height: 1, indent: 16, endIndent: 16),
                _buildMenuItem(
                  icon: Icons.favorite,
                  title: '收藏药品',
                  subtitle: '查看您收藏的药品',
                  onTap: () {
                    context.go('/');
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Text(
            '设置',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Column(
              children: [
                _buildMenuItem(
                  icon: Icons.person,
                  title: '个人信息',
                  subtitle: '编辑您的个人资料',
                  onTap: () {
                    _showEditProfileDialog();
                  },
                ),
                const Divider(height: 1, indent: 16, endIndent: 16),
                _buildMenuItem(
                  icon: Icons.notifications_active,
                  title: '通知设置',
                  subtitle: '管理推送通知',
                  onTap: () {
                    _showNotificationSettingsDialog();
                  },
                ),
                const Divider(height: 1, indent: 16, endIndent: 16),
                _buildMenuItem(
                  icon: Icons.palette,
                  title: '主题设置',
                  subtitle: '切换浅色/深色主题',
                  onTap: () {
                    _showThemeSettingsDialog();
                  },
                ),
                const Divider(height: 1, indent: 16, endIndent: 16),
                _buildMenuItem(
                  icon: Icons.help,
                  title: '帮助与反馈',
                  subtitle: '使用帮助和意见反馈',
                  onTap: () {
                    _showHelpDialog();
                  },
                ),
                const Divider(height: 1, indent: 16, endIndent: 16),
                _buildMenuItem(
                  icon: Icons.info,
                  title: '关于我们',
                  subtitle: '版本信息和隐私政策',
                  onTap: () {
                    _showAboutDialog();
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.primaryContainer,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(
          icon,
          color: Theme.of(context).colorScheme.primary,
        ),
      ),
      title: Text(
        title,
        style: const TextStyle(fontWeight: FontWeight.w500),
      ),
      subtitle: Text(
        subtitle,
        style: TextStyle(
          fontSize: 12,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
      ),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }

  Widget _buildBottomSection() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () {
                _showLogoutConfirmDialog();
              },
              icon: const Icon(Icons.logout),
              label: const Text('退出登录'),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                foregroundColor: Theme.of(context).colorScheme.error,
                side: BorderSide(
                  color: Theme.of(context).colorScheme.error.withOpacity(0.5),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            '家庭药品管理 v1.0.0',
            style: TextStyle(
              fontSize: 12,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }

  void _showLogoutConfirmDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('确认退出'),
          content: const Text('确定要退出登录吗？'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('取消'),
            ),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.error,
              ),
              onPressed: () {
                Navigator.pop(context);
                context.read<AuthBloc>().add(AuthLogoutRequested());
              },
              child: const Text('退出'),
            ),
          ],
        );
      },
    );
  }

  void _showSettingsDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('设置'),
          content: const Text('设置功能开发中...'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('关闭'),
            ),
          ],
        );
      },
    );
  }

  void _showEditProfileDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('编辑个人信息'),
          content: const Text('个人信息编辑功能开发中...'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('取消'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('保存'),
            ),
          ],
        );
      },
    );
  }

  void _showNotificationSettingsDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('通知设置'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SwitchListTile(
                title: const Text('用药提醒'),
                value: true,
                onChanged: (value) {},
              ),
              SwitchListTile(
                title: const Text('过期提醒'),
                value: true,
                onChanged: (value) {},
              ),
              SwitchListTile(
                title: const Text('库存提醒'),
                value: true,
                onChanged: (value) {},
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('关闭'),
            ),
          ],
        );
      },
    );
  }

  void _showThemeSettingsDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('主题设置'),
          content: const Text('主题切换功能开发中...'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('关闭'),
            ),
          ],
        );
      },
    );
  }

  void _showHelpDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('帮助与反馈'),
          content: const Text('帮助中心开发中...'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('关闭'),
            ),
          ],
        );
      },
    );
  }

  void _showAboutDialog() {
    showAboutDialog(
      context: context,
      applicationName: '家庭药品管理',
      applicationVersion: '1.0.0',
      applicationLegalese: '© 2024 家庭药品管理系统',
      children: [
        const SizedBox(height: 16),
        const Text('一款帮助您管理家庭药品的应用，支持药品入库、过期提醒、用药提醒等功能。'),
      ],
    );
  }
}
