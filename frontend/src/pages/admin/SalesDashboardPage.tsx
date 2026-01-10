import { useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi';
import type { SalesOverview, SalesTrends, TransactionListResponse } from '../../api/adminApi';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

type PeriodOption = 7 | 30 | 90 | 365;

const PERIOD_OPTIONS: { label: string; value: PeriodOption }[] = [
    { label: 'Últimos 7 dias', value: 7 },
    { label: 'Últimos 30 dias', value: 30 },
    { label: 'Últimos 90 dias', value: 90 },
    { label: 'Último ano', value: 365 },
];

const COLORS = {
    primary: '#6366f1',
    secondary: '#22c55e',
    accent: '#f59e0b',
    stripe: '#635bff',
    pix: '#00d4aa',
    premium: '#3b82f6',
    enterprise: '#a855f7',
};

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
}

export function SalesDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<SalesOverview | null>(null);
    const [trends, setTrends] = useState<SalesTrends | null>(null);
    const [transactions, setTransactions] = useState<TransactionListResponse | null>(null);
    const [period, setPeriod] = useState<PeriodOption>(30);
    const [txPage, setTxPage] = useState(1);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        loadData();
    }, [period]);

    useEffect(() => {
        loadTransactions();
    }, [txPage]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [overviewData, trendsData] = await Promise.all([
                adminApi.getSalesOverview(),
                adminApi.getSalesTrends(period)
            ]);
            setOverview(overviewData);
            setTrends(trendsData);
        } catch (error) {
            toast.error('Erro ao carregar dados de vendas');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadTransactions = async () => {
        try {
            const data = await adminApi.getTransactions({
                skip: (txPage - 1) * 10,
                limit: 10
            });
            setTransactions(data);
        } catch (error) {
            toast.error('Erro ao carregar transações');
            console.error(error);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const data = await adminApi.exportSalesData({ format: 'json' });

            // Generate PDF using browser print (simple approach)
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`
                    <html>
                    <head>
                        <title>Relatório de Vendas - TeleCopy Pro</title>
                        <style>
                            body { font-family: Arial, sans-serif; padding: 20px; }
                            h1 { color: #333; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                            th { background-color: #f4f4f4; }
                            .summary { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; }
                            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
                            .metric { text-align: center; }
                            .metric-value { font-size: 24px; font-weight: bold; color: #6366f1; }
                            .metric-label { color: #666; font-size: 12px; }
                        </style>
                    </head>
                    <body>
                        <h1>Relatório de Vendas - TeleCopy Pro</h1>
                        <p>Data de exportação: ${new Date(data.export_date).toLocaleString('pt-BR')}</p>
                        
                        <div class="summary">
                            <h2>Resumo</h2>
                            <div class="summary-grid">
                                <div class="metric">
                                    <div class="metric-value">${formatCurrency(data.summary.revenue.total)}</div>
                                    <div class="metric-label">Receita Total</div>
                                </div>
                                <div class="metric">
                                    <div class="metric-value">${formatCurrency(data.summary.revenue.monthly)}</div>
                                    <div class="metric-label">Receita Mensal</div>
                                </div>
                                <div class="metric">
                                    <div class="metric-value">${data.summary.users.paid}</div>
                                    <div class="metric-label">Usuários Pagos</div>
                                </div>
                                <div class="metric">
                                    <div class="metric-value">${data.summary.users.conversion_rate}%</div>
                                    <div class="metric-label">Taxa de Conversão</div>
                                </div>
                            </div>
                        </div>
                        
                        <h2>Transações (${data.total_transactions} total)</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Tipo</th>
                                    <th>Usuário</th>
                                    <th>Valor</th>
                                    <th>Status</th>
                                    <th>Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.transactions.map(tx => `
                                    <tr>
                                        <td>${tx.id.substring(0, 15)}...</td>
                                        <td>${tx.type.toUpperCase()}</td>
                                        <td>${tx.user_name}</td>
                                        <td>${formatCurrency(tx.amount)}</td>
                                        <td>${tx.status}</td>
                                        <td>${formatDate(tx.created_at)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </body>
                    </html>
                `);
                printWindow.document.close();
                printWindow.print();
            }
            toast.success('Relatório exportado com sucesso');
        } catch (error) {
            toast.error('Erro ao exportar dados');
            console.error(error);
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return <LoadingSpinner fullScreen />;
    }

    if (!overview || !trends) return null;

    const pieDataMethod = [
        { name: 'Stripe (Cartão)', value: overview.revenue_by_method.stripe, color: COLORS.stripe },
        { name: 'PIX', value: overview.revenue_by_method.pix, color: COLORS.pix },
    ].filter(d => d.value > 0);

    const barDataPlan = [
        { name: 'Premium', value: trends.by_plan?.premium?.total || 0, color: COLORS.premium },
        { name: 'Enterprise', value: trends.by_plan?.enterprise?.total || 0, color: COLORS.enterprise },
    ];

    return (
        <div className="container mx-auto px-4 py-6 lg:px-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard de Vendas</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Visão geral de receitas e assinaturas
                    </p>
                </div>
                <div className="flex gap-3">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(Number(e.target.value) as PeriodOption)}
                        className="px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm"
                    >
                        {PERIOD_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm disabled:opacity-50"
                    >
                        {exporting ? 'Exportando...' : 'Exportar PDF'}
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Receita Total"
                    value={formatCurrency(overview.revenue.total)}
                    subtitle="Todo o período"
                    color="indigo"
                />
                <KPICard
                    title="Receita Mensal"
                    value={formatCurrency(overview.revenue.monthly)}
                    subtitle="Este mês"
                    color="green"
                />
                <KPICard
                    title="Usuários Pagos"
                    value={overview.users.paid.toString()}
                    subtitle={`${overview.users.conversion_rate}% de conversão`}
                    color="blue"
                />
                <KPICard
                    title="MRR Estimado"
                    value={formatCurrency(overview.metrics.arpu * overview.users.paid)}
                    subtitle={`ARPU: ${formatCurrency(overview.metrics.arpu)}`}
                    color="purple"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Trend Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Tendência de Receita
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={trends.revenue_trend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                            <XAxis
                                dataKey="date"
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                tickFormatter={(v) => new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            />
                            <YAxis
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                tickFormatter={(v) => `R$${v}`}
                            />
                            <Tooltip
                                formatter={(value) => typeof value === 'number' ? formatCurrency(value) : '-'}
                                labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                                labelStyle={{ color: '#fff' }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                name="Total"
                                stroke={COLORS.primary}
                                strokeWidth={2}
                                dot={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="stripe"
                                name="Stripe"
                                stroke={COLORS.stripe}
                                strokeWidth={2}
                                dot={false}
                                strokeDasharray="5 5"
                            />
                            <Line
                                type="monotone"
                                dataKey="pix"
                                name="PIX"
                                stroke={COLORS.pix}
                                strokeWidth={2}
                                dot={false}
                                strokeDasharray="5 5"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Payment Method Pie Chart */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Por Método de Pagamento
                    </h3>
                    {pieDataMethod.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={pieDataMethod}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {pieDataMethod.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => typeof value === 'number' ? formatCurrency(value) : '-'} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[250px] flex items-center justify-center text-gray-500">
                            Sem dados de pagamento
                        </div>
                    )}
                </div>
            </div>

            {/* Second Row: Plan Revenue + Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue by Plan */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Receita por Plano
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={barDataPlan} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                            <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                            <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} width={80} />
                            <Tooltip formatter={(value) => typeof value === 'number' ? formatCurrency(value) : '-'} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {barDataPlan.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Quick Metrics */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Métricas Rápidas
                    </h3>
                    <div className="space-y-4">
                        <MetricRow label="Total de Transações" value={overview.metrics.total_transactions.toString()} />
                        <MetricRow label="Receita Semanal" value={formatCurrency(overview.revenue.weekly)} />
                        <MetricRow label="Receita Hoje" value={formatCurrency(overview.revenue.daily)} />
                        <MetricRow label="Usuários Gratuitos" value={overview.users.free.toString()} />
                        <MetricRow label="Total de Usuários" value={overview.users.total.toString()} />
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Transações Recentes
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tipo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Usuário</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Valor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Data</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {transactions?.items.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        Nenhuma transação encontrada
                                    </td>
                                </tr>
                            ) : (
                                transactions?.items.map((tx) => (
                                    <tr key={tx.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {tx.id.substring(0, 15)}...
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${tx.type === 'stripe'
                                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                                : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                }`}>
                                                {tx.type.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{tx.user_name}</div>
                                            <div className="text-xs text-gray-500">{tx.user_email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                            {formatCurrency(tx.amount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${tx.status === 'paid'
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                : tx.status === 'pending'
                                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                }`}>
                                                {tx.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {formatDate(tx.created_at)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {transactions && transactions.total > 10 && (
                    <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                        <span className="text-sm text-gray-500">
                            Mostrando {Math.min(txPage * 10, transactions.total)} de {transactions.total}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setTxPage(p => Math.max(1, p - 1))}
                                disabled={txPage === 1}
                                className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 dark:border-gray-600"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => setTxPage(p => p + 1)}
                                disabled={txPage * 10 >= transactions.total}
                                className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 dark:border-gray-600"
                            >
                                Próxima
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-4">
                <Link
                    to="/admin"
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                    ← Voltar ao Painel
                </Link>
                <Link
                    to="/admin/users"
                    className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                >
                    Gerenciar Usuários
                </Link>
            </div>
        </div>
    );
}

interface KPICardProps {
    title: string;
    value: string;
    subtitle: string;
    color: 'indigo' | 'green' | 'blue' | 'purple';
}

function KPICard({ title, value, subtitle, color }: KPICardProps) {
    const colorClasses = {
        indigo: 'text-indigo-600 dark:text-indigo-400',
        green: 'text-green-600 dark:text-green-400',
        blue: 'text-blue-600 dark:text-blue-400',
        purple: 'text-purple-600 dark:text-purple-400',
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${colorClasses[color]}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        </div>
    );
}

interface MetricRowProps {
    label: string;
    value: string;
}

function MetricRow({ label, value }: MetricRowProps) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{value}</span>
        </div>
    );
}
