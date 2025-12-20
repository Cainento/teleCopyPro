
import { useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import type { UserListResponse } from '../../api/adminApi';
// import { PageLayout } from '../../components/layout/PageLayout'; // Removed
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { toast } from 'sonner';

import { useAuthStore } from '../../store/auth.store';

export function AdminUsersPage() {
    const [data, setData] = useState<UserListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const { user: currentUser } = useAuthStore();

    useEffect(() => {
        loadUsers();
    }, [page, search]);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const result = await adminApi.getUsers(page, 20, search);
            setData(result);
        } catch (error) {
            toast.error('Erro ao carregar usuários');
        } finally {
            setLoading(false);
        }
    };

    const toggleAdmin = async (userId: number, currentStatus: boolean) => {
        try {
            if (userId === currentUser?.id) {
                toast.error('Você não pode alterar seu próprio status de admin');
                return;
            }

            if (!confirm(`Tem certeza que deseja ${currentStatus ? 'remover' : 'adicionar'} privilégios de admin?`)) return;

            await adminApi.updateUserAdminStatus(userId, !currentStatus);
            toast.success('Status atualizado com sucesso');
            loadUsers(); // Reload list
        } catch (error) {
            toast.error('Erro ao atualizar status');
        }
    };

    return (
        <div className="container mx-auto px-4 py-6 lg:px-8">
            <h1 className="text-2xl font-bold mb-6">Gerenciar Usuários</h1>
            <div className="space-y-4">
                {/* Search */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Buscar por nome, email ou telefone..."
                        className="flex-1 p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Usuário</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Plano</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Uso</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Admin</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Criado em</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {loading && !data ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-4 text-center">
                                            <div className="flex justify-center">
                                                <LoadingSpinner />
                                            </div>
                                        </td>
                                    </tr>
                                ) : data?.items.map((user) => (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</span>
                                                <span className="text-sm text-gray-500 dark:text-gray-400">{user.email}</span>
                                                <span className="text-xs text-gray-400">{user.id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${user.plan === 'ENTERPRISE' ? 'bg-purple-100 text-purple-800' :
                                                    user.plan === 'PREMIUM' ? 'bg-green-100 text-green-800' :
                                                        'bg-gray-100 text-gray-800'}`}>
                                                {user.plan}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {user.usage_count}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {user.is_admin ? (
                                                <span className="text-green-600 font-bold">Sim</span>
                                            ) : (
                                                <span className="text-gray-400">Não</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => toggleAdmin(user.id, user.is_admin)}
                                                className="text-indigo-600 hover:text-indigo-900 dark:hover:text-indigo-400"
                                                disabled={user.id === currentUser?.id}
                                            >
                                                {user.is_admin ? 'Remover Admin' : 'Tornar Admin'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {data && (
                        <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                            <div className="flex-1 flex justify-between sm:hidden">
                                <button
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    disabled={page === 1}
                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    Anterior
                                </button>
                                <button
                                    onClick={() => setPage(page + 1)}
                                    disabled={page * 20 >= data.total}
                                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    Próxima
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

    );
}
