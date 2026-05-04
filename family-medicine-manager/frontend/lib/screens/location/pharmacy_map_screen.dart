import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

class PharmacyMapScreen extends StatefulWidget {
  const PharmacyMapScreen({super.key});

  @override
  State<PharmacyMapScreen> createState() => _PharmacyMapScreenState();
}

class _PharmacyMapScreenState extends State<PharmacyMapScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _selectedCategory = 'pharmacy';
  bool _isSearching = false;

  final List<Map<String, dynamic>> _mockPOIs = [
    {
      'id': '1',
      'name': '康泰大药房',
      'address': '北京市朝阳区建国路88号',
      'distance': '0.5km',
      'phone': '010-12345678',
      'hours': '08:00-22:00',
      'type': 'pharmacy',
      'rating': 4.5,
      'isOpen': true,
    },
    {
      'id': '2',
      'name': '北京协和医院',
      'address': '北京市东城区帅府园1号',
      'distance': '2.3km',
      'phone': '010-69156114',
      'hours': '24小时',
      'type': 'hospital',
      'rating': 4.8,
      'isOpen': true,
    },
    {
      'id': '3',
      'name': '同仁堂药店',
      'address': '北京市朝阳区光华路2号',
      'distance': '1.2km',
      'phone': '010-87654321',
      'hours': '09:00-21:00',
      'type': 'pharmacy',
      'rating': 4.3,
      'isOpen': true,
    },
    {
      'id': '4',
      'name': '朝阳医院',
      'address': '北京市朝阳区工人体育场南路8号',
      'distance': '3.1km',
      'phone': '010-85231000',
      'hours': '24小时',
      'type': 'hospital',
      'rating': 4.6,
      'isOpen': true,
    },
    {
      'id': '5',
      'name': '金象大药房',
      'address': '北京市朝阳区建国路93号',
      'distance': '0.8km',
      'phone': '010-11112222',
      'hours': '08:00-24:00',
      'type': 'pharmacy',
      'rating': 4.2,
      'isOpen': false,
    },
  ];

  List<Map<String, dynamic>> get _filteredPOIs {
    return _mockPOIs.where((poi) {
      final matchesCategory = poi['type'] == _selectedCategory || _selectedCategory == 'all';
      final matchesSearch = _searchController.text.isEmpty ||
          poi['name'].toString().toLowerCase().contains(_searchController.text.toLowerCase()) ||
          poi['address'].toString().toLowerCase().contains(_searchController.text.toLowerCase());
      return matchesCategory && matchesSearch;
    }).toList();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('周边药店'),
        actions: [
          IconButton(
            icon: const Icon(Icons.my_location),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('正在获取当前位置...')),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          _buildSearchBar(),
          _buildCategoryTabs(),
          Expanded(
            child: _buildMapPlaceholder(),
          ),
          _buildPOIList(),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: '搜索药店、医院...',
          prefixIcon: const Icon(Icons.search),
          suffixIcon: _searchController.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    setState(() {
                      _searchController.clear();
                    });
                  },
                )
              : null,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          filled: true,
          fillColor: Theme.of(context).colorScheme.surfaceContainer,
        ),
        onChanged: (value) {
          setState(() {});
        },
        onSubmitted: (value) {
          setState(() {
            _isSearching = true;
          });
          Future.delayed(const Duration(seconds: 1), () {
            if (mounted) {
              setState(() {
                _isSearching = false;
              });
            }
          });
        },
      ),
    );
  }

  Widget _buildCategoryTabs() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _buildCategoryChip('all', '全部', Icons.list),
            const SizedBox(width: 8),
            _buildCategoryChip('pharmacy', '药店', Icons.local_pharmacy),
            const SizedBox(width: 8),
            _buildCategoryChip('hospital', '医院', Icons.local_hospital),
            const SizedBox(width: 8),
            _buildCategoryChip('clinic', '诊所', Icons.medical_services),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryChip(String category, String label, IconData icon) {
    final isSelected = _selectedCategory == category;
    return FilterChip(
      selected: isSelected,
      label: Text(label),
      avatar: Icon(
        icon,
        size: 18,
        color: isSelected ? Colors.white : null,
      ),
      onSelected: (selected) {
        if (selected) {
          setState(() {
            _selectedCategory = category;
          });
        }
      },
    );
  }

  Widget _buildMapPlaceholder() {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainer,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Theme.of(context).colorScheme.outline,
        ),
      ),
      child: Stack(
        children: [
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.map,
                  size: 48,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                const SizedBox(height: 12),
                Text(
                  '地图功能',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 4),
                Text(
                  '集成高德地图后可显示真实地图',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
              ],
            ),
          ),
          Positioned(
            top: 8,
            right: 8,
            child: FloatingActionButton(
              mini: true,
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('定位功能')),
                );
              },
              child: const Icon(Icons.my_location),
            ),
          ),
          ..._filteredPOIs.take(3).map((poi) {
            final index = _filteredPOIs.indexOf(poi);
            final x = 50 + (index * 80) % 200;
            final y = 50 + (index * 60) % 150;
            return Positioned(
              left: x.toDouble(),
              top: y.toDouble(),
              child: GestureDetector(
                onTap: () {
                  _showPOIDetails(poi);
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primary,
                    borderRadius: BorderRadius.circular(8),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.2),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        poi['type'] == 'hospital'
                            ? Icons.local_hospital
                            : Icons.local_pharmacy,
                        size: 16,
                        color: Colors.white,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        poi['name'].toString().length > 6
                            ? '${poi['name'].toString().substring(0, 6)}...'
                            : poi['name'].toString(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildPOIList() {
    return Container(
      height: 200,
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Text(
                  '附近 ${_filteredPOIs.length} 个地点',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const Spacer(),
                TextButton(
                  onPressed: () {
                    _showFullList();
                  },
                  child: const Text('查看全部'),
                ),
              ],
            ),
          ),
          Expanded(
            child: _isSearching
                ? const Center(child: CircularProgressIndicator())
                : _filteredPOIs.isEmpty
                    ? Center(
                        child: Text(
                          '未找到相关地点',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                              ),
                        ),
                      )
                    : ListView.builder(
                        itemCount: _filteredPOIs.length,
                        itemBuilder: (context, index) {
                          final poi = _filteredPOIs[index];
                          return _buildPOICard(poi);
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildPOICard(Map<String, dynamic> poi) {
    return ListTile(
      leading: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.primaryContainer,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(
          poi['type'] == 'hospital'
              ? Icons.local_hospital
              : Icons.local_pharmacy,
          color: Theme.of(context).colorScheme.primary,
        ),
      ),
      title: Row(
        children: [
          Expanded(
            child: Text(
              poi['name'],
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: poi['isOpen']
                  ? Colors.green.withOpacity(0.1)
                  : Colors.grey.withOpacity(0.1),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              poi['isOpen'] ? '营业中' : '已打烊',
              style: TextStyle(
                fontSize: 11,
                color: poi['isOpen'] ? Colors.green : Colors.grey,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 4),
          Row(
            children: [
              Icon(
                Icons.location_on,
                size: 14,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  poi['address'],
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Icon(
                Icons.star,
                size: 14,
                color: Colors.orange,
              ),
              const SizedBox(width: 4),
              Text(
                poi['rating'].toString(),
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(width: 16),
              Icon(
                Icons.directions_walk,
                size: 14,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              const SizedBox(width: 4),
              Text(
                poi['distance'],
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(width: 16),
              Icon(
                Icons.schedule,
                size: 14,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              const SizedBox(width: 4),
              Text(
                poi['hours'],
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ],
      ),
      trailing: const Icon(Icons.chevron_right),
      onTap: () {
        _showPOIDetails(poi);
      },
    );
  }

  void _showPOIDetails(Map<String, dynamic> poi) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Container(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primaryContainer,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Icon(
                        poi['type'] == 'hospital'
                            ? Icons.local_hospital
                            : Icons.local_pharmacy,
                        size: 32,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            poi['name'],
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Icon(
                                Icons.star,
                                size: 16,
                                color: Colors.orange,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                poi['rating'].toString(),
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                              const SizedBox(width: 12),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: poi['isOpen']
                                      ? Colors.green.withOpacity(0.1)
                                      : Colors.grey.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  poi['isOpen'] ? '营业中' : '已打烊',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: poi['isOpen'] ? Colors.green : Colors.grey,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                _buildDetailRow(
                  icon: Icons.location_on,
                  label: '地址',
                  value: poi['address'],
                ),
                const SizedBox(height: 16),
                _buildDetailRow(
                  icon: Icons.phone,
                  label: '电话',
                  value: poi['phone'],
                  isPhone: true,
                ),
                const SizedBox(height: 16),
                _buildDetailRow(
                  icon: Icons.schedule,
                  label: '营业时间',
                  value: poi['hours'],
                ),
                const SizedBox(height: 16),
                _buildDetailRow(
                  icon: Icons.directions_walk,
                  label: '距离',
                  value: poi['distance'],
                ),
                const SizedBox(height: 32),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          Navigator.pop(context);
                        },
                        icon: const Icon(Icons.phone),
                        label: const Text('拨打电话'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: () {
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('正在导航到 ${poi['name']}')),
                          );
                        },
                        icon: const Icon(Icons.directions),
                        label: const Text('导航'),
                        style: FilledButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildDetailRow({
    required IconData icon,
    required String label,
    required String value,
    bool isPhone = false,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          icon,
          size: 20,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 2),
            Text(
              value,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: isPhone ? Theme.of(context).colorScheme.primary : null,
                  ),
            ),
          ],
        ),
      ],
    );
  }

  void _showFullList() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.8,
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Center(
                        child: Container(
                          width: 40,
                          height: 4,
                          decoration: BoxDecoration(
                            color: Colors.grey[300],
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        '附近地点',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                    ],
                  ),
                ),
                const Divider(),
                Expanded(
                  child: ListView.builder(
                    itemCount: _filteredPOIs.length,
                    itemBuilder: (context, index) {
                      final poi = _filteredPOIs[index];
                      return _buildPOICard(poi);
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
