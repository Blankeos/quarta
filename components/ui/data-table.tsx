import { For, JSX, VoidProps } from "solid-js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";

import { ColumnDef, createSolidTable, flexRender, getCoreRowModel } from "@tanstack/solid-table";

type DataTableProps<TData> = {
  columns: ColumnDef<TData>[];
  data: TData[];
  caption?: JSX.Element;
};

export default function DataTable<TData>(props: VoidProps<DataTableProps<TData>>) {
  const table = createSolidTable({
    // eslint-disable-next-line solid/reactivity
    columns: props.columns,
    get data() {
      return props.data;
    },
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Table>
      {/* <TableCaption>{props.caption}</TableCaption> */}
      <TableHeader class="bg-background sticky top-0">
        <For each={table.getHeaderGroups()}>
          {(headerGroup) => (
            <TableRow>
              <For each={headerGroup.headers}>
                {(header) => (
                  <TableHead>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                )}
              </For>
            </TableRow>
          )}
        </For>
      </TableHeader>
      <TableBody class="">
        <For each={table.getRowModel().rows}>
          {(row) => (
            <tr class="hover:bg-muted/50 transition-colors">
              <For each={row.getVisibleCells()}>
                {(cell) => (
                  <TableCell>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                )}
              </For>
            </tr>
          )}
        </For>
      </TableBody>
      {/* <Show when={table.getFooterGroups().length > 0}>
        <TableFooter>
          <For each={table.getFooterGroups()}>
            {(footerGroup) => (
              <TableRow>
                <For each={footerGroup.headers}>
                  {(header) => (
                    <td>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.footer, header.getContext())}
                    </td>
                  )}
                </For>
              </TableRow>
            )}
          </For>
        </TableFooter>
      </Show> */}
    </Table>
  );
}
