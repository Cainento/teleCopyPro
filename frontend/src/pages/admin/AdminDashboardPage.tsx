
import { useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import type { AdminStats } from '../../api/adminApi';
// import { PageLayout } from '../../components/layout/PageLayout'; // Removed to avoid duplication
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export function AdminDashboardPage() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const data = await adminApi.getStats();
            setStats(data);
        } catch (error) {
            toast.error('Erro ao carregar estatísticas');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <LoadingSpinner fullScreen />;
    }

    if (!stats) return null;

    return (
        <div className="container mx-auto px-4 py-6 lg:px-8">
            <h1 className="text-2xl font-bold mb-6">Painel Administrativo</h1>
            <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Users Card */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Usuários</h3>
                        <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">{stats.users.total}</div>
                        <div className="mt-4 space-y-1 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex justify-between">
                                <span>Enterprise:</span>
                                <span className="font-medium">{stats.users.enterprise}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Premium:</span>
                                <span className="font-medium">{stats.users.premium}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Gratuito:</span>
                                <span className="font-medium">{stats.users.free}</span>
                            </div>
                        </div>
                    </div>

                    {/* Jobs Card */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Jobs</h3>
                        <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">{stats.jobs.total}</div>
                        <div className="mt-4 space-y-1 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex justify-between">
                                <span>Real-time Ativos:</span>
                                <span className="text-green-500 font-medium">{stats.jobs.active_realtime}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Completos:</span>
                                <span className="font-medium">{stats.jobs.completed}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Falhas:</span>
                                <span className="text-red-500 font-medium">{stats.jobs.failed}</span>
                            </div>
                        </div>
                    </div>

                    {/* Messages Card */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Mensagens Copiadas</h3>
                        <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                            {stats.messages.total_copied.toLocaleString()}
                        </div>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            Total de mensagens processadas pelo sistema.
                        </p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex space-x-4">
                    <Link
                        to="/admin/users"
                        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition"
                    >
                        Gerenciar Usuários
                    </Link>
                    <Link
                        to="/admin/sales"
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                    >
                        Dashboard de Vendas
                    </Link>
                </div>
            </div>
        </div>
    );
}
