import { Component, ErrorInfo, ReactNode } from 'react';
import { useToastStore } from './Toast';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
    
    let errorMessage = '应用程序发生错误，请刷新页面重试';
    if (error.message.includes('Failed to fetch dynamically imported module')) {
      errorMessage = '模块加载失败，请检查网络连接后刷新页面';
    }

    useToastStore.getState().addToast({
      type: 'error',
      message: errorMessage,
      duration: Infinity,
    });
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleReport = () => {
    // 这里可以添加错误报告逻辑
    const errorReport = {
      error: this.state.error?.toString(),
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };
    console.log('Error report:', errorReport);
    useToastStore.getState().addToast({
      type: 'success',
      message: '错误报告已提交，感谢您的反馈',
      duration: 3000,
    });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-lg w-full">
            <div className="flex items-center justify-center mb-6">
              <AlertTriangle className="w-16 h-16 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 text-center mb-4">
              糟糕！出现了一些问题
            </h1>
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-red-700 text-sm font-medium">
                错误信息：{this.state.error?.message}
              </p>
              {this.state.errorInfo && (
                <pre className="mt-2 text-xs text-red-600 overflow-auto max-h-40">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>
            <div className="space-y-4">
              <button
                onClick={this.handleRefresh}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                刷新页面
              </button>
              <button
                onClick={this.handleReport}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                报告问题
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
