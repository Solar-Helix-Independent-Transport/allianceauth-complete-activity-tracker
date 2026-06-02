import { components } from "../api/CatApi";
import { FleetStreamData, getFleetSnapshot, getFleetStream, getFleetSystemStream } from "../api/Methods";
import { useFleetId } from "../hooks/useFleetId";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, TooltipProps, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Spinner from "react-bootstrap/Spinner";
import Table from "react-bootstrap/Table";

type SnapChar = components["schemas"]["SnapshotCharacter"];

const ROLE_ORDER: Record<string, number> = {
  fleet_commander: 0,
  wing_commander: 1,
  squad_commander: 2,
  squad_member: 3,
};

const ROLE_LABEL: Record<string, string> = {
  fleet_commander: "Fleet Commander",
  wing_commander: "Wing Commander",
  squad_commander: "Squad Commander",
  squad_member: "Member",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
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
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      placeholder={placeholder}
    />
  );
}

const columnHelper = createColumnHelper<SnapChar>();

const columns = [
  columnHelper.accessor((r) => r.character.character_name, {
    id: "character",
    header: "Character",
    cell: ({ row }) => (
      <div className="d-flex align-items-center gap-2">
        <img
          src={`https://images.evetech.net/characters/${row.original.character.character_id}/portrait?size=32`}
          alt={row.original.character.character_name}
          width={32}
          height={32}
        />
        <span>{row.original.character.character_name}</span>
      </div>
    ),
  }),
  columnHelper.accessor((r) => r.main?.character_name ?? "", {
    id: "main",
    header: "Main",
    cell: ({ row }) =>
      row.original.main ? (
        <span>
          {row.original.main.character_name}
          {row.original.main.corporation_ticker && (
            <span className="text-muted ms-1">({row.original.main.corporation_ticker})</span>
          )}
        </span>
      ) : (
        <span className="badge bg-danger">No Main</span>
      ),
  }),
  columnHelper.accessor((r) => r.ship.name, {
    id: "ship",
    header: "Ship",
    cell: ({ row }) => (
      <div className="d-flex align-items-center gap-2">
        <img
          src={`https://images.evetech.net/types/${row.original.ship.id}/icon?size=32`}
          alt={row.original.ship.name}
          width={32}
          height={32}
        />
        <span>{row.original.ship.name}</span>
      </div>
    ),
  }),
  columnHelper.accessor("role", {
    header: "Role",
    cell: ({ getValue }) => ROLE_LABEL[getValue()] ?? getValue(),
    sortingFn: (a, b) =>
      (ROLE_ORDER[a.original.role] ?? 99) - (ROLE_ORDER[b.original.role] ?? 99),
  }),
  columnHelper.accessor((r) => r.system.name, {
    id: "system",
    header: "System",
  }),
  columnHelper.accessor((r) => r.distance ?? -2, {
    id: "distance",
    header: "Distance to FC",
    cell: ({ getValue }) => {
      const d = getValue();
      if (d < 0) return <span className="text-muted">—</span>;
      return <span>{d}j</span>;
    },
    sortingFn: "basic",
  }),
];

// D3 Spectral 10 palette
const SPECTRAL = [
  "#9e0142", "#d53e4f", "#f46d43", "#fdae61", "#fee08b",
  "#e6f598", "#abdda4", "#66c2a5", "#3288bd", "#5e4fa2",
];

const formatTime = (ms: number) =>
  new Date(ms).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const TOOLTIP_LIMIT = 10;

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const visible = sorted.slice(0, TOOLTIP_LIMIT);
  const hidden = sorted.length - visible.length;
  return (
    <div style={{ background: "rgba(0,0,0,0.8)", border: "none", borderRadius: 4, color: "#fff", padding: "8px 12px", fontSize: 12 }}>
      <p style={{ color: "#ccc", marginBottom: 4 }}>{formatTime(label as number)}</p>
      {visible.map((entry) => (
        <p key={entry.name} style={{ color: entry.color, margin: "2px 0" }}>
          {entry.name}: {entry.value}
        </p>
      ))}
      {hidden > 0 && <p style={{ color: "#aaa", margin: "4px 0 0" }}>+{hidden} more</p>}
    </div>
  );
}

function TimelineChart({ data, yLabel, title }: { data: FleetStreamData; yLabel: string; title: string }) {
  const chartData = data.data.map((point, i) => ({
    ...point,
    time: new Date(data.times[i]).getTime(),
  }));

  return (
    <>
      <p className="mb-1 text-muted small fw-semibold text-uppercase text-center">{title}</p>
      <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.15} />
        <XAxis
          dataKey="time"
          scale="time"
          type="number"
          domain={["dataMin", "dataMax"]}
          tickFormatter={formatTime}
          stroke="currentColor"
          tick={{ fill: "currentColor", fontSize: 12 }}
        />
        <YAxis
          stroke="currentColor"
          tick={{ fill: "currentColor", fontSize: 12 }}
          label={{ value: yLabel, angle: -90, position: "insideLeft", fill: "currentColor", fontSize: 12 }}
        />
        <Tooltip content={<ChartTooltip />} wrapperStyle={{ zIndex: 1000 }} />
        {data.keys.map((key, i) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stackId="1"
            stroke={SPECTRAL[i % SPECTRAL.length]}
            fill={SPECTRAL[i % SPECTRAL.length]}
            fillOpacity={0.85}
            strokeWidth={0}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
    </>
  );
}

function FleetShipChart({ fleetId, refetchInterval }: { fleetId: number; refetchInterval: number | false }) {
  const { data, isPending, error } = useQuery({
    queryKey: ["getFleetStream", fleetId],
    queryFn: () => getFleetStream(fleetId),
    refetchInterval,
  });
  if (isPending) return <Spinner animation="border" className="m-3" />;
  if (error) return <p className="text-danger m-3">Failed to load ship timeline.</p>;
  if (!data || data.data.length === 0) return <p className="text-muted m-3">No ship data.</p>;
  return <TimelineChart data={data} yLabel="Ships" title="Ship Composition" />;
}

function FleetSystemChart({ fleetId, refetchInterval }: { fleetId: number; refetchInterval: number | false }) {
  const { data, isPending, error } = useQuery({
    queryKey: ["getFleetSystemStream", fleetId],
    queryFn: () => getFleetSystemStream(fleetId),
    refetchInterval,
  });
  if (isPending) return <Spinner animation="border" className="m-3" />;
  if (error) return <p className="text-danger m-3">Failed to load system timeline.</p>;
  if (!data || data.data.length === 0) return <p className="text-muted m-3">No system data.</p>;
  return <TimelineChart data={data} yLabel="Members" title="Members by System" />;
}

const FleetSnapshot = () => {
  const fleetId = useFleetId();
  const { pathname } = useLocation();
  const isActive = pathname.includes("/active/");
  const [sorting, setSorting] = useState<SortingState>([{ id: "role", desc: false }]);
  const [globalFilter, setGlobalFilter] = useState("");

  const { data, isPending, error } = useQuery({
    queryKey: ["getFleetSnapshot", fleetId],
    queryFn: () => getFleetSnapshot(fleetId),
    refetchInterval: isActive ? 30_000 : false,
  });

  const table = useReactTable({
    data: data?.snapshot ?? [],
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const visibleCount = table.getRowModel().rows.length;
  const totalCount = data?.snapshot.length ?? 0;

  return (
    <>
      <div className="mx-1 mt-1">
        <FleetShipChart fleetId={fleetId} refetchInterval={isActive ? 30_000 : false} />
      </div>
      <div className="mx-1 mt-1">
        <FleetSystemChart fleetId={fleetId} refetchInterval={isActive ? 30_000 : false} />
      </div>

      <Card className="m-1">
        <Card.Header className="d-flex align-items-center gap-3">
          <span className="fw-semibold me-auto">Fleet Snapshot</span>
          {data && (
            <span className="text-muted small">
              {visibleCount === totalCount
                ? `${totalCount} members`
                : `${visibleCount} of ${totalCount}`}
              {" · taken "}
              {formatDate(data.time)}
            </span>
          )}
          {data && (
            <InputGroup size="sm" style={{ width: "220px" }}>
              <InputGroup.Text>
                <i className="fas fa-search" />
              </InputGroup.Text>
              <DebouncedInput
                value={globalFilter}
                onChange={setGlobalFilter}
                placeholder="Search members…"
              />
            </InputGroup>
          )}
        </Card.Header>
        <Card.Body className="p-0">
          {isPending && <Spinner animation="border" className="m-3" />}
          {error && <p className="text-danger m-3">Failed to load snapshot.</p>}
          {data && (
            <Table striped hover className="mb-0">
              <thead>
                <tr>
                  {table.getHeaderGroups()[0].headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ cursor: "pointer", userSelect: "none" }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === "asc" && " ↑"}
                      {header.column.getIsSorted() === "desc" && " ↓"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </>
  );
};

export default FleetSnapshot;
