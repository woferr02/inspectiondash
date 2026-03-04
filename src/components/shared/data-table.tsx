"use client";

import { useState, useMemo, useCallback, type ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight } from "lucide-react";

// ─── Types ───

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  render: (item: T) => ReactNode;
  sortValue?: (item: T) => string | number | null;
  filterValue?: (item: T) => string;
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
  allLabel?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  filters?: FilterConfig[];
  searchPlaceholder?: string;
  searchFn?: (item: T, query: string) => boolean;
  pageSize?: number;
  onRowClick?: (item: T) => void;
  emptyState?: ReactNode;
  getRowKey: (item: T) => string;
}

// ─── Component ───

export function DataTable<T>({
  data,
  columns,
  filters = [],
  searchPlaceholder = "Search...",
  searchFn,
  pageSize = 25,
  onRowClick,
  emptyState,
  getRowKey,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState(0);

  // Filter
  const filtered = useMemo(() => {
    let result = data;

    // Text search
    if (search && searchFn) {
      const q = search.toLowerCase();
      result = result.filter((item) => searchFn(item, q));
    }

    // Discrete filters
    for (const f of filters) {
      const val = filterValues[f.key];
      if (val && val !== "__all__") {
        result = result.filter((item) => {
          const col = columns.find((c) => c.key === f.key);
          if (!col) return true;
          const fv = col.filterValue
            ? col.filterValue(item)
            : col.sortValue
              ? String(col.sortValue(item))
              : "";
          return fv === val;
        });
      }
    }

    return result;
  }, [data, search, searchFn, filters, filterValues, columns]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return filtered;

    return [...filtered].sort((a, b) => {
      const aVal = col.sortValue!(a);
      const bVal = col.sortValue!(b);
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      const cmp = typeof aVal === "string" && typeof bVal === "string"
        ? aVal.localeCompare(bVal)
        : Number(aVal) - Number(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, columns]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paged = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  // Reset page on filter/search changes
  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(0); }, []);
  const handleFilter = useCallback((key: string, v: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: v }));
    setPage(0);
  }, []);

  const handleSort = useCallback((key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }, [sortKey]);

  return (
    <div className="space-y-4">
      {/* Toolbar: search + filters */}
      {(searchFn || filters.length > 0) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {searchFn && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          )}
          {filters.map((f) => (
            <Select
              key={f.key}
              value={filterValues[f.key] || "__all__"}
              onValueChange={(v) => handleFilter(f.key, v)}
            >
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder={f.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{f.allLabel || `All ${f.label}`}</SelectItem>
                {f.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
      )}

      {/* Table */}
      {paged.length === 0 ? (
        emptyState ?? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No results found.
          </p>
        )
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={col.headerClassName || "text-xs uppercase tracking-wider"}
                  >
                    {col.sortable ? (
                      <button
                        onClick={() => handleSort(col.key)}
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        {col.label}
                        {sortKey === col.key ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.label
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((item) => (
                <TableRow
                  key={getRowKey(item)}
                  className={onRowClick ? "cursor-pointer hover:bg-muted/50 transition-colors" : "hover:bg-muted/50 transition-colors"}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.render(item)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {sorted.length > pageSize && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Showing {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, sorted.length)}{" "}
            of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={safePage === 0}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-muted-foreground tabular-nums">
              {safePage + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
