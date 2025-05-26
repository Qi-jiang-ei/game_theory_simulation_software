// 在文件顶部添加这些导入
import React, { Suspense, useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Auth } from './components/Auth';
import { useAuthStore } from './store/authStore';
import { Layout } from './components/Layout';
import { ToastContainer } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load pages
const Simulator = React.lazy(() => import('./pages/Simulator'));
const Results = React.lazy(() => import('./pages/Results'));
const AdminManagement = React.lazy(() => import('./pages/admin/AdminManagement'));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="text-xl font-semibold text-gray-600">加载中...</div>
  </div>
);

// 添加 NotFound 组件
const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
    <h1 className="text-4xl font-bold text-gray-700 mb-4">404</h1>
    <p className="text-lg text-gray-500 mb-8">页面未找到</p>
    <a href="/" className="text-blue-600 hover:underline">返回首页</a>
  </div>
);

// 修改权限控制组件
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthStore();
  
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoader />}>
            <Simulator />
          </Suspense>
        )
      },
      {
        path: 'results',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Results />
          </Suspense>
        )
      },
      {
        path: 'admin',
        children: [
          {
            path: 'management',
            element: (
              <AdminRoute>
                <Suspense fallback={<PageLoader />}>
                  <AdminManagement />
                </Suspense>
              </AdminRoute>
            )
          }
        ]
      },
      {
        path: '*',
        element: <NotFound />
      }
    ]
  }
], {
  future: {
    // 只保留你确定支持的 flags
    // v7_startTransition: true,
    // v7_relativeSplatPath: true
  }
});

function App() {
  const { user, loading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return (
      <>
        <Auth />
        <ToastContainer />
      </>
    );
  }

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
      <ToastContainer />
    </ErrorBoundary>
  );
}

export default App;
