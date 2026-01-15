
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
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
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
            loadUsers();
        } catch (error) {
            toast.error('Erro ao atualizar status');
        }
    };

    const handlePlanUpdate = async (userId: number, plan: string, days?: number) => {
        try {
            await adminApi.updateUserPlan(userId, plan, days);
            toast.success('Plano atualizado com sucesso');
            setIsPlanModalOpen(false);
            loadUsers();
        } catch (error) {
            toast.error('Erro ao atualizar plano');
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Telefone</th>
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
                                        <td colSpan={7} className="px-6 py-4 text-center">
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {user.phone_number}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${user.plan.toUpperCase() === 'ENTERPRISE' ? 'bg-purple-100 text-purple-800' :
                                                    user.plan.toUpperCase() === 'PREMIUM' ? 'bg-green-100 text-green-800' :
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
                                            <div className="flex flex-col items-end gap-1">
                                                <button
                                                    onClick={() => toggleAdmin(user.id, user.is_admin)}
                                                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                                    disabled={user.id === currentUser?.id}
                                                >
                                                    {user.is_admin ? 'Remover Admin' : 'Tornar Admin'}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setIsPlanModalOpen(true);
                                                    }}
                                                    className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                                >
                                                    Alterar Plano
                                                </button>
                                            </div>
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
            {isPlanModalOpen && selectedUser && (
                <PlanChangeModal
                    user={selectedUser}
                    onClose={() => setIsPlanModalOpen(false)}
                    onUpdate={handlePlanUpdate}
                />
            )}
        </div>
    );
}

interface PlanChangeModalProps {
    user: any;
    onClose: () => void;
    onUpdate: (userId: number, plan: string, days?: number) => void;
}

function PlanChangeModal({ user, onClose, onUpdate }: PlanChangeModalProps) {
    const [plan, setPlan] = useState(user.plan);
    const [days, setDays] = useState(30);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold dark:text-white">Alterar Plano</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Usuário</p>
                        <p className="font-medium dark:text-white">{user.name} ({user.email})</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selecionar Plano</label>
                        <select
                            value={plan}
                            onChange={(e) => setPlan(e.target.value)}
                            className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white ring-offset-background focus:ring-2 focus:ring-green-500 transition-all"
                        >
                            <option value="free">Gratuito (FREE)</option>
                            <option value="premium">Premium (PREMIUM)</option>
                            <option value="enterprise">Enterprise (ENTERPRISE)</option>
                        </select>
                    </div>

                    {plan !== 'FREE' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Duração (dias)</label>
                            <input
                                type="number"
                                value={days}
                                onChange={(e) => setDays(parseInt(e.target.value) || 0)}
                                className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white ring-offset-background focus:ring-2 focus:ring-green-500 transition-all"
                                min="1"
                                max="3650"
                            />
                            <p className="text-xs text-gray-500 mt-1">O plano expirará em {days} dias a partir de agora.</p>
                        </div>
                    )}

                    {plan === 'FREE' && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <p className="text-xs text-yellow-800 dark:text-yellow-200">
                                <strong>Nota:</strong> Downgrades para FREE removem a expiração. O usuário terá limites de mensagens e jobs restaurados.
                            </p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => onUpdate(user.id, plan, plan === 'FREE' ? undefined : days)}
                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-lg shadow-green-900/10 transition-colors"
                        >
                            Salvar Alterações
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
