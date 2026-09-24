import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PlatformUser } from '../../types';
import { AdminUserActivitySubTab } from './AdminUserActivitySubTab';
import {
  Users,
  Search,
  Filter,
  Plus,
  Shield,
  Ban,
  CheckCircle,
  AlertCircle,
  DollarSign,
  ShoppingCart,
  Clock,
  Globe,
  Trash2,
  Edit2,
  X,
  UserCheck,
  UserX,
  ArrowUpDown,
  LogIn,
  Percent,
  History
} from 'lucide-react';

export const AdminUsersTab: React.FC = () => {
  const {
    language,
    platformUsers,
    userActivityLogs,
    adminUpdateUserBalance,
    adminUpdateUserStatus,
    adminUpdateUserRole,
    adminAddNewUser,
    adminDeleteUser,
    adminImpersonateUser,
    adminSetUserDiscount
  } = useApp();

  const isAr = language === 'ar';

  // Sub-tabs: 'users_list' vs 'activity_log'
  const [activeSubTab, setActiveSubTab] = useState<'users_list' | 'activity_log'>('users_list');
  const [selectedActivityUserId, setSelectedActivityUserId] = useState<string>('all');

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Edit Balance Modal State
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);
  const [newBalanceInput, setNewBalanceInput] = useState<string>('');
  const [balanceNote, setBalanceNote] = useState<string>('');

  // Edit Discount Modal State
  const [discountUser, setDiscountUser] = useState<PlatformUser | null>(null);
  const [discountInput, setDiscountInput] = useState<string>('0');

  // Add User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addBalance, setAddBalance] = useState('50');
  const [addDiscount, setAddDiscount] = useState('0');
  const [addRole, setAddRole] = useState<'user' | 'vip' | 'reseller' | 'admin'>('user');

  // Filtered Users
  const filteredUsers = platformUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastIp.includes(searchTerm);

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleOpenEditBalance = (user: PlatformUser) => {
    setEditingUser(user);
    setNewBalanceInput(user.balance.toString());
    setBalanceNote('');
  };

  const handleSaveBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const val = Number(newBalanceInput);
    if (isNaN(val)) return;

    adminUpdateUserBalance(editingUser.id, val, balanceNote.trim());
    setEditingUser(null);
  };

  const handleOpenEditDiscount = (user: PlatformUser) => {
    setDiscountUser(user);
    setDiscountInput((user.customDiscountPercent || 0).toString());
  };

  const handleSaveDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountUser) return;
    const val = Number(discountInput);
    if (isNaN(val) || val < 0 || val > 90) return;
    adminSetUserDiscount(discountUser.id, val);
    setDiscountUser(null);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addEmail.trim()) return;

    adminAddNewUser({
      name: addName.trim(),
      email: addEmail.trim(),
      phone: '+201000000000',
      country: 'Egypt',
      balance: Number(addBalance) || 0,
      customDiscountPercent: Number(addDiscount) || 0,
      totalSpent: 0,
      totalOrders: 0,
      role: addRole,
      status: 'active'
    });

    setIsAddUserOpen(false);
    setAddName('');
    setAddEmail('');
    setAddBalance('50');
    setAddDiscount('0');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            <span>{isAr ? 'إدارة المستخدمين والتحكم الكامل' : 'User Management & Full Control'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {isAr
              ? 'مراقبة بيانات العملاء، الأرصدة، الـ IP، حركة الشراء، تعديل المحافظ وتغيير حالات الحظر فوراً.'
              : 'Oversight of client profiles, wallet balances, registered IPs, order activity, and permissions.'}
          </p>
        </div>

        <button
          onClick={() => setIsAddUserOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isAr ? 'إضافة مستخدم جديد' : 'Add New User'}</span>
        </button>
      </div>

      {/* Sub-navigation: Users List vs Activity Log */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit shadow-xs">
        <button
          onClick={() => setActiveSubTab('users_list')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeSubTab === 'users_list'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{isAr ? 'قائمة المستخدمين والحسابات' : 'Users & Accounts'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeSubTab === 'users_list'
              ? 'bg-white/20 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            {platformUsers.length}
          </span>
        </button>

        <button
          onClick={() => {
            setSelectedActivityUserId('all');
            setActiveSubTab('activity_log');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeSubTab === 'activity_log'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>{isAr ? 'سجل النشاط' : 'Activity Log'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeSubTab === 'activity_log'
              ? 'bg-white/20 text-white'
              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
          }`}>
            {userActivityLogs.length}
          </span>
        </button>
      </div>

      {activeSubTab === 'activity_log' ? (
        <AdminUserActivitySubTab initialUserId={selectedActivityUserId} />
      ) : (
        <>
          {/* Filter Toolbar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-3" />
          <input
            type="text"
            placeholder={isAr ? 'بحث بالاسم، البريد، كود العميل، أو عنوان الـ IP...' : 'Search by name, email, ID, or IP...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl ps-10 pe-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{isAr ? 'جميع الرتب' : 'All Roles'}</option>
            <option value="user">{isAr ? 'مستخدم عادي' : 'Standard User'}</option>
            <option value="vip">{isAr ? 'عميل VIP' : 'VIP Client'}</option>
            <option value="reseller">{isAr ? 'موزع Reseller' : 'Reseller'}</option>
            <option value="admin">{isAr ? 'مشرف Admin' : 'Admin'}</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{isAr ? 'جميع الحالات' : 'All Status'}</option>
            <option value="active">{isAr ? 'نشط (Active)' : 'Active'}</option>
            <option value="suspended">{isAr ? 'معلق (Suspended)' : 'Suspended'}</option>
            <option value="banned">{isAr ? 'محظور (Banned)' : 'Banned'}</option>
          </select>
        </div>

      </div>

      {/* Users Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-extrabold">
              <tr>
                <th className="p-4">{isAr ? 'المستخدم والبيانات' : 'User & Profile'}</th>
                <th className="p-4">{isAr ? 'الرتبة' : 'Role'}</th>
                <th className="p-4">{isAr ? 'الرصيد المتاح' : 'Wallet Balance'}</th>
                <th className="p-4">{isAr ? 'خصم مخصص' : 'Discount'}</th>
                <th className="p-4">{isAr ? 'إجمالي المشتريات' : 'Total Spent'}</th>
                <th className="p-4">{isAr ? 'الطلبات' : 'Orders'}</th>
                <th className="p-4">{isAr ? 'عنوان IP الأخير' : 'Last IP'}</th>
                <th className="p-4">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="p-4 text-center">{isAr ? 'التحكم والإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    {isAr ? 'لا يوجد مستخدمين يطابقون معايير البحث' : 'No users found'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* User Info */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{user.name}</span>
                            <span className="text-[10px] font-mono text-slate-400">({user.id})</span>
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-mono">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="p-4">
                      <select
                        value={user.role}
                        onChange={(e) => adminUpdateUserRole(user.id, e.target.value as any)}
                        className={`text-[10px] font-black rounded-lg px-2 py-1 border cursor-pointer ${
                          user.role === 'admin'
                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                            : user.role === 'reseller'
                            ? 'bg-purple-500/10 text-purple-500 border-purple-500/30'
                            : user.role === 'vip'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        <option value="user">User</option>
                        <option value="vip">VIP</option>
                        <option value="reseller">Reseller</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>

                    {/* Balance */}
                    <td className="p-4 font-mono font-black text-slate-900 dark:text-white text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          ${user.balance.toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleOpenEditBalance(user)}
                          className="p-1 text-slate-400 hover:text-cyan-500 rounded transition-colors"
                          title={isAr ? 'تعديل الرصيد' : 'Edit Balance'}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Custom Discount */}
                    <td className="p-4">
                      <button
                        onClick={() => handleOpenEditDiscount(user)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition-colors ${
                          (user.customDiscountPercent || 0) > 0
                            ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                        title={isAr ? 'تعديل الخصم المخصص' : 'Edit Custom Discount'}
                      >
                        <Percent className="w-3 h-3" />
                        <span>{user.customDiscountPercent || 0}%</span>
                      </button>
                    </td>

                    {/* Total Spent */}
                    <td className="p-4 font-mono text-slate-600 dark:text-slate-400">
                      ${user.totalSpent.toFixed(2)}
                    </td>

                    {/* Orders count */}
                    <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {user.totalOrders}
                    </td>

                    {/* Last IP */}
                    <td className="p-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{user.lastIp}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <select
                        value={user.status}
                        onChange={(e) => adminUpdateUserStatus(user.id, e.target.value as any)}
                        className={`text-[10px] font-black rounded-lg px-2 py-1 border cursor-pointer ${
                          user.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                            : user.status === 'suspended'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                        }`}
                      >
                        <option value="active">{isAr ? 'نشط' : 'Active'}</option>
                        <option value="suspended">{isAr ? 'معلق' : 'Suspended'}</option>
                        <option value="banned">{isAr ? 'محظور' : 'Banned'}</option>
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            if (window.confirm(isAr ? `تسجيل الدخول كـ ${user.name}؟ ستنتقل لواجهة العميل بحسابه للتحكم وتجربة المنظومة مثله.` : `Log in as ${user.name}?`)) {
                              adminImpersonateUser(user.id);
                            }
                          }}
                          className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                          title={isAr ? 'تسجيل الدخول كالمستخدم (محاكاة حسابه)' : 'Login as User'}
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          <span>{isAr ? 'دخول كالمستخدم' : 'Login As'}</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedActivityUserId(user.id);
                            setActiveSubTab('activity_log');
                          }}
                          className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                          title={isAr ? 'عرض سجل نشاط هذا المستخدم' : 'View User Activity Log'}
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>{isAr ? 'سجل النشاط' : 'Activity'}</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditBalance(user)}
                          className="px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 font-bold text-[11px] transition-colors"
                        >
                          {isAr ? 'شحن/خصم' : 'Balance'}
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(isAr ? `هل أنت متأكد من حذف المستخدم ${user.name}؟` : `Delete user ${user.name}?`)) {
                              adminDeleteUser(user.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                          title={isAr ? 'حذف المستخدم' : 'Delete User'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Edit Balance Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                <span>{isAr ? 'تعديل رصيد المحفظة للمستخدم' : 'Edit User Wallet Balance'}</span>
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBalance} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="text-slate-500 dark:text-slate-400">{isAr ? 'اسم العميل:' : 'User:'}</div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">{editingUser.name} ({editingUser.id})</div>
                <div className="text-slate-500 dark:text-slate-400 mt-1">{isAr ? 'الرصيد الحالي:' : 'Current Balance:'}</div>
                <div className="font-mono font-black text-emerald-500 text-base">${editingUser.balance.toFixed(2)}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {isAr ? 'الرصيد الجديد ($ USD):' : 'New Balance ($ USD):'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newBalanceInput}
                  onChange={(e) => setNewBalanceInput(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-mono text-lg font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {isAr ? 'سبب التعديل أو ملاحظة المشرف:' : 'Admin Note / Reason:'}
                </label>
                <input
                  type="text"
                  placeholder={isAr ? 'مثال: بونص ترويجي، تسوية يدوية، تعويض...' : 'e.g. Manual credit adjustment'}
                  value={balanceNote}
                  onChange={(e) => setBalanceNote(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black shadow-md shadow-emerald-500/25"
                >
                  {isAr ? 'حفظ الرصيد الآن' : 'Save Balance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-500" />
                <span>{isAr ? 'إنشاء حساب مستخدم جديد' : 'Create New User Account'}</span>
              </h3>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {isAr ? 'الاسم الكامل:' : 'Full Name:'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? 'مثال: محمد السيد' : 'John Doe'}
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {isAr ? 'البريد الإلكتروني:' : 'Email Address:'}
                </label>
                <input
                  type="email"
                  required
                  placeholder="user@example.com"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isAr ? 'الرصيد ($):' : 'Balance ($):'}
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={addBalance}
                    onChange={(e) => setAddBalance(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isAr ? 'خصم خاص (%):' : 'Discount (%):'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={addDiscount}
                    onChange={(e) => setAddDiscount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isAr ? 'الرتبة:' : 'Role:'}
                  </label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="vip">VIP</option>
                    <option value="reseller">Reseller</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-md shadow-blue-500/25"
                >
                  {isAr ? 'إنشاء الحساب' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Custom Discount Modal */}
      {discountUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-base flex items-center gap-2">
                <Percent className="w-5 h-5 text-purple-500" />
                <span>{isAr ? 'تحديد نسبة خصم مخصصة للعميل' : 'Set Custom User Discount'}</span>
              </h3>
              <button
                onClick={() => setDiscountUser(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDiscount} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs">
                <div className="text-slate-600 dark:text-slate-300">{isAr ? 'العميل المستفيد:' : 'Client:'}</div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">{discountUser.name} ({discountUser.email})</div>
                <p className="text-[11px] text-purple-600 dark:text-purple-300 mt-1">
                  {isAr
                    ? 'سيتم تطبيق هذا الخصم تلقائياً على كافة الطلبات التي ينشئها هذا العميل في المنصة.'
                    : 'This custom discount will automatically apply across all orders placed by this user.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {isAr ? 'نسبة الخصم المئوية (0 - 90%):' : 'Discount Percentage (0 - 90%):'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="90"
                    required
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 font-mono text-xl font-black text-purple-600 dark:text-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="absolute end-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">%</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDiscountUser(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black shadow-md shadow-purple-500/25"
                >
                  {isAr ? 'حفظ الخصم' : 'Save Discount'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
