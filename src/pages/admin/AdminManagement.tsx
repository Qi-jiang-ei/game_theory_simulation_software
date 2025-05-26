import * as React from 'react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useToastStore } from '../../components/Toast';
import { handleError } from '../../utils/errorHandler';
import { useAuthStore } from '../../store/authStore';

interface AdminUser {
  id: string;
  email: string;
  role: 'super_admin' | 'admin';
  created_at: string;
}

const AdminManagement: React.FC = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToastStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      console.log('当前用户是管理员，开始获取管理员列表');
      fetchAdmins();
    } else {
      console.log('当前用户不是管理员:', user);
    }
  }, [user]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      console.log('开始获取管理员列表');
      
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('id, user_id, role, created_at')
        .order('created_at', { ascending: false });
  
      if (adminError) {
        console.error('获取管理员列表失败:', adminError);
        throw new Error(adminError.message);
      }

      console.log('获取到的管理员数据:', adminData);
  
      // 批量查邮箱
      const userIds = adminData.map(admin => admin.user_id);
      console.log('需要查询的用户ID:', userIds);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-emails-by-ids`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ user_ids: userIds }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('获取用户邮箱失败:', errorData);
        throw new Error(errorData.error || '获取用户邮箱失败');
      }

      const { emails } = await response.json();
      console.log('获取到的邮箱数据:', emails);

      // 合并邮箱
      const formattedAdmins = adminData.map(admin => ({
        id: admin.user_id,
        email: emails.find(e => e.id === admin.user_id)?.email || admin.user_id,
        role: admin.role,
        created_at: admin.created_at
      }));
      console.log('格式化后的管理员数据:', formattedAdmins);
      
      setAdmins(formattedAdmins);
    } catch (error) {
      console.error('Error:', error);
      handleError(error);
      addToast({
        type: 'error',
        message: '获取管理员列表失败',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    console.log('用户无权访问:', user);
    return <div className="text-center py-8">无权访问此页面</div>;
  }

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">管理员列表</h2>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">邮箱</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {admins.map(admin => (
              <tr key={admin.id}>
                <td className="px-6 py-4 whitespace-nowrap">{admin.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    admin.role === 'super_admin'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {admin.role === 'super_admin' ? '超级管理员' : '管理员'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(admin.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminManagement;
