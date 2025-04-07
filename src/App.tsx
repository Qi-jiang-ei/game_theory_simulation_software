// 在文件顶部添加这些导入
import React, { Suspense, useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Auth } from './components/Auth';
import { useAuthStore } from './store/authStore';
import { Layout } from './components/Layout';
import { ToastContainer } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load pages
// 修改懒加载方式
const Simulator = React.lazy(() => import('./pages/Simulator'));
const AdminModels = React.lazy(() => import('./pages/admin/AdminModels'));
const AdminResults = React.lazy(() => import('./pages/admin/AdminResults'));
const AdminManagement = React.lazy(() => import('./pages/admin/AdminManagement'));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="text-xl font-semibold text-gray-600">加载中...</div>
  </div>
);

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
        path: 'admin',
        children: [
          {
            path: 'models',
            element: (
              <Suspense fallback={<PageLoader />}>
                <AdminModels />
              </Suspense>
            )
          },
          {
            path: 'results',
            element: (
              <Suspense fallback={<PageLoader />}>
                <AdminResults />
              </Suspense>
            )
          },
          {
            path: 'management',
            element: (
              <Suspense fallback={<PageLoader />}>
                <AdminManagement />
              </Suspense>
            )
          }
        ]
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
