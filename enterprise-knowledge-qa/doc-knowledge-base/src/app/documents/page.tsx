import DocumentUploader from '@/components/DocumentUploader';
import DocumentList from '@/components/DocumentList';

export default function DocumentsPage() {
  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">文档知识库</h1>
          <div className="flex space-x-3">
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              上传文档
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">上传新文档</h2>
            <DocumentUploader />
          </div>
          
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-4">已上传的文档</h2>
            <DocumentList />
          </div>
        </div>
      </div>
    </div>
  );
}
