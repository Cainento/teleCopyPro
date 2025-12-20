
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
    }
};
