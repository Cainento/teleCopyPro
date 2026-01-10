"""Sales analytics service for admin dashboard revenue and subscription insights."""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Literal
from sqlalchemy import func, select, desc, and_, case
from sqlalchemy.ext.asyncio import AsyncSession
from decimal import Decimal

from app.core.logger import get_logger
from app.database.models import User as DBUser, Invoice, PixPayment
from app.models.user import UserPlan

logger = get_logger(__name__)


class SalesAnalyticsService:
    """Service for sales analytics and revenue metrics."""

    def __init__(self, db: AsyncSession):
        """Initialize sales analytics service with database session."""
        self.db = db

    async def get_sales_overview(self) -> Dict[str, Any]:
        """
        Get main sales KPI metrics.

        Returns:
            Dictionary with revenue totals, subscription counts, and key metrics
        """
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)
        month_start = today_start.replace(day=1)
        
        # Revenue from Stripe (Invoices) - amounts are in currency (float)
        stripe_total = await self.db.scalar(
            select(func.coalesce(func.sum(Invoice.amount), 0))
            .where(Invoice.status == "paid")
        ) or 0
        
        stripe_monthly = await self.db.scalar(
            select(func.coalesce(func.sum(Invoice.amount), 0))
            .where(Invoice.status == "paid", Invoice.paid_at >= month_start)
        ) or 0
        
        stripe_weekly = await self.db.scalar(
            select(func.coalesce(func.sum(Invoice.amount), 0))
            .where(Invoice.status == "paid", Invoice.paid_at >= week_start)
        ) or 0
        
        stripe_daily = await self.db.scalar(
            select(func.coalesce(func.sum(Invoice.amount), 0))
            .where(Invoice.status == "paid", Invoice.paid_at >= today_start)
        ) or 0
        
        # Revenue from PIX (PagBank) - amounts are in centavos
        pix_total_centavos = await self.db.scalar(
            select(func.coalesce(func.sum(PixPayment.amount), 0))
            .where(PixPayment.status == "paid")
        ) or 0
        
        pix_monthly_centavos = await self.db.scalar(
            select(func.coalesce(func.sum(PixPayment.amount), 0))
            .where(PixPayment.status == "paid", PixPayment.paid_at >= month_start)
        ) or 0
        
        pix_weekly_centavos = await self.db.scalar(
            select(func.coalesce(func.sum(PixPayment.amount), 0))
            .where(PixPayment.status == "paid", PixPayment.paid_at >= week_start)
        ) or 0
        
        pix_daily_centavos = await self.db.scalar(
            select(func.coalesce(func.sum(PixPayment.amount), 0))
            .where(PixPayment.status == "paid", PixPayment.paid_at >= today_start)
        ) or 0
        
        # Convert PIX centavos to currency
        pix_total = pix_total_centavos / 100
        pix_monthly = pix_monthly_centavos / 100
        pix_weekly = pix_weekly_centavos / 100
        pix_daily = pix_daily_centavos / 100
        
        # Combined totals
        total_revenue = float(stripe_total) + float(pix_total)
        monthly_revenue = float(stripe_monthly) + float(pix_monthly)
        weekly_revenue = float(stripe_weekly) + float(pix_weekly)
        daily_revenue = float(stripe_daily) + float(pix_daily)
        
        # User counts
        total_users = await self.db.scalar(select(func.count(DBUser.id))) or 0
        paid_users = await self.db.scalar(
            select(func.count(DBUser.id))
            .where(DBUser.plan.in_([UserPlan.PREMIUM.value, UserPlan.ENTERPRISE.value]))
        ) or 0
        free_users = total_users - paid_users
        
        # Calculate conversion rate
        conversion_rate = (paid_users / total_users * 100) if total_users > 0 else 0
        
        # Calculate ARPU (Average Revenue Per User)
        arpu = total_revenue / paid_users if paid_users > 0 else 0
        
        # Transaction counts
        total_transactions = await self.db.scalar(
            select(func.count(Invoice.id)).where(Invoice.status == "paid")
        ) or 0
        total_transactions += await self.db.scalar(
            select(func.count(PixPayment.id)).where(PixPayment.status == "paid")
        ) or 0
        
        return {
            "revenue": {
                "total": round(total_revenue, 2),
                "monthly": round(monthly_revenue, 2),
                "weekly": round(weekly_revenue, 2),
                "daily": round(daily_revenue, 2),
                "currency": "BRL"
            },
            "revenue_by_method": {
                "stripe": round(float(stripe_total), 2),
                "pix": round(float(pix_total), 2)
            },
            "users": {
                "total": total_users,
                "paid": paid_users,
                "free": free_users,
                "conversion_rate": round(conversion_rate, 2)
            },
            "metrics": {
                "arpu": round(arpu, 2),
                "total_transactions": total_transactions
            }
        }

    async def get_revenue_by_period(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        granularity: Literal["day", "week", "month"] = "day"
    ) -> List[Dict[str, Any]]:
        """
        Get revenue time series data for charts.

        Args:
            start_date: Start of period (defaults to 30 days ago)
            end_date: End of period (defaults to now)
            granularity: Grouping granularity (day, week, month)

        Returns:
            List of data points with date and revenue amounts
        """
        if end_date is None:
            end_date = datetime.utcnow()
        if start_date is None:
            start_date = end_date - timedelta(days=30)
        
        results = []
        current = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        
        while current <= end_date:
            if granularity == "day":
                period_end = current + timedelta(days=1)
            elif granularity == "week":
                period_end = current + timedelta(weeks=1)
            else:  # month
                # Move to next month
                if current.month == 12:
                    period_end = current.replace(year=current.year + 1, month=1)
                else:
                    period_end = current.replace(month=current.month + 1)
            
            # Stripe revenue for this period
            stripe_amount = await self.db.scalar(
                select(func.coalesce(func.sum(Invoice.amount), 0))
                .where(
                    Invoice.status == "paid",
                    Invoice.paid_at >= current,
                    Invoice.paid_at < period_end
                )
            ) or 0
            
            # PIX revenue for this period (centavos to BRL)
            pix_amount_centavos = await self.db.scalar(
                select(func.coalesce(func.sum(PixPayment.amount), 0))
                .where(
                    PixPayment.status == "paid",
                    PixPayment.paid_at >= current,
                    PixPayment.paid_at < period_end
                )
            ) or 0
            
            total = float(stripe_amount) + (pix_amount_centavos / 100)
            
            results.append({
                "date": current.strftime("%Y-%m-%d"),
                "revenue": round(total, 2),
                "stripe": round(float(stripe_amount), 2),
                "pix": round(pix_amount_centavos / 100, 2)
            })
            
            current = period_end
        
        return results

    async def get_revenue_by_payment_method(self) -> Dict[str, Any]:
        """
        Get revenue breakdown by payment method.

        Returns:
            Dictionary with Stripe and PIX revenue totals
        """
        stripe_total = await self.db.scalar(
            select(func.coalesce(func.sum(Invoice.amount), 0))
            .where(Invoice.status == "paid")
        ) or 0
        
        pix_total_centavos = await self.db.scalar(
            select(func.coalesce(func.sum(PixPayment.amount), 0))
            .where(PixPayment.status == "paid")
        ) or 0
        
        stripe_count = await self.db.scalar(
            select(func.count(Invoice.id)).where(Invoice.status == "paid")
        ) or 0
        
        pix_count = await self.db.scalar(
            select(func.count(PixPayment.id)).where(PixPayment.status == "paid")
        ) or 0
        
        return {
            "stripe": {
                "total": round(float(stripe_total), 2),
                "count": stripe_count
            },
            "pix": {
                "total": round(pix_total_centavos / 100, 2),
                "count": pix_count
            }
        }

    async def get_revenue_by_plan(self) -> Dict[str, Any]:
        """
        Get revenue breakdown by plan type.

        Returns:
            Dictionary with Premium and Enterprise revenue
        """
        # PIX payments have plan field
        pix_premium_centavos = await self.db.scalar(
            select(func.coalesce(func.sum(PixPayment.amount), 0))
            .where(PixPayment.status == "paid", PixPayment.plan == UserPlan.PREMIUM.value)
        ) or 0
        
        pix_enterprise_centavos = await self.db.scalar(
            select(func.coalesce(func.sum(PixPayment.amount), 0))
            .where(PixPayment.status == "paid", PixPayment.plan == UserPlan.ENTERPRISE.value)
        ) or 0
        
        # For Stripe, we need to estimate based on amount ranges
        # Premium Monthly ~59.90, Annual ~599.00
        # Enterprise Monthly ~99.90, Annual ~999.00
        
        # Get all paid Stripe invoices
        stripe_invoices_result = await self.db.execute(
            select(Invoice.amount).where(Invoice.status == "paid")
        )
        stripe_invoices = stripe_invoices_result.scalars().all()
        
        stripe_premium = 0.0
        stripe_enterprise = 0.0
        
        for amount in stripe_invoices:
            # Classify based on amount thresholds
            if amount <= 100:  # Premium monthly
                stripe_premium += float(amount)
            elif amount <= 150:  # Enterprise monthly
                stripe_enterprise += float(amount)
            elif amount <= 650:  # Premium annual
                stripe_premium += float(amount)
            else:  # Enterprise annual
                stripe_enterprise += float(amount)
        
        premium_total = stripe_premium + (pix_premium_centavos / 100)
        enterprise_total = stripe_enterprise + (pix_enterprise_centavos / 100)
        
        return {
            "premium": {
                "total": round(premium_total, 2),
                "label": "Premium"
            },
            "enterprise": {
                "total": round(enterprise_total, 2),
                "label": "Enterprise"
            }
        }

    async def get_subscription_metrics(self) -> Dict[str, Any]:
        """
        Get subscription-related metrics.

        Returns:
            Dictionary with subscription counts and rates
        """
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Active subscriptions (users with valid paid plans)
        active_premium = await self.db.scalar(
            select(func.count(DBUser.id))
            .where(
                DBUser.plan == UserPlan.PREMIUM.value,
                (DBUser.plan_expiry.is_(None)) | (DBUser.plan_expiry > now)
            )
        ) or 0
        
        active_enterprise = await self.db.scalar(
            select(func.count(DBUser.id))
            .where(
                DBUser.plan == UserPlan.ENTERPRISE.value,
                (DBUser.plan_expiry.is_(None)) | (DBUser.plan_expiry > now)
            )
        ) or 0
        
        # Expired subscriptions (churned)
        churned = await self.db.scalar(
            select(func.count(DBUser.id))
            .where(
                DBUser.plan == UserPlan.FREE.value,
                DBUser.plan_expiry.isnot(None),
                DBUser.plan_expiry < now
            )
        ) or 0
        
        # New subscriptions this month (PIX paid this month)
        new_pix_this_month = await self.db.scalar(
            select(func.count(PixPayment.id))
            .where(PixPayment.status == "paid", PixPayment.paid_at >= month_start)
        ) or 0
        
        # Stripe new subscriptions this month
        new_stripe_this_month = await self.db.scalar(
            select(func.count(Invoice.id))
            .where(Invoice.status == "paid", Invoice.paid_at >= month_start)
        ) or 0
        
        total_active = active_premium + active_enterprise
        new_this_month = new_pix_this_month + new_stripe_this_month
        
        # Estimate MRR (Monthly Recurring Revenue)
        # Premium: R$59.90/month, Enterprise: R$99.90/month
        mrr = (active_premium * 59.90) + (active_enterprise * 99.90)
        
        return {
            "active_subscriptions": {
                "total": total_active,
                "premium": active_premium,
                "enterprise": active_enterprise
            },
            "new_this_month": new_this_month,
            "churned": churned,
            "mrr": round(mrr, 2),
            "currency": "BRL"
        }

    async def get_transactions_paginated(
        self,
        skip: int = 0,
        limit: int = 20,
        payment_method: Optional[str] = None,
        status: Optional[str] = None,
        plan: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Get paginated list of all transactions.

        Args:
            skip: Number of records to skip
            limit: Number of records to return
            payment_method: Filter by 'stripe' or 'pix'
            status: Filter by status
            plan: Filter by plan type
            start_date: Filter by start date
            end_date: Filter by end date

        Returns:
            Dictionary with items and total count
        """
        transactions = []
        
        # Get Stripe transactions if not filtered to PIX only
        if payment_method is None or payment_method == "stripe":
            stripe_query = select(Invoice).join(DBUser)
            
            if status:
                stripe_query = stripe_query.where(Invoice.status == status)
            if start_date:
                stripe_query = stripe_query.where(Invoice.created_at >= start_date)
            if end_date:
                stripe_query = stripe_query.where(Invoice.created_at <= end_date)
            
            stripe_result = await self.db.execute(
                stripe_query.options()
            )
            stripe_invoices = stripe_result.scalars().all()
            
            for inv in stripe_invoices:
                # Get user info
                user_result = await self.db.execute(
                    select(DBUser).where(DBUser.id == inv.user_id)
                )
                user = user_result.scalar_one_or_none()
                
                transactions.append({
                    "id": inv.stripe_invoice_id,
                    "type": "stripe",
                    "user_id": inv.user_id,
                    "user_name": user.name if user else "Unknown",
                    "user_email": user.email if user else "Unknown",
                    "amount": float(inv.amount),
                    "currency": inv.currency,
                    "status": inv.status,
                    "plan": "unknown",  # Stripe invoices don't store plan
                    "created_at": inv.created_at.isoformat() if inv.created_at else None,
                    "paid_at": inv.paid_at.isoformat() if inv.paid_at else None
                })
        
        # Get PIX transactions if not filtered to Stripe only
        if payment_method is None or payment_method == "pix":
            pix_query = select(PixPayment).join(DBUser)
            
            if status:
                pix_query = pix_query.where(PixPayment.status == status)
            if plan:
                pix_query = pix_query.where(PixPayment.plan == plan)
            if start_date:
                pix_query = pix_query.where(PixPayment.created_at >= start_date)
            if end_date:
                pix_query = pix_query.where(PixPayment.created_at <= end_date)
            
            pix_result = await self.db.execute(pix_query)
            pix_payments = pix_result.scalars().all()
            
            for pix in pix_payments:
                # Get user info
                user_result = await self.db.execute(
                    select(DBUser).where(DBUser.id == pix.user_id)
                )
                user = user_result.scalar_one_or_none()
                
                transactions.append({
                    "id": pix.order_id,
                    "type": "pix",
                    "user_id": pix.user_id,
                    "user_name": user.name if user else "Unknown",
                    "user_email": user.email if user else "Unknown",
                    "amount": pix.amount / 100,  # Convert centavos to BRL
                    "currency": pix.currency,
                    "status": pix.status,
                    "plan": pix.plan.value if pix.plan else "unknown",
                    "billing_cycle": pix.billing_cycle,
                    "created_at": pix.created_at.isoformat() if pix.created_at else None,
                    "paid_at": pix.paid_at.isoformat() if pix.paid_at else None
                })
        
        # Sort by created_at descending
        transactions.sort(key=lambda x: x["created_at"] or "", reverse=True)
        
        # Apply pagination
        total = len(transactions)
        paginated = transactions[skip:skip + limit]
        
        return {
            "items": paginated,
            "total": total,
            "page": (skip // limit) + 1,
            "size": limit
        }

    async def get_all_transactions_for_export(
        self,
        payment_method: Optional[str] = None,
        status: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all transactions for export (no pagination).

        Returns:
            List of all matching transactions
        """
        result = await self.get_transactions_paginated(
            skip=0,
            limit=100000,  # High limit to get all
            payment_method=payment_method,
            status=status,
            start_date=start_date,
            end_date=end_date
        )
        return result["items"]
