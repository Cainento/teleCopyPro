/**
 * PagBank API client for managing PIX payments
 */

import apiClient from "./client";

export interface CreatePixOrderRequest {
    plan: 'premium' | 'enterprise';
    billing_cycle: 'monthly' | 'annual';
    customer_tax_id: string;  // CPF (11 digits)
}

export interface CreatePixOrderResponse {
    order_id: string;
    reference_id: string;
    qr_code_text: string;
    qr_code_url: string;
    amount: number;
    formatted_amount: string;
    expiration_date: string;
    plan: string;
    billing_cycle: string;
    message: string;
}

export interface PixOrderStatus {
    order_id: string;
    status: 'pending' | 'paid' | 'expired' | 'cancelled';
    plan: string | null;
    billing_cycle: string;
    amount: number;
    paid_at: string | null;
    expiration_date: string | null;
}

/**
 * Create a PIX order with QR Code for payment
 */
export async function createPixOrder(
    request: CreatePixOrderRequest
): Promise<CreatePixOrderResponse> {
    const response = await apiClient.post<CreatePixOrderResponse>(
        "/api/pagbank/create-pix-order",
        request
    );
    return response.data;
}

/**
 * Get PIX order status
 */
export async function getPixOrderStatus(orderId: string): Promise<PixOrderStatus> {
    const response = await apiClient.get<PixOrderStatus>(
        `/api/pagbank/order-status/${orderId}`
    );
    return response.data;
}

/**
 * Format CPF for display (XXX.XXX.XXX-XX)
 */
export function formatCpf(cpf: string): string {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return cpf;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Validate CPF format (basic validation - 11 digits)
 */
export function isValidCpf(cpf: string): boolean {
    const digits = cpf.replace(/\D/g, '');
    return digits.length === 11;
}

/**
 * Extract only digits from CPF string
 */
export function cleanCpf(cpf: string): string {
    return cpf.replace(/\D/g, '');
}
