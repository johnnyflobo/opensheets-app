import { AccountsAnalysisWidget } from "@/components/dashboard/accounts-analysis-widget";
import { BoletosWidget } from "@/components/dashboard/boletos-widget";
import { CategoriesAnalysisWidget } from "@/components/dashboard/categories-analysis-widget";
import { ExpensesByCategoryWidget } from "@/components/dashboard/expenses-by-category-widget";
import { IncomeByCategoryWidget } from "@/components/dashboard/income-by-category-widget";
import { IncomeExpenseBalanceWidget } from "@/components/dashboard/income-expense-balance-widget";
import { InstallmentExpensesWidget } from "@/components/dashboard/installment-expenses-widget";
import { InvoicesWidget } from "@/components/dashboard/invoices-widget";
import { MyAccountsWidget } from "@/components/dashboard/my-accounts-widget";
import { PaymentAnalysisWidget } from "@/components/dashboard/payment-analysis-widget";
import { PaymentConditionsWidget } from "@/components/dashboard/payment-conditions-widget";
import { PaymentMethodsWidget } from "@/components/dashboard/payment-methods-widget";
import { PaymentStatusWidget } from "@/components/dashboard/payment-status-widget";
import { PurchasesByCategoryWidget } from "@/components/dashboard/purchases-by-category-widget";
import { RecentTransactionsWidget } from "@/components/dashboard/recent-transactions-widget";
import { RecurringExpensesWidget } from "@/components/dashboard/recurring-expenses-widget";
import { TopEstablishmentsWidget } from "@/components/dashboard/top-establishments-widget";
import { TopExpensesWidget } from "@/components/dashboard/top-expenses-widget";
import { TopAnalysisWidget } from "@/components/dashboard/top-analysis-widget";
import { TransactionsAnalysisWidget } from "@/components/dashboard/transactions-analysis-widget";
import {
  RiArrowUpDoubleLine,
  RiBarChartBoxLine,
  RiBarcodeLine,
  RiBillLine,
  RiExchangeLine,
  RiLineChartLine,
  RiMoneyDollarCircleLine,
  RiNumbersLine,
  RiPieChartLine,
  RiRefreshLine,
  RiSecurePaymentLine,
  RiSlideshowLine,
  RiStore2Line,
  RiStore3Line,
  RiWallet3Line,
} from "@remixicon/react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { DashboardData } from "../fetch-dashboard-data";

export type WidgetConfig = {
  id: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  component: (props: { data: DashboardData; period: string }) => ReactNode;
  action?: ReactNode;
};

export const widgetsConfig: WidgetConfig[] = [
  {
    id: "accounts-analysis",
    title: "Saldo e Faturas",
    subtitle: "Contas e Cartões de Crédito",
    icon: <RiBarChartBoxLine className="size-4" />,
    component: ({ data, period }) => (
      <AccountsAnalysisWidget
        accounts={data.accountsSnapshot.accounts}
        totalBalance={data.accountsSnapshot.totalBalance}
        invoices={data.invoicesSnapshot.invoices}
        period={period}
      />
    ),
  },
  {
    id: "payment-analysis",
    title: "Análise de Pagamentos",
    subtitle: "Status, condições e formas de pagamento",
    icon: <RiWallet3Line className="size-4" />,
    component: ({ data }) => (
      <PaymentAnalysisWidget
        statusData={data.paymentStatusData}
        conditionsData={data.paymentConditionsData}
        methodsData={data.paymentMethodsData}
      />
    ),
  },
  {
    id: "income-expense-balance",
    title: "Receita, Despesa e Balanço",
    subtitle: "Últimos 6 Meses",
    icon: <RiLineChartLine className="size-4" />,
    component: ({ data }) => (
      <IncomeExpenseBalanceWidget data={data.incomeExpenseBalanceData} />
    ),
  },
  {
    id: "transactions-analysis",
    title: "Análise de Lançamentos",
    subtitle: "Recentes, Recorrentes e Parcelados",
    icon: <RiExchangeLine className="size-4" />,
    component: ({ data }) => (
      <TransactionsAnalysisWidget
        recentData={data.recentTransactionsData}
        recurringData={data.recurringExpensesData}
        installmentData={data.installmentExpensesData}
      />
    ),
  },
  {
    id: "top-analysis",
    title: "Análise de Destaques",
    subtitle: "Maiores gastos e estabelecimentos",
    icon: <RiArrowUpDoubleLine className="size-4" />,
    component: ({ data }) => (
      <TopAnalysisWidget
        allExpenses={data.topExpensesAll}
        cardOnlyExpenses={data.topExpensesCardOnly}
        establishmentsData={data.topEstablishmentsData}
      />
    ),
  },
  {
    id: "categories-analysis",
    title: "Análise de Categorias",
    subtitle: "Visão detalhada por categorias",
    icon: <RiPieChartLine className="size-4" />,
    component: ({ data, period }) => (
      <CategoriesAnalysisWidget
        expensesData={data.expensesByCategoryData}
        purchasesData={data.purchasesByCategoryData}
        period={period}
      />
    ),
  },
];
