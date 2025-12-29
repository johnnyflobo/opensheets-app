import PageDescription from "@/components/page-description";
import { RiPieChartLine } from "@remixicon/react";

export const metadata = {
  title: "Relatórios | Opensheets",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-6 px-6">
      <PageDescription
        icon={<RiPieChartLine />}
        title="Relatórios"
        subtitle="Analise seus hábitos de consumo e acompanhe a evolução de suas despesas e receitas através de gráficos detalhados."
      />
      {children}
    </section>
  );
}
