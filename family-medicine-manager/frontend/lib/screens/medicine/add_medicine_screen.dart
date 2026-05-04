import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';

import '../../../blocs/medicine/medicine_bloc.dart';
import '../../../blocs/medicine/medicine_event.dart';
import '../../../blocs/medicine/medicine_state.dart';
import '../../../models/medicine.dart';

class AddMedicineScreen extends StatefulWidget {
  final String? editId;

  const AddMedicineScreen({
    super.key,
    this.editId,
  });

  @override
  State<AddMedicineScreen> createState() => _AddMedicineScreenState();
}

class _AddMedicineScreenState extends State<AddMedicineScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;

  final _nameController = TextEditingController();
  final _genericNameController = TextEditingController();
  final _brandController = TextEditingController();
  final _barcodeController = TextEditingController();
  final _dosageFormController = TextEditingController();
  final _strengthController = TextEditingController();
  final _quantityController = TextEditingController(text: '1');
  final _unitController = TextEditingController(text: '盒');
  final _batchNumberController = TextEditingController();
  final _usageInstructionsController = TextEditingController();
  final _indicationsController = TextEditingController();
  final _contraindicationsController = TextEditingController();
  final _sideEffectsController = TextEditingController();
  final _notesController = TextEditingController();
  final _purchaseLocationController = TextEditingController();
  final _purchasePriceController = TextEditingController();
  final _prescribingDoctorController = TextEditingController();
  final _prescriptionNumberController = TextEditingController();

  DateTime? _expiryDate;
  DateTime? _productionDate;
  DateTime? _purchaseDate;
  StorageCondition _storageCondition = StorageCondition.roomTemp;
  bool _isPrescription = false;
  bool _isEditMode = false;

  @override
  void initState() {
    super.initState();
    _isEditMode = widget.editId != null;
    if (_isEditMode) {
      _loadMedicineForEdit();
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _genericNameController.dispose();
    _brandController.dispose();
    _barcodeController.dispose();
    _dosageFormController.dispose();
    _strengthController.dispose();
    _quantityController.dispose();
    _unitController.dispose();
    _batchNumberController.dispose();
    _usageInstructionsController.dispose();
    _indicationsController.dispose();
    _contraindicationsController.dispose();
    _sideEffectsController.dispose();
    _notesController.dispose();
    _purchaseLocationController.dispose();
    _purchasePriceController.dispose();
    _prescribingDoctorController.dispose();
    _prescriptionNumberController.dispose();
    super.dispose();
  }

  void _loadMedicineForEdit() {
    context.read<MedicineBloc>().add(MedicineLoad(widget.editId!));
  }

  void _fillFormWithMedicine(Medicine medicine) {
    _nameController.text = medicine.name;
    if (medicine.genericName != null) {
      _genericNameController.text = medicine.genericName!;
    }
    if (medicine.brand != null) {
      _brandController.text = medicine.brand!;
    }
    if (medicine.barcode != null) {
      _barcodeController.text = medicine.barcode!;
    }
    if (medicine.dosageForm != null) {
      _dosageFormController.text = medicine.dosageForm!;
    }
    if (medicine.strength != null) {
      _strengthController.text = medicine.strength!;
    }
    _quantityController.text = medicine.quantity.toString();
    _unitController.text = medicine.unit;
    if (medicine.batchNumber != null) {
      _batchNumberController.text = medicine.batchNumber!;
    }
    if (medicine.usageInstructions != null) {
      _usageInstructionsController.text = medicine.usageInstructions!;
    }
    if (medicine.indications != null) {
      _indicationsController.text = medicine.indications!;
    }
    if (medicine.contraindications != null) {
      _contraindicationsController.text = medicine.contraindications!;
    }
    if (medicine.sideEffects != null) {
      _sideEffectsController.text = medicine.sideEffects!;
    }
    if (medicine.notes != null) {
      _notesController.text = medicine.notes!;
    }
    if (medicine.purchaseLocation != null) {
      _purchaseLocationController.text = medicine.purchaseLocation!;
    }
    if (medicine.purchasePrice != null) {
      _purchasePriceController.text = medicine.purchasePrice!.toString();
    }
    if (medicine.prescribingDoctor != null) {
      _prescribingDoctorController.text = medicine.prescribingDoctor!;
    }
    if (medicine.prescriptionNumber != null) {
      _prescriptionNumberController.text = medicine.prescriptionNumber!;
    }

    setState(() {
      _expiryDate = medicine.expiryDate;
      _productionDate = medicine.productionDate;
      _purchaseDate = medicine.purchaseDate;
      _storageCondition = medicine.storageCondition;
      _isPrescription = medicine.isPrescription;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditMode ? '编辑药品' : '添加药品'),
        actions: [
          TextButton(
            onPressed: _isLoading ? null : _submitForm,
            child: const Text('保存'),
          ),
        ],
      ),
      body: BlocConsumer<MedicineBloc, MedicineState>(
        listener: (context, state) {
          if (state is MedicineLoading) {
            setState(() {
              _isLoading = true;
            });
          } else {
            setState(() {
              _isLoading = false;
            });
          }

          if (state is MedicineDetailLoaded && _isEditMode) {
            _fillFormWithMedicine(state.medicine);
          }

          if (state is MedicineCreated || state is MedicineUpdated) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(_isEditMode ? '药品已更新' : '药品已添加'),
              ),
            );
            context.pop();
          }

          if (state is MedicineError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: Theme.of(context).colorScheme.error,
              ),
            );
          }
        },
        builder: (context, state) {
          if (_isEditMode && state is! MedicineDetailLoaded && state is! MedicineLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          return Form(
            key: _formKey,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildSectionHeader('基本信息'),
                const SizedBox(height: 12),
                _buildTextField(
                  controller: _nameController,
                  label: '药品名称 *',
                  icon: Icons.local_pharmacy,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return '请输入药品名称';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                _buildTextField(
                  controller: _genericNameController,
                  label: '通用名',
                  icon: Icons.science,
                ),
                const SizedBox(height: 12),
                _buildTextField(
                  controller: _brandController,
                  label: '品牌',
                  icon: Icons.label,
                ),
                const SizedBox(height: 12),
                _buildTextField(
                  controller: _barcodeController,
                  label: '条形码',
                  icon: Icons.confirmation_num,
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.qr_code_scanner),
                    onPressed: () {
                      context.go('/scan-barcode');
                    },
                  ),
                ),
                const SizedBox(height: 16),
                _buildSectionHeader('规格信息'),
                const SizedBox(height: 12),
                _buildTextField(
                  controller: _dosageFormController,
                  label: '剂型',
                  icon: Icons.medication,
                  hintText: '如：片剂、胶囊、颗粒剂等',
                ),
                const SizedBox(height: 12),
                _buildTextField(
                  controller: _strengthController,
                  label: '规格',
                  icon: Icons.scale,
                  hintText: '如：500mg/片',
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _buildTextField(
                        controller: _quantityController,
                        label: '数量',
                        icon: Icons.format_list_numbered,
                        keyboardType: TextInputType.number,
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return '请输入数量';
                          }
                          final numValue = double.tryParse(value);
                          if (numValue == null || numValue <= 0) {
                            return '请输入有效的数量';
                          }
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildTextField(
                        controller: _unitController,
                        label: '单位',
                        icon: Icons.balance,
                        hintText: '盒、瓶、片等',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _buildSectionHeader('日期信息'),
                const SizedBox(height: 12),
                _buildDatePicker(
                  label: '有效期至',
                  icon: Icons.calendar_today,
                  date: _expiryDate,
                  onTap: () => _selectDate((date) {
                    setState(() {
                      _expiryDate = date;
                    });
                  }),
                  isRequired: true,
                ),
                const SizedBox(height: 12),
                _buildDatePicker(
                  label: '生产日期',
                  icon: Icons.factory,
                  date: _productionDate,
                  onTap: () => _selectDate((date) {
                    setState(() {
                      _productionDate = date;
                    });
                  }),
                ),
                const SizedBox(height: 12),
                _buildDatePicker(
                  label: '购买日期',
                  icon: Icons.shopping_cart,
                  date: _purchaseDate,
                  onTap: () => _selectDate((date) {
                    setState(() {
                      _purchaseDate = date;
                    });
                  }),
                ),
                const SizedBox(height: 12),
                _buildTextField(
                  controller: _batchNumberController,
                  label: '批号',
                  icon: Icons.tag,
                ),
                const SizedBox(height: 16),
                _buildSectionHeader('存储与处方'),
                const SizedBox(height: 12),
                _buildStorageConditionSelector(),
                const SizedBox(height: 12),
                SwitchListTile(
                  title: const Text('处方药'),
                  subtitle: const Text('是否需要医生处方'),
                  secondary: const Icon(Icons.prescription),
                  value: _isPrescription,
                  onChanged: (value) {
                    setState(() {
                      _isPrescription = value;
                    });
                  },
                ),
                if (_isPrescription) ...[
                  const SizedBox(height: 12),
                  _buildTextField(
                    controller: _prescribingDoctorController,
                    label: '开方医生',
                    icon: Icons.person,
                  ),
                  const SizedBox(height: 12),
                  _buildTextField(
                    controller: _prescriptionNumberController,
                    label: '处方编号',
                    icon: Icons.receipt,
                  ),
                ],
                const SizedBox(height: 16),
                _buildSectionHeader('使用说明'),
                const SizedBox(height: 12),
                _buildTextField(
                  controller: _usageInstructionsController,
                  label: '用法用量',
                  icon: Icons.list_alt,
                  maxLines: 3,
                  hintText: '例如：口服，一次1片，一日3次',
                ),
                const SizedBox(height: 12),
                _buildTextField(
                  controller: _indicationsController,
                  label: '适应症',
                  icon: Icons.local_hospital,
                  maxLines: 2,
                ),
                const SizedBox(height: 12),
                _buildTextField(
                  controller: _contraindicationsController,
                  label: '禁忌症',
                  icon: Icons.cancel,
                  maxLines: 2,
                ),
                const SizedBox(height: 12),
                _buildTextField(
                  controller: _sideEffectsController,
                  label: '副作用',
                  icon: Icons.warning,
                  maxLines: 2,
                ),
                const SizedBox(height: 16),
                _buildSectionHeader('购买信息'),
                const SizedBox(height: 12),
                _buildTextField(
                  controller: _purchaseLocationController,
                  label: '购买地点',
                  icon: Icons.location_on,
                ),
                const SizedBox(height: 12),
                _buildTextField(
                  controller: _purchasePriceController,
                  label: '购买价格',
                  icon: Icons.attach_money,
                  keyboardType: TextInputType.number,
                  hintText: '元',
                ),
                const SizedBox(height: 16),
                _buildSectionHeader('备注'),
                const SizedBox(height: 12),
                _buildTextField(
                  controller: _notesController,
                  label: '备注',
                  icon: Icons.note,
                  maxLines: 3,
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: _isLoading ? null : _submitForm,
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Text(
                            _isEditMode ? '保存修改' : '添加药品',
                            style: const TextStyle(fontSize: 16),
                          ),
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w600,
            color: Theme.of(context).colorScheme.primary,
          ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    String? hintText,
    int maxLines = 1,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
    Widget? suffixIcon,
  }) {
    return TextFormField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        hintText: hintText,
        prefixIcon: Icon(icon),
        suffixIcon: suffixIcon,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        alignLabelWithHint: maxLines > 1,
      ),
      maxLines: maxLines,
      keyboardType: keyboardType,
      validator: validator,
      enabled: !_isLoading,
    );
  }

  Widget _buildDatePicker({
    required String label,
    required IconData icon,
    required DateTime? date,
    required VoidCallback onTap,
    bool isRequired = false,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon),
          suffixIcon: const Icon(Icons.calendar_today),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: Row(
          children: [
            Text(
              date != null
                  ? DateFormat('yyyy-MM-dd').format(date)
                  : (isRequired ? '请选择日期' : '选择日期'),
              style: TextStyle(
                color: date != null
                    ? Theme.of(context).textTheme.bodyLarge?.color
                    : Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStorageConditionSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '存储条件',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: StorageCondition.values.map((condition) {
            final isSelected = _storageCondition == condition;
            return FilterChip(
              selected: isSelected,
              label: Text(_getStorageConditionText(condition)),
              avatar: Icon(
                _getStorageConditionIcon(condition),
                size: 18,
                color: isSelected ? Colors.white : null,
              ),
              onSelected: (selected) {
                if (selected) {
                  setState(() {
                    _storageCondition = condition;
                  });
                }
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  String _getStorageConditionText(StorageCondition condition) {
    switch (condition) {
      case StorageCondition.roomTemp:
        return '常温';
      case StorageCondition.refrigerated:
        return '冷藏';
      case StorageCondition.frozen:
        return '冷冻';
      case StorageCondition.dark:
        return '避光';
    }
  }

  IconData _getStorageConditionIcon(StorageCondition condition) {
    switch (condition) {
      case StorageCondition.roomTemp:
        return Icons.thermostat;
      case StorageCondition.refrigerated:
        return Icons.ac_unit;
      case StorageCondition.frozen:
        return Icons.ac_unit;
      case StorageCondition.dark:
        return Icons.brightness_3;
    }
  }

  Future<void> _selectDate(Function(DateTime) onDateSelected) async {
    final initialDate = DateTime.now();
    final firstDate = DateTime(2000);
    final lastDate = DateTime(2030);

    final selectedDate = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: firstDate,
      lastDate: lastDate,
    );

    if (selectedDate != null) {
      onDateSelected(selectedDate);
    }
  }

  void _submitForm() {
    if (_formKey.currentState?.validate() ?? false) {
      if (_expiryDate == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('请选择有效期'),
            backgroundColor: Colors.orange,
          ),
        );
        return;
      }

      final data = <String, dynamic>{
        'name': _nameController.text.trim(),
        if (_genericNameController.text.isNotEmpty)
          'genericName': _genericNameController.text.trim(),
        if (_brandController.text.isNotEmpty)
          'brand': _brandController.text.trim(),
        if (_barcodeController.text.isNotEmpty)
          'barcode': _barcodeController.text.trim(),
        if (_dosageFormController.text.isNotEmpty)
          'dosageForm': _dosageFormController.text.trim(),
        if (_strengthController.text.isNotEmpty)
          'strength': _strengthController.text.trim(),
        'quantity': double.tryParse(_quantityController.text) ?? 1,
        'unit': _unitController.text.trim(),
        if (_batchNumberController.text.isNotEmpty)
          'batchNumber': _batchNumberController.text.trim(),
        'storageCondition': _storageCondition.name,
        if (_usageInstructionsController.text.isNotEmpty)
          'usageInstructions': _usageInstructionsController.text.trim(),
        if (_indicationsController.text.isNotEmpty)
          'indications': _indicationsController.text.trim(),
        if (_contraindicationsController.text.isNotEmpty)
          'contraindications': _contraindicationsController.text.trim(),
        if (_sideEffectsController.text.isNotEmpty)
          'sideEffects': _sideEffectsController.text.trim(),
        if (_notesController.text.isNotEmpty)
          'notes': _notesController.text.trim(),
        if (_purchaseLocationController.text.isNotEmpty)
          'purchaseLocation': _purchaseLocationController.text.trim(),
        if (_purchasePriceController.text.isNotEmpty)
          'purchasePrice': double.tryParse(_purchasePriceController.text),
        'isPrescription': _isPrescription,
        if (_prescribingDoctorController.text.isNotEmpty)
          'prescribingDoctor': _prescribingDoctorController.text.trim(),
        if (_prescriptionNumberController.text.isNotEmpty)
          'prescriptionNumber': _prescriptionNumberController.text.trim(),
        'expiryDate': _expiryDate?.toIso8601String(),
        if (_productionDate != null)
          'productionDate': _productionDate!.toIso8601String(),
        if (_purchaseDate != null)
          'purchaseDate': _purchaseDate!.toIso8601String(),
      };

      if (_isEditMode) {
        context.read<MedicineBloc>().add(
              MedicineUpdate(
                id: widget.editId!,
                data: data,
              ),
            );
      } else {
        context.read<MedicineBloc>().add(MedicineCreate(data));
      }
    }
  }
}
