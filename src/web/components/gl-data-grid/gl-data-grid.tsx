import { For, type JSX } from 'solid-js';
import '#src/web/components/gl-data-grid/gl-data-grid.css';

export interface GlDataGridColumn<T> {
	key: string;
	label: string;
	render(row: T): JSX.Element;
}

export interface GlDataGridProps<T> {
	columns: GlDataGridColumn<T>[];
	rows: T[];
	getRowKey(row: T): string;
}

export function GlDataGrid<T>(props: GlDataGridProps<T>): JSX.Element {
	return (
		<div class="gl-data-grid">
			<table class="gl-data-grid_table">
				<thead class="gl-data-grid_head">
					<tr class="gl-data-grid_row">
						<For each={props.columns}>{(column) => <th class="gl-data-grid_cell type-header">{column.label}</th>}</For>
					</tr>
				</thead>
				<tbody class="gl-data-grid_body">
					<For each={props.rows}>
						{(row) => (
							<tr class="gl-data-grid_row" data-key={props.getRowKey(row)}>
								<For each={props.columns}>{(column) => <td class="gl-data-grid_cell">{column.render(row)}</td>}</For>
							</tr>
						)}
					</For>
				</tbody>
			</table>
		</div>
	);
}
