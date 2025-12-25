"use client";

import { regeneratePagadorShareCodeAction } from "@/app/(dashboard)/pagadores/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RiClipboardLine,
  RiRefreshLine,
  RiUserHeartLine,
} from "@remixicon/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { Pagador } from "./types";

interface InviteFamilyDialogProps {
  pagador: Pagador;
  trigger?: React.ReactNode;
}

export function InviteFamilyDialog({
  pagador,
  trigger,
}: InviteFamilyDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentCode, setCurrentCode] = useState(pagador.shareCode);
  const [isPending, startTransition] = useTransition();

  const handleCopyCode = () => {
    if (!currentCode) return;
    navigator.clipboard.writeText(currentCode);
    toast.success("Código copiado para a área de transferência.");
  };

  const handleRegenerateCode = () => {
    startTransition(async () => {
      const result = await regeneratePagadorShareCodeAction({
        pagadorId: pagador.id,
      });

      if (result.success && "code" in result) {
        setCurrentCode(result.code);
        toast.success(result.message);
      } else if (!result.success) {
        toast.error(result.error);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <RiUserHeartLine className="mr-2 size-4" />
            Convidar Família
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar Família</DialogTitle>
          <DialogDescription>
            Compartilhe este código com membros da sua família para que eles
            possam acessar e gerenciar suas finanças conjuntamente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="space-y-2">
            <Label>Código de Acesso</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={currentCode ?? "Sem código gerado"}
                className="font-mono"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={handleCopyCode}
                disabled={!currentCode}
                title="Copiar código"
              >
                <RiClipboardLine className="size-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Este código concede acesso total (Administrador) aos dados desta
              conta. Compartilhe com cuidado.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRegenerateCode}
            disabled={isPending}
            className="text-muted-foreground"
          >
            <RiRefreshLine className="mr-2 size-4" />
            {isPending ? "Gerando..." : "Gerar novo código"}
          </Button>
          <Button onClick={() => setIsOpen(false)}>Concluído</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
