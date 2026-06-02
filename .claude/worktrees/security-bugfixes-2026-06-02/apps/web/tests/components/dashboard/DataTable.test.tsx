import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DataTable } from "@/components/dashboard/DataTable";

interface TestRow {
  id: number;
  name: string;
  status: string;
}

const columns = [
  { header: "ID", accessor: "id" },
  { header: "Name", accessor: "name" },
  { header: "Status", accessor: "status" },
];

const data: TestRow[] = [
  { id: 1, name: "Alice", status: "active" },
  { id: 2, name: "Bob", status: "inactive" },
];

describe("DataTable", () => {
  it("renders column headers", () => {
    render(<DataTable columns={columns} data={data} />);
    expect(screen.getByText("ID")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("renders row data", () => {
    render(<DataTable columns={columns} data={data} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByText("inactive")).toBeInTheDocument();
  });

  it("shows empty state when no data", () => {
    render(<DataTable columns={columns} data={[]} />);
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("calls onRowClick when row is clicked", () => {
    const handleClick = vi.fn();
    render(
      <DataTable columns={columns} data={data} onRowClick={handleClick} />,
    );
    const row = screen.getByText("Alice").closest("tr");
    row?.click();
    expect(handleClick).toHaveBeenCalledWith(data[0]);
  });

  it("sorts numerically ascending", () => {
    render(<DataTable columns={columns} data={data} />);
    const idHeader = screen.getByText("ID");
    idHeader.click();
    const rows = screen.getAllByRole("row");
    const firstDataRow = rows[1];
    expect(firstDataRow).toHaveTextContent("1");
  });

  it("sorts alphabetically ascending", () => {
    render(<DataTable columns={columns} data={data} />);
    const nameHeader = screen.getByText("Name");
    nameHeader.click();
    const rows = screen.getAllByRole("row");
    const firstDataRow = rows[1];
    expect(firstDataRow).toHaveTextContent("Alice");
  });

  it("renders custom cell content via render function", () => {
    const customColumns = [
      {
        header: "Name",
        accessor: "name",
        render: (value: unknown) => (
          <span data-testid="custom">{`User: ${value}`}</span>
        ),
      },
    ];
    render(<DataTable columns={customColumns} data={data} />);
    expect(screen.getAllByTestId("custom")).toHaveLength(2);
    expect(screen.getByText("User: Alice")).toBeInTheDocument();
  });
});
