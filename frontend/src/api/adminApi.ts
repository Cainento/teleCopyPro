
import api from './client';
import type { User } from '../types/api.types';

export interface AdminStats {
    users: {
        total: number;
        premium: number;
        enterprise: number;
        free: number;
    };
    jobs: {
        total: number;
        active_realtime: number;
        completed: number;
        failed: number;
    };
    messages: {
        total_copied: number;
    };
}

export interface UserListResponse {
    items: User[];
    total: number;
    page: number;
    size: number;
}

export interface UserDetailsResponse {
    user: User;
    sessions: Array<{
        phone_number: string;
        is_active: boolean;
        last_used: string;
    }>;
    recent_jobs: Array<{
        id: string;
        source: string;
        destination: string;
        status: string;
        copied: number;
        created_at: string;
    }>;
    invoices_count: number;
}

// Sales Dashboard Types
export interface SalesOverview {
    revenue: {
        total: number;
        monthly: number;
        weekly: number;
        daily: number;
        currency: string;
    };
    revenue_by_method: {
        stripe: number;
        pix: number;
    };
    users: {
        total: number;
        paid: number;
        free: number;
        conversion_rate: number;
    };
    metrics: {
        arpu: number;
        total_transactions: number;
    };
}

export interface RevenueDataPoint {
    date: string;
    revenue: number;
    stripe: number;
    pix: number;
}

export interface RevenueByMethod {
    stripe: {
        total: number;
        count: number;
    };
    pix: {
        total: number;
        count: number;
    };
}

export interface RevenueByPlan {
    premium: {
        total: number;
        label: string;
    };
    enterprise: {
        total: number;
        label: string;
    };
}

export interface Transaction {
    id: string;
    type: 'stripe' | 'pix';
    user_id: number;
    user_name: string;
    user_email: string;
    amount: number;
    currency: string;
    status: string;
    plan: string;
    billing_cycle?: string;
    created_at: string | null;
    paid_at: string | null;
}

export interface TransactionListResponse {
    items: Transaction[];
    total: number;
    page: number;
    size: number;
}

export interface SubscriptionMetrics {
    active_subscriptions: {
        total: number;
        premium: number;
        enterprise: number;
    };
    new_this_month: number;
    churned: number;
    mrr: number;
    currency: string;
}

export interface SalesTrends {
    period: number;
    start_date: string;
    end_date: string;
    revenue_trend: RevenueDataPoint[];
    by_payment_method: RevenueByMethod;
    by_plan: RevenueByPlan;
}

export interface SalesExportData {
    export_date: string;
    filters: {
        payment_method: string | null;
        status: string | null;
        start_date: string | null;
        end_date: string | null;
    };
    summary: SalesOverview;
    transactions: Transaction[];
    total_transactions: number;
}

export interface SalesQueryParams {
    start_date?: string;
    end_date?: string;
    granularity?: 'day' | 'week' | 'month';
    period?: number;
    skip?: number;
    limit?: number;
    payment_method?: 'stripe' | 'pix';
    status?: string;
    plan?: string;
    format?: 'json' | 'csv';
}

export const adminApi = {
    getStats: async (): Promise<AdminStats> => {
        const response = await api.get('/api/admin/stats');
        return response.data;
    },

    getUsers: async (page = 1, limit = 20, search = ''): Promise<UserListResponse> => {
        const skip = (page - 1) * limit;
        const response = await api.get('/api/admin/users', {
            params: { skip, limit, search }
        });
        return response.data;
    },

    getUserDetails: async (userId: string): Promise<UserDetailsResponse> => {
        const response = await api.get(`/api/admin/users/${userId}`);
        return response.data;
    },

    updateUserAdminStatus: async (userId: number, isAdmin: boolean): Promise<User> => {
        const response = await api.patch(`/api/admin/users/${userId}/admin`, {
            is_admin: isAdmin
        });
        return response.data.user;
    },

    updateUserPlan: async (userId: number, plan: string, days?: number): Promise<User> => {
        const response = await api.put(`/api/admin/users/${userId}/plan`, {
            plan,
            days
        });
        return response.data.user;
    },

    // Sales Dashboard API
    getSalesOverview: async (): Promise<SalesOverview> => {
        const response = await api.get('/api/admin/sales/overview');
        return response.data;
    },

    getRevenueData: async (params?: SalesQueryParams): Promise<{ data: RevenueDataPoint[] }> => {
        const response = await api.get('/api/admin/sales/revenue', { params });
        return response.data;
    },

    getTransactions: async (params?: SalesQueryParams): Promise<TransactionListResponse> => {
        const response = await api.get('/api/admin/sales/transactions', { params });
        return response.data;
    },

    getSubscriptionMetrics: async (): Promise<SubscriptionMetrics> => {
        const response = await api.get('/api/admin/sales/subscriptions');
        return response.data;
    },

    getSalesTrends: async (period = 30): Promise<SalesTrends> => {
        const response = await api.get('/api/admin/sales/trends', { params: { period } });
        return response.data;
    },

    exportSalesData: async (params?: SalesQueryParams): Promise<SalesExportData> => {
        const response = await api.get('/api/admin/sales/export', { params });
        return response.data;
    }
};
