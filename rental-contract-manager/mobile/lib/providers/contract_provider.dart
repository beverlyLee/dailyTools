import 'package:flutter/foundation.dart';
import 'package:rental_contract_manager/models/property.dart';
import 'package:rental_contract_manager/models/tenant.dart';
import 'package:rental_contract_manager/models/rental_contract.dart';
import 'package:rental_contract_manager/services/api_service.dart';

class ContractProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  
  List<Property> _properties = [];
  List<Tenant> _tenants = [];
  List<RentalContract> _contracts = [];
  List<RentalContract> _activeContracts = [];
  List<RentalContract> _expiringContracts = [];
  
  bool _isLoading = false;
  String? _errorMessage;

  List<Property> get properties => List.unmodifiable(_properties);
  List<Tenant> get tenants => List.unmodifiable(_tenants);
  List<RentalContract> get contracts => List.unmodifiable(_contracts);
  List<RentalContract> get activeContracts => List.unmodifiable(_activeContracts);
  List<RentalContract> get expiringContracts => List.unmodifiable(_expiringContracts);
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  // 房屋管理
  Future<void> fetchProperties() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _properties = await _apiService.getProperties();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Property?> createProperty(Map<String, dynamic> data) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final property = await _apiService.createProperty(data);
      _properties.add(property);
      _isLoading = false;
      notifyListeners();
      return property;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  Future<Property?> updateProperty(int id, Map<String, dynamic> data) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final property = await _apiService.updateProperty(id, data);
      final index = _properties.indexWhere((p) => p.id == id);
      if (index != -1) {
        _properties[index] = property;
      }
      _isLoading = false;
      notifyListeners();
      return property;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  Future<void> deleteProperty(int id) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _apiService.deleteProperty(id);
      _properties.removeWhere((p) => p.id == id);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // 房客管理
  Future<void> fetchTenants() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _tenants = await _apiService.getTenants();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Tenant?> createTenant(Map<String, dynamic> data) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final tenant = await _apiService.createTenant(data);
      _tenants.add(tenant);
      _isLoading = false;
      notifyListeners();
      return tenant;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  Future<Tenant?> updateTenant(int id, Map<String, dynamic> data) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final tenant = await _apiService.updateTenant(id, data);
      final index = _tenants.indexWhere((t) => t.id == id);
      if (index != -1) {
        _tenants[index] = tenant;
      }
      _isLoading = false;
      notifyListeners();
      return tenant;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  Future<void> deleteTenant(int id) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _apiService.deleteTenant(id);
      _tenants.removeWhere((t) => t.id == id);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // 合同管理
  Future<void> fetchContracts({String? status}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _contracts = await _apiService.getContracts(status: status);
      _updateContractLists();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<RentalContract?> fetchContract(int id) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final contract = await _apiService.getContract(id);
      _isLoading = false;
      notifyListeners();
      return contract;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  Future<RentalContract?> createContract(Map<String, dynamic> data) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final contract = await _apiService.createContract(data);
      _contracts.insert(0, contract);
      _updateContractLists();
      _isLoading = false;
      notifyListeners();
      return contract;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  Future<RentalContract?> updateContract(int id, Map<String, dynamic> data) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final contract = await _apiService.updateContract(id, data);
      final index = _contracts.indexWhere((c) => c.id == id);
      if (index != -1) {
        _contracts[index] = contract;
        _updateContractLists();
      }
      _isLoading = false;
      notifyListeners();
      return contract;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  Future<void> deleteContract(int id) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _apiService.deleteContract(id);
      _contracts.removeWhere((c) => c.id == id);
      _updateContractLists();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  void _updateContractLists() {
    _activeContracts = _contracts.where((c) => c.status == 'active').toList();
    _expiringContracts = _contracts.where((c) => c.calculatedIsExpiringSoon).toList();
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  int get activeContractsCount => _activeContracts.length;
  int get expiringContractsCount => _expiringContracts.length;
}
