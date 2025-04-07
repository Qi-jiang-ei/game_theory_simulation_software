import * as React from 'react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { UserPlus, Trash2 } from 'lucide-react';
import { useToastStore } from '../../components/Toast';
import { handleError } from '../../utils/errorHandler';
import { supabaseAdmin } from '../../lib/supabaseClient';

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

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      // 先获取管理员列表
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('id, user_id, role, created_at')
        .order('created_at', { ascending: false });
  
      if (adminError) throw adminError;
  
      // 批量获取用户邮箱 - 使用正确的Supabase Auth API
      const userIds = adminData.map(admin => admin.user_id);
      // 修改fetchAdmins函数中的调用
      const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      });
  
      if (userError) throw userError;
  
      // 合并数据
      const formattedAdmins = adminData.map(admin => ({
        id: admin.user_id,
        email: users.find(u => u.id === admin.user_id)?.email || '',
        role: admin.role,
        created_at: admin.created_at
      }));
      setAdmins(formattedAdmins);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    const email = prompt('请输入要添加的管理员邮箱：');
    if (!email) return;
  
    try {
      // 使用Supabase Auth API查找用户
      const { data: { users }, error: userError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      });
      
      const user = users.find(u => u.email === email);
      
      if (!user) {
        addToast({
          type: 'error',
          message: '用户不存在',
          duration: 3000,
        });
        return;
      }
  
      const { error: adminError } = await supabase
        .from('admin_users')
        .insert({
          user_id: user.id,
          role: 'admin',
        });
  
      if (adminError) throw adminError;
  
      addToast({
        type: 'success',
        message: '管理员添加成功',
        duration: 3000,
      });
  
      await fetchAdmins();
    } catch (error) {
      handleError(error);
    }
  };

  const handleRemoveAdmin = async (id: string, email: string) => {
    if (!confirm(`确定要移除管理员 ${email} 吗？`)) return;

    try {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('user_id', id);

      if (error) throw error;

      addToast({
        type: 'success',
        message: '管理员移除成功',
        duration: 3000,
      });

      await fetchAdmins();
    } catch (error) {
      handleError(error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">管理员管理</h2>
        <button
          onClick={handleAddAdmin}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <UserPlus className="w-4 h-4" />
          添加管理员
        </button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">邮箱</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
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
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  {admin.role !== 'super_admin' && (
                    <button
                      onClick={() => handleRemoveAdmin(admin.id, admin.email)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 确保有默认导出
export default AdminManagement;
