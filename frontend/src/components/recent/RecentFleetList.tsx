import { components } from "../../api/CatApi";
import { getFleetComp, getRecentFleetList, ShipCount } from "../../api/Methods";
import {
  ColumnFiltersState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  Row,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Pagination from "react-bootstrap/Pagination";
import Spinner from "react-bootstrap/Spinner";
import Table from "react-bootstrap/Table";
import { LinkContainer } from "react-router-bootstrap";

type Fleet = components["schemas"]["FleetDetails"];

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatDuration(start: string, end: string | null | undefined): string {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 0) return "—";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function DebouncedInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => onChange(local), 250);
    return () => clearTimeout(t);
  }, [local, onChange]);

  return (
    <Form.Control
      size="sm"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      placeholder={placeholder}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

function TopShips({ fleetId }: { fleetId: number }) {
  const { data, isPending } = useQuery({
    queryKey: ["getFleetComp", fleetId],
    queryFn: () => getFleetComp(fleetId),
    staleTime: Infinity,
  });

  if (isPending) return <Spinner animation="border" size="sm" />;

  const top5 = [...(data ?? [])].sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className="d-flex flex-wrap gap-1">
      {top5.map((ship: ShipCount) => (
        <span key={ship.name} className="badge bg-secondary">
          {ship.name} <span className="badge bg-dark ms-1">{ship.count}</span>
        </span>
      ))}
    </div>
  );
}

const formattedDateFilterFn = (row: Row<Fleet>, columnId: string, filterValue: string) =>
  formatDate(row.getValue(columnId)).toLowerCase().includes(filterValue.toLowerCase());

const columnHelper = createColumnHelper<Fleet>();

const columns = [
  columnHelper.accessor("name", {
    header: "Name",
    enableColumnFilter: true,
  }),
  columnHelper.accessor((row) => row.boss.character_name, {
    id: "boss",
    header: "Boss",
    enableColumnFilter: true,
    cell: ({ row }) => (
      <>
        {row.original.boss.character_name}
        {row.original.boss.corporation_ticker && (
          <span className="text-muted ms-1">({row.original.boss.corporation_ticker})</span>
        )}
      </>
    ),
  }),
  columnHelper.accessor("start_time", {
    header: "Start",
    enableColumnFilter: true,
    filterFn: formattedDateFilterFn,
    cell: ({ getValue }) => <span className="text-nowrap">{formatDate(getValue())}</span>,
  }),
  columnHelper.accessor((row) => formatDuration(row.start_time, row.end_time), {
    id: "duration",
    header: "Duration",
    enableColumnFilter: false,
    cell: ({ getValue }) => <span className="text-nowrap">{getValue()}</span>,
    sortingFn: (a, b) => {
      const ms = (row: Fleet) =>
        row.end_time
          ? new Date(row.end_time).getTime() - new Date(row.start_time).getTime()
          : -1;
      return ms(a.original) - ms(b.original);
    },
  }),
  columnHelper.display({
    id: "top_ships",
    header: "Top Ships",
    enableSorting: false,
    enableColumnFilter: false,
    cell: ({ row }) => <TopShips fleetId={row.original.eve_fleet_id} />,
  }),
  columnHelper.display({
    id: "actions",
    header: "",
    enableSorting: false,
    enableColumnFilter: false,
    cell: ({ row }) => (
      <LinkContainer to={`/cat/recent/${row.original.eve_fleet_id}/`}>
        <Button variant="primary" size="sm">
          View
        </Button>
      </LinkContainer>
    ),
  }),
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const RecentFleetList = () => {
  const [sorting, setSorting] = useState<SortingState>([{ id: "start_time", desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });

  const { data, isPending } = useQuery({
    queryKey: ["getRecentFleetList"],
    queryFn: async () => await getRecentFleetList(),
    refetchInterval: 5000,
  });

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: { sorting, columnFilters, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: (updater) => {
      setColumnFilters(updater);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (isPending) {
    return <Spinner animation="border" className="m-4" />;
  }

  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const totalRows = table.getFilteredRowModel().rows.length;

  return (
    <>
      <Table striped hover className="my-2">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  style={{
                    cursor: header.column.getCanSort() ? "pointer" : "default",
                    userSelect: "none",
                  }}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getIsSorted() === "asc" && " ↑"}
                  {header.column.getIsSorted() === "desc" && " ↓"}
                </th>
              ))}
            </tr>
          ))}
          <tr>
            {table.getHeaderGroups()[0].headers.map((header) => (
              <th key={header.id} style={{ fontWeight: "normal" }}>
                {header.column.getCanFilter() && (
                  <DebouncedInput
                    value={(header.column.getFilterValue() as string) ?? ""}
                    onChange={(v) => header.column.setFilterValue(v)}
                    placeholder="Filter…"
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
        <span className="text-muted small">
          {totalRows === 0
            ? "No results"
            : `${pageIndex * pageSize + 1}–${Math.min((pageIndex + 1) * pageSize, totalRows)} of ${totalRows}`}
        </span>

        <Pagination className="mb-0">
          <Pagination.First onClick={() => table.firstPage()} disabled={!table.getCanPreviousPage()} />
          <Pagination.Prev onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} />
          {Array.from({ length: pageCount }, (_, i) => i)
            .filter((i) => Math.abs(i - pageIndex) <= 2)
            .map((i) => (
              <Pagination.Item key={i} active={i === pageIndex} onClick={() => table.setPageIndex(i)}>
                {i + 1}
              </Pagination.Item>
            ))}
          <Pagination.Next onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} />
          <Pagination.Last onClick={() => table.lastPage()} disabled={!table.getCanNextPage()} />
        </Pagination>

        <Form.Select
          size="sm"
          style={{ width: "auto" }}
          value={pageSize}
          onChange={(e) => table.setPageSize(Number(e.target.value))}
        >
          {PAGE_SIZE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s} per page
            </option>
          ))}
        </Form.Select>
      </div>
    </>
  );
};

export default RecentFleetList;
