"use client";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { RiFilter3Line } from "@remixicon/react";
import {
  LANCAMENTO_CONDITIONS,
  LANCAMENTO_PAYMENT_METHODS,
  LANCAMENTO_TRANSACTION_TYPES,
} from "@/lib/lancamentos/constants";
import { cn } from "@/lib/utils/ui";
import {
  TransactionTypeSelectContent,
  ConditionSelectContent,
  PaymentMethodSelectContent,
  CategoriaSelectContent,
  PagadorSelectContent,
  ContaCartaoSelectContent,
} from "../select-items";

import type { ContaCartaoFilterOption, LancamentoFilterOption } from "../types";

const FILTER_EMPTY_VALUE = "__all";

const buildStaticOptions = (values: readonly string[]) =>
  values.map((value) => ({ value, label: value }));

interface FilterSelectProps {
  param: string;
  placeholder: string;
  options: { value: string; label: string }[];
  widthClass?: string;
  disabled?: boolean;
  getParamValue: (key: string) => string;
  onChange: (key: string, value: string | null) => void;
  renderContent?: (label: string) => ReactNode;
}

function FilterSelect({
  param,
  placeholder,
  options,
  widthClass = "w-[130px]",
  disabled,
  getParamValue,
  onChange,
  renderContent,
}: FilterSelectProps) {
  const value = getParamValue(param);
  const current = options.find((option) => option.value === value);
  const displayLabel =
    value === FILTER_EMPTY_VALUE ? placeholder : current?.label ?? placeholder;

  return (
    <Select
      value={value}
      onValueChange={(nextValue) =>
        onChange(param, nextValue === FILTER_EMPTY_VALUE ? null : nextValue)
      }
      disabled={disabled}
    >
      <SelectTrigger
        className={cn("text-sm border-dashed", widthClass)}
        disabled={disabled}
      >
        <span className="truncate">
          {value !== FILTER_EMPTY_VALUE && current && renderContent
            ? renderContent(current.label)
            : displayLabel}
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={FILTER_EMPTY_VALUE}>Todos</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {renderContent ? renderContent(option.label) : option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface LancamentosFiltersProps {
  pagadorOptions: LancamentoFilterOption[];
  categoriaOptions: LancamentoFilterOption[];
  contaCartaoOptions: ContaCartaoFilterOption[];
  className?: string;
}

export function LancamentosFilters({
  pagadorOptions,
  categoriaOptions,
  contaCartaoOptions,
  className,
}: LancamentosFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const getParamValue = useCallback(
    (key: string) => searchParams.get(key) ?? FILTER_EMPTY_VALUE,
    [searchParams]
  );

  const handleFilterChange = useCallback(
    (key: string, value: string | null) => {
      const nextParams = new URLSearchParams(searchParams.toString());

      if (value && value !== FILTER_EMPTY_VALUE) {
        nextParams.set(key, value);
      } else {
        nextParams.delete(key);
      }

      startTransition(() => {
        router.replace(`${pathname}?${nextParams.toString()}`, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams, startTransition]
  );

  const [searchValue, setSearchValue] = useState(searchParams.get("q") ?? "");
  const currentSearchParam = searchParams.get("q") ?? "";

  useEffect(() => {
    setSearchValue(currentSearchParam);
  }, [currentSearchParam]);

  useEffect(() => {
    if (searchValue === currentSearchParam) {
      return;
    }

    const timeout = setTimeout(() => {
      const normalized = searchValue.trim();
      handleFilterChange("q", normalized.length > 0 ? normalized : null);
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchValue, currentSearchParam, handleFilterChange]);

  const handleReset = useCallback(() => {
    const periodValue = searchParams.get("periodo");
    const nextParams = new URLSearchParams();
    if (periodValue) {
      nextParams.set("periodo", periodValue);
    }
    setSearchValue("");
    setCategoriaOpen(false);
    startTransition(() => {
      const target = nextParams.toString()
        ? `${pathname}?${nextParams.toString()}`
        : pathname;
      router.replace(target, { scroll: false });
    });
  }, [pathname, router, searchParams, startTransition]);

  const pagadorSelectOptions = useMemo(
    () =>
      pagadorOptions.map((option) => ({
        value: option.slug,
        label: option.label,
        avatarUrl: option.avatarUrl,
      })),
    [pagadorOptions]
  );

  const contaOptions = useMemo(
    () =>
      contaCartaoOptions
        .filter((option) => option.kind === "conta")
        .map((option) => ({
          value: option.slug,
          label: option.label,
          logo: option.logo,
        })),
    [contaCartaoOptions]
  );

  const cartaoOptions = useMemo(
    () =>
      contaCartaoOptions
        .filter((option) => option.kind === "cartao")
        .map((option) => ({
          value: option.slug,
          label: option.label,
          logo: option.logo,
        })),
    [contaCartaoOptions]
  );

  const categoriaValue = getParamValue("categoria");
  const selectedCategoria =
    categoriaValue !== FILTER_EMPTY_VALUE
      ? categoriaOptions.find((option) => option.slug === categoriaValue)
      : null;

  const pagadorValue = getParamValue("pagador");
  const selectedPagador =
    pagadorValue !== FILTER_EMPTY_VALUE
      ? pagadorOptions.find((option) => option.slug === pagadorValue)
      : null;

  const contaCartaoValue = getParamValue("contaCartao");
  const selectedContaCartao =
    contaCartaoValue !== FILTER_EMPTY_VALUE
      ? contaCartaoOptions.find((option) => option.slug === contaCartaoValue)
      : null;

  const [categoriaOpen, setCategoriaOpen] = useState(false);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (getParamValue("transacao") !== FILTER_EMPTY_VALUE) count++;
    if (getParamValue("condicao") !== FILTER_EMPTY_VALUE) count++;
    if (getParamValue("pagamento") !== FILTER_EMPTY_VALUE) count++;
    if (getParamValue("pagador") !== FILTER_EMPTY_VALUE) count++;
    if (getParamValue("categoria") !== FILTER_EMPTY_VALUE) count++;
    if (getParamValue("contaCartao") !== FILTER_EMPTY_VALUE) count++;
    return count;
  }, [searchParams, getParamValue]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Input
        value={searchValue}
        onChange={(event) => setSearchValue(event.target.value)}
        placeholder="Buscar lançamentos..."
        aria-label="Buscar lançamentos"
        className="h-9 flex-1 lg:max-w-[300px]"
      />

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-2">
             <RiFilter3Line className="size-4" />
             <span>Filtros</span>
             {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="px-1.5 h-5 min-w-5 flex items-center justify-center text-[10px]">
                    {activeFiltersCount}
                </Badge>
             )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:w-[400px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
          </SheetHeader>
          <div className="mt-6 flex flex-col gap-4">
             <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Tipo de Transação</span>
                <FilterSelect
                    param="transacao"
                    placeholder="Todos os tipos"
                    options={buildStaticOptions(LANCAMENTO_TRANSACTION_TYPES)}
                    widthClass="w-full"
                    disabled={isPending}
                    getParamValue={getParamValue}
                    onChange={handleFilterChange}
                    renderContent={(label) => (
                    <TransactionTypeSelectContent label={label} />
                    )}
                />
             </div>

             <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Condição</span>
                 <FilterSelect
                    param="condicao"
                    placeholder="Todas as condições"
                    options={buildStaticOptions(LANCAMENTO_CONDITIONS)}
                    widthClass="w-full"
                    disabled={isPending}
                    getParamValue={getParamValue}
                    onChange={handleFilterChange}
                    renderContent={(label) => <ConditionSelectContent label={label} />}
                />
             </div>

             <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Forma de Pagamento</span>
                <FilterSelect
                    param="pagamento"
                    placeholder="Todas as formas"
                    options={buildStaticOptions(LANCAMENTO_PAYMENT_METHODS)}
                    widthClass="w-full"
                    disabled={isPending}
                    getParamValue={getParamValue}
                    onChange={handleFilterChange}
                    renderContent={(label) => <PaymentMethodSelectContent label={label} />}
                />
             </div>

             <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Pagador</span>
                <Select
                    value={getParamValue("pagador")}
                    onValueChange={(value) =>
                    handleFilterChange(
                        "pagador",
                        value === FILTER_EMPTY_VALUE ? null : value
                    )
                    }
                    disabled={isPending}
                >
                    <SelectTrigger
                    className="w-full text-sm border-dashed"
                    disabled={isPending}
                    >
                    <span className="truncate">
                        {selectedPagador ? (
                        <PagadorSelectContent
                            label={selectedPagador.label}
                            avatarUrl={selectedPagador.avatarUrl}
                        />
                        ) : (
                        "Todos os pagadores"
                        )}
                    </span>
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value={FILTER_EMPTY_VALUE}>Todos</SelectItem>
                    {pagadorSelectOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                        <PagadorSelectContent
                            label={option.label}
                            avatarUrl={option.avatarUrl}
                        />
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
             </div>

             <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Categoria</span>
                 <Popover open={categoriaOpen} onOpenChange={setCategoriaOpen}>
                    <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={categoriaOpen}
                        className="w-full justify-between text-sm border-dashed border-input"
                        disabled={isPending}
                    >
                        <span className="truncate flex items-center gap-2">
                        {selectedCategoria ? (
                            <CategoriaSelectContent
                            label={selectedCategoria.label}
                            icon={selectedCategoria.icon}
                            />
                        ) : (
                            "Todas as categorias"
                        )}
                        </span>
                        <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[300px] p-0">
                    <Command>
                        <CommandInput placeholder="Buscar categoria..." />
                        <CommandList>
                        <CommandEmpty>Nada encontrado.</CommandEmpty>
                        <CommandGroup>
                            <CommandItem
                            value={FILTER_EMPTY_VALUE}
                            onSelect={() => {
                                handleFilterChange("categoria", null);
                                setCategoriaOpen(false);
                            }}
                            >
                            Todas
                            {categoriaValue === FILTER_EMPTY_VALUE ? (
                                <CheckIcon className="ml-auto size-4" />
                            ) : null}
                            </CommandItem>
                            {categoriaOptions.map((option) => (
                            <CommandItem
                                key={option.slug}
                                value={option.slug}
                                onSelect={() => {
                                handleFilterChange("categoria", option.slug);
                                setCategoriaOpen(false);
                            }}
                            >
                                <CategoriaSelectContent
                                label={option.label}
                                icon={option.icon}
                                />
                                {categoriaValue === option.slug ? (
                                <CheckIcon className="ml-auto size-4" />
                                ) : null}
                            </CommandItem>
                            ))}
                        </CommandGroup>
                        </CommandList>
                    </Command>
                    </PopoverContent>
                </Popover>
             </div>

             <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Conta/Cartão</span>
                <Select
                    value={getParamValue("contaCartao")}
                    onValueChange={(value) =>
                    handleFilterChange(
                        "contaCartao",
                        value === FILTER_EMPTY_VALUE ? null : value
                    )
                    }
                    disabled={isPending}
                >
                    <SelectTrigger
                    className="w-full text-sm border-dashed"
                    disabled={isPending}
                    >
                    <span className="truncate">
                        {selectedContaCartao ? (
                        <ContaCartaoSelectContent
                            label={selectedContaCartao.label}
                            logo={selectedContaCartao.logo}
                            isCartao={selectedContaCartao.kind === "cartao"}
                        />
                        ) : (
                        "Todas contas e cartões"
                        )}
                    </span>
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value={FILTER_EMPTY_VALUE}>Todos</SelectItem>
                    {contaOptions.length > 0 ? (
                        <SelectGroup>
                        <SelectLabel>Contas</SelectLabel>
                        {contaOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                            <ContaCartaoSelectContent
                                label={option.label}
                                logo={option.logo}
                                isCartao={false}
                            />
                            </SelectItem>
                        ))}
                        </SelectGroup>
                    ) : null}
                    {cartaoOptions.length > 0 ? (
                        <SelectGroup>
                        <SelectLabel>Cartões</SelectLabel>
                        {cartaoOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                            <ContaCartaoSelectContent
                                label={option.label}
                                logo={option.logo}
                                isCartao={true}
                            />
                            </SelectItem>
                        ))}
                        </SelectGroup>
                    ) : null}
                    </SelectContent>
                </Select>
             </div>

             <Button
                variant="destructive"
                className="mt-4"
                onClick={() => {
                    handleReset();
                    // Optionally close sheet here if we had control over open state
                }}
                disabled={isPending || activeFiltersCount === 0 && !searchValue}
            >
                Limpar Filtros
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
