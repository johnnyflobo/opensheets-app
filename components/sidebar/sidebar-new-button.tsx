"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  RiAddLine,
  RiArrowDownLine,
  RiArrowUpLine,
  RiBankCardLine,
  RiExchangeLine,
} from "@remixicon/react";
import { Plus } from "lucide-react";
import Link from "next/link";

export function SidebarNewButton() {
  const { isMobile } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground data-[state=open]:bg-primary/90 data-[state=open]:text-primary-foreground justify-center rounded-full shadow-md"
                >
                  <Plus className="size-5" />
                  <span className="font-semibold text-base">Novo</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 rounded-xl"
                side={isMobile ? "bottom" : "right"}
                align="start"
                sideOffset={4}
              >
                <DropdownMenuItem className="gap-2 p-2 focus:bg-destructive/10 focus:text-destructive cursor-pointer" asChild>
                  <Link href="/lancamentos?new=true&type=Despesa&method=Pix">
                    <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                      <RiArrowDownLine className="size-4 text-red-500" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">Despesa</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 p-2 focus:bg-emerald-500/10 focus:text-emerald-500 cursor-pointer" asChild>
                  <Link href="/lancamentos?new=true&type=Receita&method=Pix">
                    <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                      <RiArrowUpLine className="size-4 text-emerald-500" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">Receita</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 p-2 focus:bg-cyan-500/10 focus:text-cyan-500 cursor-pointer" asChild>
                  <Link href="/lancamentos?new=true&type=Despesa&method=Cartão+de+crédito">
                    <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                      <RiBankCardLine className="size-4 text-cyan-500" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">Despesa cartão</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 p-2 focus:bg-blue-500/10 focus:text-blue-500 cursor-pointer" asChild>
                  <Link href="/contas?action=transfer">
                    <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                      <RiExchangeLine className="size-4 text-blue-500" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">Transferência</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
