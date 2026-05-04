import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_pdfview/flutter_pdfview.dart';
import 'package:path_provider/path_provider.dart';
import 'package:dio/dio.dart';
import 'package:rental_contract_manager/constants/app_constants.dart';

class PDFPreviewScreen extends StatefulWidget {
  final String? pdfPath;
  final String? pdfUrl;
  final String? title;
  final int? contractId;

  const PDFPreviewScreen({
    super.key,
    this.pdfPath,
    this.pdfUrl,
    this.title,
    this.contractId,
  });

  @override
  State<PDFPreviewScreen> createState() => _PDFPreviewScreenState();
}

class _PDFPreviewScreenState extends State<PDFPreviewScreen> {
  String? _localPath;
  bool _isLoading = true;
  String? _errorMessage;
  int _currentPage = 0;
  int _totalPages = 0;
  bool _isReady = false;
  bool _showAppBar = true;

  final Completer<PDFViewController> _controller =
      Completer<PDFViewController>();

  @override
  void initState() {
    super.initState();
    _loadPDF();
  }

  Future<void> _loadPDF() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      if (widget.pdfPath != null) {
        if (await File(widget.pdfPath!).exists()) {
          _localPath = widget.pdfPath;
        } else {
          throw Exception('文件不存在');
        }
      } else if (widget.pdfUrl != null) {
        _localPath = await _downloadPDF(widget.pdfUrl!);
      } else if (widget.contractId != null) {
        _localPath = await _downloadContractPDF(widget.contractId!);
      } else {
        throw Exception('未提供PDF文件路径或URL');
      }

      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString();
        });
      }
    }
  }

  Future<String> _downloadPDF(String url) async {
    final Dio dio = Dio();
    final tempDir = await getTemporaryDirectory();
    final fileName = url.split('/').last;
    final filePath = '${tempDir.path}/$fileName';

    final response = await dio.download(
      url,
      filePath,
      onReceiveProgress: (received, total) {
        if (total != -1) {
          // 更新下载进度
        }
      },
    );

    if (response.statusCode == 200) {
      return filePath;
    } else {
      throw Exception('下载失败: ${response.statusMessage}');
    }
  }

  Future<String> _downloadContractPDF(int contractId) async {
    final Dio dio = Dio(
      BaseOptions(
        baseUrl: AppConstants.apiBaseUrl,
        connectTimeout: Duration(milliseconds: AppConstants.connectTimeout),
        receiveTimeout: Duration(milliseconds: AppConstants.receiveTimeout),
      ),
    );

    final tempDir = await getTemporaryDirectory();
    final filePath = '${tempDir.path}/contract_$contractId.pdf';

    final response = await dio.download(
      '/contracts/contracts/$contractId/pdf/',
      filePath,
      onReceiveProgress: (received, total) {
        if (total != -1) {
          // 更新下载进度
        }
      },
    );

    if (response.statusCode == 200) {
      return filePath;
    } else {
      throw Exception('下载合同PDF失败: ${response.statusMessage}');
    }
  }

  void _toggleAppBar() {
    setState(() {
      _showAppBar = !_showAppBar;
    });
  }

  Future<void> _goToPage(int page) async {
    final controller = await _controller.future;
    await controller.setPage(page);
  }

  Future<void> _goToPreviousPage() async {
    if (_currentPage > 0) {
      await _goToPage(_currentPage - 1);
    }
  }

  Future<void> _goToNextPage() async {
    if (_currentPage < _totalPages - 1) {
      await _goToPage(_currentPage + 1);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: _showAppBar
          ? AppBar(
              title: Text(widget.title ?? 'PDF预览'),
              actions: [
                IconButton(
                  icon: const Icon(Icons.share_outlined),
                  onPressed: () {
                    // TODO: 分享PDF
                  },
                  tooltip: '分享',
                ),
                IconButton(
                  icon: const Icon(Icons.download_outlined),
                  onPressed: () {
                    // TODO: 下载PDF
                  },
                  tooltip: '下载',
                ),
              ],
            )
          : null,
      body: GestureDetector(
        onTap: _toggleAppBar,
        child: _buildBody(),
      ),
      bottomNavigationBar: _isReady && _totalPages > 1
          ? _buildBottomNavigationBar()
          : null,
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text(
              '正在加载PDF...',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: 16),
            Text(
              '加载失败',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              _errorMessage!,
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _loadPDF,
              icon: const Icon(Icons.refresh),
              label: const Text('重新加载'),
            ),
          ],
        ),
      );
    }

    if (_localPath == null) {
      return const Center(
        child: Text('无PDF文件可预览'),
      );
    }

    return Stack(
      children: [
        PDFView(
          filePath: _localPath,
          enableSwipe: true,
          swipeHorizontal: true,
          autoSpacing: false,
          pageFling: true,
          pageSnap: true,
          defaultPage: _currentPage,
          fitPolicy: FitPolicy.BOTH,
          preventLinkNavigation: false,
          onRender: (pages) {
            setState(() {
              _totalPages = pages!;
              _isReady = true;
            });
          },
          onError: (error) {
            setState(() {
              _errorMessage = error.toString();
            });
          },
          onPageError: (page, error) {
            debugPrint('Page $page error: $error');
          },
          onViewCreated: (PDFViewController pdfViewController) {
            _controller.complete(pdfViewController);
          },
          onPageChanged: (int? page, int? total) {
            setState(() {
              _currentPage = page ?? 0;
            });
          },
        ),
        if (!_isReady)
          const Center(
            child: CircularProgressIndicator(),
          ),
      ],
    );
  }

  Widget _buildBottomNavigationBar() {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 4,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                icon: const Icon(Icons.chevron_left),
                onPressed: _currentPage > 0 ? _goToPreviousPage : null,
                tooltip: '上一页',
              ),
              Text(
                '${_currentPage + 1} / $_totalPages',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              IconButton(
                icon: const Icon(Icons.chevron_right),
                onPressed: _currentPage < _totalPages - 1 ? _goToNextPage : null,
                tooltip: '下一页',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class PDFPreviewArgs {
  final String? pdfPath;
  final String? pdfUrl;
  final String? title;
  final int? contractId;

  PDFPreviewArgs({
    this.pdfPath,
    this.pdfUrl,
    this.title,
    this.contractId,
  });
}
