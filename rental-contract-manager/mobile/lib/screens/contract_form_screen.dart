import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:rental_contract_manager/models/property.dart';
import 'package:rental_contract_manager/models/tenant.dart';
import 'package:rental_contract_manager/models/rental_contract.dart';
import 'package:rental_contract_manager/providers/contract_provider.dart';
import 'package:rental_contract_manager/constants/app_constants.dart';

class ContractFormScreen extends StatefulWidget {
  final RentalContract? existingContract;

  const ContractFormScreen({
    super.key,
    this.existingContract,
  });

  @override
  State<ContractFormScreen> createState() => _ContractFormScreenState();
}

class _ContractFormScreenState extends State<ContractFormScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  bool _isSaving = false;

  Property? _selectedProperty;
  Tenant? _selectedTenant;
  DateTime? _startDate;
  DateTime? _endDate;
  final _monthlyRentController = TextEditingController();
  final _depositController = TextEditingController();
  String _paymentMethod = 'monthly';
  int _paymentDay = 1;
  bool _utilitiesIncluded = false;
  final _waterPriceController = TextEditingController();
  final _electricityPriceController = TextEditingController();
  final _gasPriceController = TextEditingController();
  final _termsController = TextEditingController();
  final _notesController = TextEditingController();

  List<Property> _properties = [];
  List<Tenant> _tenants = [];

  bool get isEditMode => widget.existingContract != null;

  @override
  void initState() {
    super.initState();
    _loadData();
    _initExistingContract();
  }

  @override
  void dispose() {
    _monthlyRentController.dispose();
    _depositController.dispose();
    _waterPriceController.dispose();
    _electricityPriceController.dispose();
    _gasPriceController.dispose();
    _termsController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final contractProvider =
          Provider.of<ContractProvider>(context, listen: false);
      await contractProvider.fetchProperties();
      await contractProvider.fetchTenants();

      setState(() {
        _properties = contractProvider.properties;
        _tenants = contractProvider.tenants;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('加载数据失败: $e')),
        );
      }
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _initExistingContract() {
    final contract = widget.existingContract;
    if (contract == null) return;

    _monthlyRentController.text = contract.monthlyRent.toString();
    _depositController.text = contract.deposit.toString();
    _startDate = contract.startDate;
    _endDate = contract.endDate;
    _paymentMethod = contract.paymentMethod;
    _paymentDay = contract.paymentDay;
    _utilitiesIncluded = contract.utilitiesIncluded;
    _waterPriceController.text = contract.waterPrice.toString();
    _electricityPriceController.text = contract.electricityPrice.toString();
    if (contract.gasPrice != null) {
      _gasPriceController.text = contract.gasPrice!.toString();
    }
    _termsController.text = contract.terms ?? '';
    _notesController.text = contract.notes ?? '';

    if (contract.property != null) {
      _selectedProperty = contract.property;
    }
    if (contract.tenant != null) {
      _selectedTenant = contract.tenant;
    }
  }

  Future<void> _selectStartDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _startDate ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
      locale: const Locale('zh', 'CN'),
    );

    if (picked != null) {
      setState(() {
        _startDate = picked;
      });
    }
  }

  Future<void> _selectEndDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _endDate ?? _startDate ?? DateTime.now().add(const Duration(days: 365)),
      firstDate: _startDate ?? DateTime(2020),
      lastDate: DateTime(2035),
      locale: const Locale('zh', 'CN'),
    );

    if (picked != null) {
      setState(() {
        _endDate = picked;
      });
    }
  }

  Future<void> _saveContract() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedProperty == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('请选择房屋')),
      );
      return;
    }
    if (_startDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('请选择开始日期')),
      );
      return;
    }
    if (_endDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('请选择结束日期')),
      );
      return;
    }

    setState(() {
      _isSaving = true;
    });

    try {
      final contractProvider =
          Provider.of<ContractProvider>(context, listen: false);

      final data = {
        'property_id': _selectedProperty!.id,
        if (_selectedTenant != null) 'tenant_id': _selectedTenant!.id,
        'start_date': DateFormat('yyyy-MM-dd').format(_startDate!),
        'end_date': DateFormat('yyyy-MM-dd').format(_endDate!),
        'monthly_rent': double.tryParse(_monthlyRentController.text) ?? 0,
        'deposit': double.tryParse(_depositController.text) ?? 0,
        'payment_method': _paymentMethod,
        'payment_day': _paymentDay,
        'utilities_included': _utilitiesIncluded,
        'water_price': double.tryParse(_waterPriceController.text) ?? 0,
        'electricity_price':
            double.tryParse(_electricityPriceController.text) ?? 0,
        if (_gasPriceController.text.isNotEmpty)
          'gas_price': double.tryParse(_gasPriceController.text),
        if (_termsController.text.isNotEmpty) 'terms': _termsController.text,
        if (_notesController.text.isNotEmpty) 'notes': _notesController.text,
      };

      if (isEditMode) {
        await contractProvider.updateContract(
          widget.existingContract!.id,
          data,
        );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('合同更新成功')),
          );
        }
      } else {
        await contractProvider.createContract(data);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('合同创建成功')),
          );
        }
      }

      if (mounted) {
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('保存失败: $e')),
        );
      }
    } finally {
      setState(() {
        _isSaving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(isEditMode ? '编辑合同' : '新建合同'),
        actions: [
          TextButton.icon(
            onPressed: _isSaving ? null : _saveContract,
            icon: const Icon(Icons.save),
            label: const Text('保存'),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _buildForm(),
    );
  }

  Widget _buildForm() {
    return Form(
      key: _formKey,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionTitle('基本信息'),
            const SizedBox(height: 12),
            _buildPropertyDropdown(),
            const SizedBox(height: 16),
            _buildTenantDropdown(),
            const SizedBox(height: 24),
            _buildSectionTitle('租期信息'),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildDateField(
                    label: '开始日期',
                    value: _startDate,
                    onTap: _selectStartDate,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildDateField(
                    label: '结束日期',
                    value: _endDate,
                    onTap: _selectEndDate,
                  ),
                ),
              ],
            ),
            if (_startDate != null && _endDate != null) ...[
              const SizedBox(height: 12),
              Text(
                '租期: ${_calculateContractDuration()}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.primary,
                    ),
              ),
            ],
            const SizedBox(height: 24),
            _buildSectionTitle('费用信息'),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildNumberField(
                    controller: _monthlyRentController,
                    label: '月租金 (元)',
                    prefixIcon: Icons.attach_money,
                    required: true,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildNumberField(
                    controller: _depositController,
                    label: '押金 (元)',
                    prefixIcon: Icons.lock,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _buildPaymentMethodSelector(),
            const SizedBox(height: 16),
            _buildPaymentDaySelector(),
            const SizedBox(height: 24),
            _buildSectionTitle('水电燃气设置'),
            const SizedBox(height: 12),
            SwitchListTile.adaptive(
              title: const Text('水电燃气包含在租金内'),
              value: _utilitiesIncluded,
              onChanged: (value) {
                setState(() {
                  _utilitiesIncluded = value;
                });
              },
              contentPadding: EdgeInsets.zero,
            ),
            if (!_utilitiesIncluded) ...[
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _buildNumberField(
                      controller: _waterPriceController,
                      label: '水费单价 (元/吨)',
                      prefixIcon: Icons.water_drop_outlined,
                      initialValue: '5.0',
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _buildNumberField(
                      controller: _electricityPriceController,
                      label: '电费单价 (元/度)',
                      prefixIcon: Icons.electrical_services_outlined,
                      initialValue: '0.8',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _buildNumberField(
                controller: _gasPriceController,
                label: '燃气费单价 (元/立方米)',
                prefixIcon: Icons.local_fire_department_outlined,
              ),
            ],
            const SizedBox(height: 24),
            _buildSectionTitle('其他信息'),
            const SizedBox(height: 12),
            _buildTextField(
              controller: _termsController,
              label: '合同条款',
              maxLines: 4,
            ),
            const SizedBox(height: 16),
            _buildTextField(
              controller: _notesController,
              label: '备注',
              maxLines: 3,
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isSaving ? null : _saveContract,
                icon: _isSaving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.save),
                label: Text(_isSaving ? '保存中...' : '保存合同'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
    );
  }

  Widget _buildPropertyDropdown() {
    return DropdownButtonFormField<Property>(
      decoration: const InputDecoration(
        labelText: '选择房屋',
        prefixIcon: Icon(Icons.home_outlined),
        border: OutlineInputBorder(),
      ),
      value: _selectedProperty,
      items: _properties.map((property) {
        return DropdownMenuItem(
          value: property,
          child: Text(property.displayText),
        );
      }).toList(),
      onChanged: (value) {
        setState(() {
          _selectedProperty = value;
        });
      },
      validator: (value) {
        if (value == null) {
          return '请选择房屋';
        }
        return null;
      },
    );
  }

  Widget _buildTenantDropdown() {
    return DropdownButtonFormField<Tenant>(
      decoration: const InputDecoration(
        labelText: '选择房客（可选）',
        prefixIcon: Icon(Icons.person_outlined),
        border: OutlineInputBorder(),
      ),
      value: _selectedTenant,
      items: [
        const DropdownMenuItem(
          value: null,
          child: Text('暂不选择'),
        ),
        ..._tenants.map((tenant) {
          return DropdownMenuItem(
            value: tenant,
            child: Text('${tenant.name} - ${tenant.maskedPhone}'),
          );
        }),
      ],
      onChanged: (value) {
        setState(() {
          _selectedTenant = value;
        });
      },
    );
  }

  Widget _buildDateField({
    required String label,
    required DateTime? value,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: const Icon(Icons.calendar_today_outlined),
          suffixIcon: const Icon(Icons.chevron_right),
          border: const OutlineInputBorder(),
        ),
        child: Text(
          value != null
              ? DateFormat('yyyy-MM-dd').format(value)
              : '请选择日期',
          style: TextStyle(
            color: value != null
                ? Theme.of(context).textTheme.bodyLarge?.color
                : Theme.of(context).textTheme.bodySmall?.color,
          ),
        ),
      ),
    );
  }

  Widget _buildNumberField({
    required TextEditingController controller,
    required String label,
    required IconData prefixIcon,
    bool required = false,
    String? initialValue,
  }) {
    return TextFormField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(prefixIcon),
        border: const OutlineInputBorder(),
      ),
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      inputFormatters: [
        FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d*$')),
      ],
      validator: (value) {
        if (required && (value == null || value.isEmpty)) {
          return '请输入$label';
        }
        if (value != null && value.isNotEmpty) {
          final num = double.tryParse(value);
          if (num == null) {
            return '请输入有效的数字';
          }
        }
        return null;
      },
    );
  }

  Widget _buildPaymentMethodSelector() {
    final methods = [
      {'value': 'monthly', 'label': '月付'},
      {'value': 'quarterly', 'label': '季付'},
      {'value': 'semi_annual', 'label': '半年付'},
      {'value': 'annual', 'label': '年付'},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '支付方式',
          style: Theme.of(context).textTheme.labelLarge,
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: methods.map((method) {
            final isSelected = _paymentMethod == method['value'];
            return ChoiceChip(
              label: Text(method['label']!),
              selected: isSelected,
              onSelected: (selected) {
                if (selected) {
                  setState(() {
                    _paymentMethod = method['value']!;
                  });
                }
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildPaymentDaySelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '每月付款日',
          style: Theme.of(context).textTheme.labelLarge,
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [1, 5, 10, 15, 20, 25, 28].map((day) {
            return ChoiceChip(
              label: Text('$day 日'),
              selected: _paymentDay == day,
              onSelected: (selected) {
                if (selected) {
                  setState(() {
                    _paymentDay = day;
                  });
                }
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    int maxLines = 1,
  }) {
    return TextFormField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
        alignLabelWithHint: maxLines > 1,
      ),
      maxLines: maxLines,
    );
  }

  String _calculateContractDuration() {
    if (_startDate == null || _endDate == null) return '';

    final duration = _endDate!.difference(_startDate!);
    final days = duration.inDays;
    final years = days ~/ 365;
    final months = (days % 365) ~/ 30;

    if (years > 0 && months > 0) {
      return '$years年$months个月';
    } else if (years > 0) {
      return '$years年';
    } else if (months > 0) {
      return '$months个月';
    } else {
      return '$days天';
    }
  }
}
