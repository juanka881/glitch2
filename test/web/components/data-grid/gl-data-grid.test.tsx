import { render, screen } from '@solidjs/testing-library';
import { expect, test } from 'vitest';
import { GlDataGrid } from '#src/web/components/gl-data-grid';

test('GlDataGrid renders', async () => {
	render(() => (
		<GlDataGrid
			columns={[
				{
					key: 'name',
					label: 'name',
					render(row: { id: string; name: string }) {
						return row.name;
					},
				},
			]}
			getRowKey={(row) => row.id}
			rows={[{ id: '1', name: 'alpha' }]}
		/>
	));
	
	expect(screen.getByText('alpha')).toBeDefined();
});
